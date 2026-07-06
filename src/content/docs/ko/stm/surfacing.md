---
title: 능동적 서피싱
description: 도구 호출 단위 실시간 서피싱, 관련성 게이팅, 피드백 기반 자동 튜닝.
---

보통은 에이전트가 직접 검색을 요청해야 관련 정보를 받습니다(RAG 방식). memtomem-stm의 **능동적 서피싱**은 그럴 필요 없이, 프록시를 거치는 MCP 호출을 살펴 지금 하는 작업의 맥락을 파악하고, 관련 기억을 LTM에서 찾아 **자동으로** 응답에 붙여 줍니다. Claude Code의 기본 내장 도구에도 `mms hook`으로 서피싱을 확장할 수 있습니다(`PostToolUse` 이벤트에 `additionalContext` 형태로 덧붙임).

## 동작 원리

에이전트가 MCP 도구를 호출하면, STM 프록시가 다음 파이프라인을 실행합니다:

```
도구 호출 → 컨텍스트 추출 → LTM 검색 → 관련성 게이팅 → 응답에 주입
```

에이전트 코드를 고칠 필요 없이, STM 프록시를 거치는 것만으로 MCP 통신에 기억이 자동으로 실립니다. Claude Code 기본 내장 도구에는 `mms hook`을 호스트 훅으로 등록합니다. 기본적으로 항상 준비된 로컬 데몬(warm local daemon)을 사용하므로, 훅을 반복 호출해도 LTM을 처음부터 띄우는 비용(cold start)이 들지 않습니다.

## 5단계 컨텍스트 추출

STM이 LTM에 기억을 조회하려면 먼저 검색 쿼리가 필요합니다. 단일 신호에 의존하지 않고, 서로 다른 소스를 시도하는 5단계 파이프라인을 순차 실행합니다. 가장 먼저 사용 가능한 쿼리를 생성한 단계가 채택됩니다. `_context_query` 인자가 명시된 호출은 해당 값을 직접 사용하며, `fs__read_file(path=...)` 같은 단순 호출에서도 사용 가능한 검색 쿼리를 생성할 수 있습니다.

| 우선순위 | 추출 방법 | 설명 |
|---|---|---|
| 1 | 도구별 쿼리 템플릿 | 도구 이름에 매핑된 미리 정의된 쿼리 패턴 |
| 2 | `_context_query` 인자 | 에이전트가 명시적으로 전달한 검색 쿼리 |
| 3 | 경로 인자 | `path` / `file` / `filepath` / `file_path` / `filename` 키 전용 토큰화 (구분자 분리, 확장자 제거) |
| 4 | 시맨틱 키 | `query` / `search` / `url` / `description` 등 인자 값의 키워드 조합 |
| 5 | 도구명 | 최후 수단 — 도구 이름 자체를 쿼리로 사용 |

## 관련성 게이팅

