---
title: 능동적 서피싱
description: 도구를 호출할 때 관련 기억을 자동으로 제시하고, 피드백에 따라 기준을 조정하는 방법.
---

보통은 에이전트가 직접 검색을 요청해야 관련 정보를 받습니다(RAG 방식). memtomem-stm의 **능동적 서피싱**은 그럴 필요 없이, 프록시를 거치는 MCP 호출을 살펴 지금 하는 작업의 맥락을 파악하고, 관련 기억을 LTM에서 찾아 **자동으로** 응답에 붙여 줍니다. Claude Code의 기본 내장 도구에도 `mms hook`으로 서피싱을 확장할 수 있습니다(`PostToolUse` 이벤트에 `additionalContext` 형태로 덧붙임).

## 동작 원리

에이전트가 MCP 도구를 호출하면 STM 프록시가 다음 순서로 처리합니다.

```
도구 호출 → 맥락 추출 → LTM 검색 → 관련성 검사 → 응답에 추가
```

에이전트 코드를 바꿀 필요는 없지만, 호출이 STM이나 지원되는 클라이언트 훅을 거쳐야 합니다. 연결한 MCP 서버를 직접 호출하면 STM을 우회합니다. Claude Code의 기본 내장 도구에는 `mms hook`을 `PostToolUse` 훅으로 등록합니다. 기본적으로 로컬 데몬이 LTM 연결을 미리 열어 두므로, 훅을 반복해서 호출해도 매번 LTM을 새로 시작하지 않습니다.

| 호출 경로 | 관련 기억을 붙이는 방식 |
|---|---|
| `memtomem-stm`을 통해 라우팅된 MCP 서버 | 프록시 응답에 주입 |
| 지원되는 Claude Code `PostToolUse` 이벤트 | `mms hook` → `additionalContext` |
| 연결한 MCP 서버 직접 호출 | 관련 기억을 붙이지 않음 |
| 위 경로 밖에서 각 제공자가 관리하는 기억 | 자동으로 읽거나 색인하지 않음 |

<a id="5단계-컨텍스트-추출"></a>

## 5단계 맥락 추출

STM이 LTM에서 기억을 찾으려면 먼저 검색어가 필요합니다. 한 가지 신호에만 의존하지 않고 서로 다른 출처를 순서대로 확인합니다. 먼저 쓸 만한 검색어를 만든 단계의 결과를 채택합니다. `_context_query` 인자가 있으면 그 값을 직접 사용합니다. `fs__read_file(path=...)`처럼 단순한 호출에서도 검색어를 만들 수 있습니다.

| 우선순위 | 추출 방법 | 설명 |
|---|---|---|
| 1 | 도구별 검색어 템플릿 | 도구 이름에 연결된 미리 정의된 검색어 패턴 |
| 2 | `_context_query` 인자 | 에이전트가 직접 전달한 검색어 |
| 3 | 경로 인자 | `path` / `file` / `filepath` / `file_path` / `filename` 키 전용 토큰화 (구분자 분리, 확장자 제거) |
| 4 | 시맨틱 키 | `query` / `search` / `url` / `description` 등 인자 값의 키워드 조합 |
| 5 | 도구명 | 마지막 수단으로 도구 이름 자체를 검색어로 사용 |

프록시는 `_context_query`를 받을 수 있습니다. 다만 연결한 도구의 스키마에는 `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY=true`일 때만 이 인자를 표시합니다. 기본값은 `false`이므로 일반 에이전트가 이 내부용 힌트를 만들 필요는 없습니다.

<a id="관련성-게이팅"></a>

## 관련성 검사

검색어를 만들고 나면, 찾은 기억이 실제로 유용한지 다시 확인합니다. 맥락 추출은 [앞 단계](#5단계-맥락-추출)에서 이미 끝났습니다.

1. **LTM 검색** — 하이브리드 검색으로 관련 기억 후보 검색
2. **점수 필터링** — `scale_gated_min_score=true`(기본값)이면 서로 다른 점수 범위를 같은 기준으로 맞춘 뒤 `min_score` 미만의 결과를 제거합니다. 재순위는 `MEMTOMEM_STM_SURFACING__RERANK` 또는 LTM 설정으로 켜지 않는 한 비활성화됩니다.
3. **중복 제거** — 세션 내 + 교차 세션(7일) 중복 방지

## 주입 모드

찾은 기억을 응답에 넣는 위치는 `MEMTOMEM_STM_SURFACING__INJECTION_MODE`로 정합니다. `progressive` 전달은 큰 응답을 여러 조각으로 나누며, 이후 `stm_proxy_read_more` 호출은 다음 내용을 가리키는 `offset`에 의존합니다.

| 모드 | 동작 |
|---|---|
| `append` (기본값) | 기억을 응답 아래에 덧붙임. `progressive`의 `offset`을 유지하며 이어 읽을 때도 동작 |
| `prepend` | 기억을 응답 앞에 붙임. `stm_proxy_read_more`의 `offset`을 바꾸므로 `progressive`에서는 건너뜀 |
| `section` | 기억을 별도 섹션에 배치. `progressive`로 이어 읽을 때도 관련 기억 검색을 실행 |

## 모델 인식 기본값

에이전트의 컨텍스트 크기에 맞춰 자동으로 조정합니다.

| 컨텍스트 윈도우 | 압축 비율 | 주입 크기 | 검색 결과 수 |
|---|---|---|---|
| ≤ 32K | 높은 압축 | 소형 | 적음 |
| 32K ~ 200K | 기본 압축 | 중형 | 기본 |
| > 200K | 낮은 압축 | 대형 | 많음 |

## 피드백 루프

자동으로 제시한 각 기억에는 제공자마다 기준이 다른 원점수 대신 `[weak]` / `[related]` / `[strong]` 등급을 표시합니다. 점수 범위를 맞춘 뒤 현재 임계 구간에 따라 등급을 정합니다. 각 기억에는 고유한 `memory_id`도 붙으므로, 에이전트는 전체 결과나 개별 기억을 따로 평가할 수 있습니다.

- 이벤트 전체: `stm_surfacing_feedback(surfacing_id=..., rating="helpful")`
- 개별 기억: `stm_surfacing_feedback(surfacing_id=..., ratings=[{"memory_id": ..., "rating": "not_relevant"}])`

에이전트가 관련 기억의 품질을 평가하면 자동 조정 기능이 도구별 관련성 기준을 계속 개선합니다.

- **helpful** → 해당 도구의 `min_score` 유지 또는 하향
- **partially_helpful** → 중립 피드백으로 집계
- **not_relevant** → `min_score` 상향 (더 엄격한 필터링)
- **already_known** → 부정적 피드백으로 집계하고 로컬 우선순위 조정과 중복 제거에 반영

개별 기억에 `not_relevant` 또는 `already_known`을 부여하면 다음에 같은 캐시 응답을 사용할 때 그 기억만 제외합니다. 전체 결과를 버리지는 않습니다.

<a id="업스트림-단위-서피싱-스코핑"></a>

## 연결 서버별 적용 범위

관련 기억 자동 제시는 기본적으로 연결한 모든 서버에 적용됩니다. 특정 서버만 계속 끄거나 다시 켤 수도 있습니다. LTM 기억과 관련될 일이 없어 검색 시간만 늘어나는 외부 서버나, 요청 내용을 LTM 검색어로 보내면 안 되는 민감한 서버에 유용합니다.

```bash
mms surfacing <server>          # 현재 상태 확인
mms surfacing <server> off      # 해당 서버의 관련 기억 자동 제시 비활성화
mms surfacing <server> on       # 다시 활성화
```

이 값은 각 서버의 `surfacing_enabled` 플래그(기본값 `true`)로 공용 프록시 설정(`stm_proxy.json`)에 저장됩니다. 따라서 같은 `mms` 프록시를 쓰는 모든 MCP 클라이언트가 동일한 범위를 공유합니다. 실행 중인 프록시에도 재시작 없이 반영되며 현재 상태는 `mms list`의 SURFACING 열에 표시됩니다. 비활성화한 서버의 호출은 LTM을 검색하기 전에 건너뛰고, `stm_surfacing_stats`에서 정상 건너뜀(`upstream_disabled`)으로 집계합니다.

도구별로 제외하거나 여러 서버에 패턴을 적용하려면 `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS`를 사용합니다. 값은 `server__tool` 패턴으로 비교합니다.

## 안전 장치

관련 기억 자동 제시에는 안정성과 정보 보호를 위한 다음 안전장치가 있습니다.

- **회로 차단기** — 반복 실패 시 잠시 호출을 멈춰 장애가 번지는 것을 막는 장치입니다(3상태: closed / open / half-open). `circuit_max_failures`(기본 `3`)회 연속 실패하면 open 상태가 되고, `circuit_reset_seconds`(기본 `60s`) 경과 후 half-open으로 전환
- **서피싱 시간 제한** — 호출당 최대 `3s`
- **호출 빈도 제한** — 모든 도구를 합해 분당 최대 `15`회
- **쓰기 도구 스킵** — 파일 쓰기, 삭제 등 부수효과가 있는 도구에서는 서피싱 비활성화
- **반복 검색 방지** — 최근 5초 안에 처리한 검색어와 거의 같으면(Jaccard 유사도 `> 0.95`) 관련 기억 검색을 건너뜀
- **교차 세션 중복 제거** — 기본 TTL `604800s` (7일), `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` 로 조정
- **주입 크기 상한** — 주입당 기본 `3000 chars`
- **로컬 피드백에 따른 제외** — 같은 기억이 서로 다른 결과에서 `not_relevant` 또는 `already_known`으로 반복 평가되면 `feedback_demotion_negative_threshold`(기본 `3`)에 도달한 뒤부터 응답에 넣기 전에 제외
- **검색어 보호** — `query_retention_days`가 지나면 저장한 원문 검색어를 비움(기본 30일). `persist_query_text=false`이면 원문 대신 `sha256:` 해시를 저장

<a id="ltm-전송"></a>

## LTM 연결

STM은 LTM과 MCP 프로토콜로 통신합니다. 기본값은 stdio로 `memtomem-server`를 실행하는 방식이며, 장기 실행 LTM 서비스를 `sse` 또는 `streamable_http`로 연결할 수도 있습니다:

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM 응답은 관련 기억을 고르는 데만 사용하며 프록시의 압축·캐시 처리를 거치지 않습니다.

`trace_id`는 관련 기억 검색과 `progressive` 전달에 함께 포함됩니다. 따라서 이어 읽은 내용도 Langfuse나 OpenTelemetry 계열 추적 도구에서 첫 번째 조각과 자동으로 묶입니다.