쿼리가 추출되면, 서피싱된 기억이 실제로 유용한지 추가로 필터링합니다 (컨텍스트 추출은 [위 단계](#5단계-컨텍스트-추출)에서 이미 수행됩니다):

1. **LTM 검색** — 하이브리드 검색으로 관련 기억 후보 검색
2. **점수 필터링** — `min_score` 임계값 이하의 결과 제거
3. **중복 제거** — 세션 내 + 교차 세션(7일) 중복 방지

## 주입 모드

서피싱된 기억이 응답에 엮이는 방식은 `MEMTOMEM_STM_SURFACING__INJECTION_MODE` 로 제어합니다. progressive delivery는 큰 응답을 여러 청크로 나눠 전달하는 방식으로, 후속 `stm_proxy_read_more` 호출이 이어지는 offset에 의존합니다:

| 모드 | 동작 |
|---|---|
| `append` (기본값) | 기억을 응답 아래에 덧붙임. progressive delivery offset을 보존하며 이어지는 읽기 경로에서도 동작. |
| `prepend` | 기억을 헤더로 앞에 붙임. `stm_proxy_read_more` offset을 밀어버리므로 progressive delivery에서는 스킵. |
| `section` | 기억을 전용 섹션에 배치. progressive 연속 호출에서도 서피싱을 트리거. |

## 모델 인식 기본값

에이전트의 컨텍스트 윈도우 크기를 인식하여 자동 스케일링합니다:

| 컨텍스트 윈도우 | 압축 비율 | 주입 크기 | 검색 결과 수 |
|---|---|---|---|
| ≤ 32K | 높은 압축 | 소형 | 적음 |
| 32K ~ 200K | 기본 압축 | 중형 | 기본 |
| > 200K | 낮은 압축 | 대형 | 많음 |

## 피드백 루프

서피싱된 블록의 각 기억은 원시 점수 대신 관련도 버킷 — `[weak]` / `[related]` / `[strong]` — 으로 표시되며, 활성 `min_score` 임계값과 1.0 사이 구간에 따라 산출됩니다. 각 기억은 고유한 `memory_id`(backtick 토큰)를 함께 노출하므로, 에이전트는 전체 이벤트 단위로 평가하거나 개별 기억을 따로 평가할 수 있습니다:

- 이벤트 전체: `stm_surfacing_feedback(surfacing_id=..., rating="helpful")`
- 개별 기억: `stm_surfacing_feedback(surfacing_id=..., ratings=[{"memory_id": ..., "rating": "not_relevant"}])`

에이전트가 서피싱 품질을 평가하면, 자동 튜너가 도구별 관련성 임계값을 지속적으로 최적화합니다:

- **helpful** → 해당 도구의 `min_score` 유지 또는 하향
- **partially_helpful** → 중립 피드백으로 집계
- **not_relevant** → `min_score` 상향 (더 엄격한 필터링)
- **already_known** → negative feedback으로 집계하고 로컬 demotion / dedup 동작에 반영

개별 기억에 `not_relevant` 또는 `already_known`을 부여하면, 다음 캐시 히트에서 해당 기억만 무효화되어 이벤트 전체가 아닌 정확히 그 기억들만 주입에서 제외됩니다.

## 업스트림 단위 서피싱 스코핑

서피싱은 기본적으로 모든 업스트림에 적용되지만, 특정 업스트림에 대해서만 영구적으로 끄거나 켤 수 있습니다. LTM 기억과 결코 매칭되지 않는 서드파티 서버(순수한 지연 낭비)나, 요청 맥락이 LTM 쿼리로 변환되어서는 안 되는 민감한 업스트림에 유용합니다:

```bash
mms surfacing <server>          # 현재 상태 확인
mms surfacing <server> off      # 해당 업스트림 서피싱 비활성화
mms surfacing <server> on       # 다시 활성화
```

이 설정은 각 업스트림의 `surfacing_enabled` 플래그(기본값 `true`)로 공유 프록시 설정(`stm_proxy.json`)에 기록되므로, 이 `mms`를 프록시로 사용하는 모든 MCP 클라이언트가 동일한 스코프를 보게 됩니다. 실행 중인 프록시는 재시작 없이 hot-reload하며, 유효 상태는 `mms list`의 SURFACING 컬럼에 표시됩니다. 비활성화된 업스트림의 호출은 LTM 검색 이전에 스킵되며 `stm_surfacing_stats`에서 정상 스킵(`upstream_disabled`)으로 집계됩니다.

도구 단위 또는 교차 서버 glob 스코프가 필요하면 `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS`(`server__tool` 패턴 매칭)를 사용합니다.

## 안전 장치

서피싱은 회복력과 프라이버시를 위해 다음과 같은 안전 장치를 갖추고 동작합니다:

- **회로 차단기** — 반복 실패 시 잠시 호출을 멈춰 장애가 번지는 것을 막는 장치입니다(3상태: closed / open / half-open). `circuit_max_failures`(기본 `3`)회 연속 실패하면 open 상태가 되고, `circuit_reset_seconds`(기본 `60s`) 경과 후 half-open으로 전환
- **서피싱 타임아웃** — 호출당 `3s` 하드 제한
- **레이트 리밋** — 전체 도구 합산 `15 calls / minute` 상한
- **쓰기 도구 스킵** — 파일 쓰기, 삭제 등 부수효과가 있는 도구에서는 서피싱 비활성화
- **쿼리 쿨다운** — 방금(최근 5초 내) 처리한 쿼리와 거의 같으면(Jaccard 유사도 `> 0.95`) 서피싱을 건너뜀
- **교차 세션 중복 제거** — 기본 TTL `604800s` (7일), `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` 로 조정
- **주입 크기 상한** — 주입당 기본 `3000 chars`
- **로컬 피드백 demotion** — 같은 기억이 서로 다른 이벤트에서 `not_relevant` 또는 `already_known`으로 반복 평가되면 `feedback_demotion_negative_threshold`(기본 `3`) 이후 주입 전에 필터링
- **쿼리 텍스트 프라이버시** — `query_retention_days`는 기본 30일 이후 저장된 원문 쿼리를 비우고, `persist_query_text=false`는 원문 대신 `sha256:` digest를 저장

## LTM 전송

STM은 LTM과 MCP 프로토콜로 통신합니다. 기본값은 stdio로 `memtomem-server`를 실행하는 방식이며, 장기 실행 LTM 서비스를 `sse` 또는 `streamable_http`로 연결할 수도 있습니다:

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM 응답은 서피싱 엔진이 소비하며, 프록시 압축/캐시 파이프라인을 거치지 않습니다.

`trace_id`가 서피싱과 progressive delivery 경로에 함께 실려서, 이어지는 읽기가 Langfuse(또는 OpenTelemetry 계열 추적 도구)에서 처음 청크와 자동으로 묶입니다.
