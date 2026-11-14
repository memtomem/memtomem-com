---
title: 능동적 서피싱
description: 도구 호출마다 관련 기억을 실시간으로 자동 제시(서피싱)하고, 관련성 필터링과 피드백 기반 자동 조정을 수행하는 방법을 설명합니다.
---

일반적인 RAG는 에이전트가 명시적으로 검색을 요청할 때만 관련 정보를 반환합니다. `memtomem-stm`의 능동적 **서피싱**(관련 기억 자동 제시)은 별도의 검색 요청 없이도 프록시를 거치는 MCP 호출에서 현재 작업 맥락을 추론해, LTM에서 일치하는 기억을 찾아 응답에 **자동으로** 주입합니다. `mms hook`을 사용하면 지원되는 Claude Code 내장 도구의 `PostToolUse` 이벤트에도 `additionalContext` 형태로 관련 기억 주입을 확장할 수 있습니다.

## 동작 원리

에이전트가 MCP 도구를 호출하면 STM 프록시는 다음 파이프라인을 실행합니다.

```
도구 호출 → 맥락 추출 → LTM 검색 → 관련성 검사 → 응답에 추가
```

에이전트 코드를 수정할 필요는 없지만, 호출이 STM 프록시나 지원되는 호스트 훅(hook)을 거쳐야 합니다. 업스트림 MCP 서버를 직접 호출하면 STM을 우회합니다. Claude Code 내장 도구에는 `mms hook`을 호스트 훅으로 등록하세요. 기본적으로 로컬 데몬이 LTM 연결을 미리 열어 두므로, 훅 호출이 반복되어도 매번 LTM 초기 구동 비용이 들지 않습니다.

| 호출 경로 | 제시 경로 |
|---|---|
| `memtomem-stm`을 거치는 MCP 서버 | 프록시 응답에 주입 |
| 지원되는 Claude Code `PostToolUse` 이벤트 | `mms hook` → `additionalContext` |
| 업스트림 MCP 서버 직접 호출 | 자동 제시되지 않음 |
| 위 경로 밖에서 각 제공자가 관리하는 기억 | 자동으로 읽거나 색인하지 않음 |

<a id="5단계-컨텍스트-추출"></a>

## 5단계 맥락 추출

STM이 LTM에서 기억을 조회하려면 먼저 검색어가 필요합니다. 단일 신호에만 의존하지 않고 다섯 단계를 순서대로 시도하며, 유효한 검색어를 가장 먼저 만든 단계의 결과를 채택합니다. 따라서 명시적인 `_context_query` 인자가 있는 호출은 그 값을 바로 사용하고, `fs__read_file(path=...)`처럼 경로만 있는 호출에서도 검색어를 추출할 수 있습니다.

| 우선순위 | 추출 방법 | 설명 |
|---|---|---|
| 1 | 도구별 검색어 템플릿 | 도구 이름에 매핑된 사전 정의 검색어 패턴 |
| 2 | `_context_query` 인자 | 에이전트가 명시적으로 전달한 검색어 |
| 3 | 경로 인자 | `path` / `file` / `filepath` / `file_path` / `filename` 키 전용 토큰화(경로 구분자 분리, 확장자 제거) |
| 4 | 시맨틱 키 | `query` / `search` / `url` / `description` 등 인자 값의 키워드 조합 |
| 5 | 도구 이름 | 프록시 호출의 마지막 수단 — 도구 이름 자체를 검색어로 사용 |

0.7.7부터 `mms hook`으로 들어오는 Claude Code 내장 도구 호출은 5단계를 건너뜁니다. 호출 인자(경로와 셸 명령)에서 검색어를 조합하며, 남은 토큰 수가 `min_query_tokens` 미만이면 기억 조회를 건너뜁니다. 단, 경로만 전달하는 기본 `Read` 호출은 `src/auth.py` 같은 2단계 경로에서도 관련 기억을 제시할 수 있도록 `max(1, min_query_tokens - 1)`개 토큰(기본값 `3`일 때 `2`개)만 요구합니다. 세부 규칙은 [업스트림 문서](https://github.com/memtomem/memtomem-stm/blob/v0.7.8/docs/surfacing.md#how-context-extraction-works)를 참고하세요.

프록시는 `_context_query` 인자를 항상 허용하지만, 업스트림 도구 스키마에는 `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY=true`일 때만 노출합니다. 기본값은 `false`이므로 일반 에이전트에 이 내부 힌트 생성을 요구하지 않습니다.

<a id="관련성-게이팅"></a>

## 관련성 검사

[앞 단계](#5단계-컨텍스트-추출)에서 검색어를 추출한 뒤에는 조회된 기억 후보를 다음 네 단계로 걸러 실제로 유용한 항목만 남깁니다.

1. **LTM 검색** — 하이브리드 검색으로 기억 후보를 조회합니다. 지연 시간을 줄이기 위해 서피싱은 기본적으로 Core에 재정렬(리랭킹) 단계를 건너뛰도록 요청합니다(`MEMTOMEM_STM_SURFACING__RERANK=false`). `true`는 Core에 설정된 리랭커 사용을 요청하고, `none`은 별도 요청 없이 Core 자체 설정을 따릅니다. 이 옵션은 호출별 리랭킹 지원을 알리는 Core에만 전달되며, 이전 버전 Core는 자체 설정을 따릅니다.
2. **점수 필터링** — RRF 점수 척도 기준인 `min_score` 미만의 결과를 제거합니다. `scale_gated_min_score=true`(기본값)일 때 Core가 반환한 `score_scale`이 리랭커 점수처럼 RRF가 아닌 알려진 척도이면 전역 또는 자동 조정된 `min_score`를 적용하지 않습니다. 척도가 다르면 RRF 임계값이 의미를 갖지 않기 때문이며, 이때도 반환 개수는 `max_results`로 제한됩니다. 도구별 `context_tools.<tool>.min_score`는 항상 적용되며, `score_scale`이 없거나 인식할 수 없는 값이면 필터를 유지합니다. 점수 값 자체를 재환산하지는 않습니다.
3. **네임스페이스 제외** — 검색 결과의 네임스페이스가 `exclude_namespaces` 패턴과 일치하면 제외합니다. Pinned Context(고정 컨텍스트)에는 영향을 주지 않습니다.
4. **중복 제거** — 세션 내 중복 및 교차 세션(7일) 중복을 방지합니다.

## 주입 모드

조회된 기억을 응답의 어디에 합칠지는 `MEMTOMEM_STM_SURFACING__INJECTION_MODE`로 제어합니다. 단계적 공개(`progressive` 전달)는 큰 응답을 여러 청크로 나누며, 후속 `stm_proxy_read_more` 호출이 이어지는 오프셋(`offset`)을 기준으로 삼습니다.

| 모드 | 동작 |
|---|---|
| `append` (기본값) | 기억을 응답 끝에 덧붙입니다. 단계적 공개 오프셋을 깨뜨리지 않으며 이어 읽기 경로에서도 동작합니다. |
| `prepend` | 기억을 응답 앞머리에 붙입니다. `stm_proxy_read_more` 오프셋이 밀리므로 기존(legacy) 단계적 공개에서는 건너뜁니다. |
| `section` | 기억을 전용 섹션에 배치하며, 단계적 공개의 후속 읽기에서도 관련 기억 제시를 실행합니다. |

실험 기능인 [구조화 전달](/ko/stm/compression/#structured-chunk-delivery)에서는 기억이 별도 필드(`stm.supplements.surfacing`)로 전달되고 응답 본문 텍스트는 바뀌지 않으므로 `prepend`를 포함한 모든 모드가 동작합니다.

## 모델 인식 기본값

에이전트의 컨텍스트 윈도우 크기에 맞춰 기본값을 자동으로 조정합니다.

| 컨텍스트 윈도우 | 압축 강도 | 주입 크기 | 결과 수 |
|---|---|---|---|
| ≤ 32K | 높은 압축 | 소형 | 적음 |
| 32K ~ 200K | 기본값 | 중형 | 기본값 |
| > 200K | 낮은 압축 | 대형 | 많음 |

## 피드백 루프

주입된 블록의 각 기억에는 제공자마다 척도가 다른 원점수 대신 관련도 구간(`[weak]` / `[related]` / `[strong]`)이 표시됩니다. 이 등급은 `[min_score, 상한]` 구간을 3등분해 결정합니다. `score_scale`이 `rrf`로 표시된 결과의 상한은 검색을 처리한 Core 세션의 `runtime_profile`에서 `sum(rrf_weights) / (rrf_k + 1)`로 계산합니다. 프로필이 없거나 유효하지 않거나 2경로(BM25 + dense) 결합이 아닌 경우, 또는 이전 버전 데몬이 이 표시를 생략한 경우에는 기본 기준값인 `2/61`(약 0.033)로 대체합니다. `score_scale` 표시가 없거나(compact 형식, 이전 Core) STM이 인식하지 못하는 레이블이면 `[min_score, 1.0]` 구간을 유지합니다. 리랭커 로짓(logit)처럼 RRF가 아닌 알려진 척도로 표시된 결과에는 유의미한 구간을 정할 수 없으므로 등급 레이블을 붙이지 않습니다. 또한 각 기억마다 고유한 `memory_id`(백틱 토큰)가 함께 노출되므로, 에이전트는 이벤트 전체를 한 번에 평가하거나 개별 기억을 하나씩 평가할 수 있습니다.

- 이벤트 전체 평가: `stm_surfacing_feedback(surfacing_id=..., rating="helpful")`
- 개별 기억 평가: `stm_surfacing_feedback(surfacing_id=..., ratings=[{"memory_id": ..., "rating": "not_relevant"}])`

에이전트가 제시된 기억의 품질을 평가하면 자동 조정기(auto-tuner)가 도구별 관련성 임계값을 지속적으로 최적화합니다.

- **helpful** → 해당 도구의 `min_score`를 유지하거나 낮춥니다.
- **partially_helpful** → 중립 근거로 집계합니다.
- **not_relevant** → `min_score`를 높여 더 엄격하게 필터링합니다.
- **already_known** → 부정 피드백으로 집계하고 로컬 강등(demotion) 및 중복 제거에 반영합니다.

임계값 상향 폭은 `min(auto_tune_score_ceiling, max(배치 기준값, min_score))`로 제한되므로, 직접 설정한 `min_score`가 배치 기준값보다 높더라도 깎이지 않고 그대로 유지됩니다. 배치 기준값은 Core가 점수를 전송하는 소수 자릿수에 맞춰 내림합니다.

- `rrf` 결과: `score_ceiling` 값(유효한 값이 없으면 `2/61`)을 소수점 아래 4자리로 내림합니다(`2/61` → `0.0327`).
- `score_scale`이 없거나 STM이 인식하지 못하는 레이블인 결과: `2/61`을 소수점 아래 2자리로 내림합니다(`0.03`).
- 조회된 LTM 기억이 없는 빈 배치이거나 Pinned Context만 있는 배치에서는 `min_score`를 변경하지 않으며, 인식된 비RRF 척도에는 별도 상한을 두지 않습니다.

이미 저장된 조정값 자체를 다시 쓰지는 않습니다. 상한보다 높게 조정되어 있던 도구는 다음 검색부터 상한 기준으로 필터링하되, `stm_admin(action="surfacing_stats")`에는 저장된 기존 값을 그대로 보여 줍니다. 이 규칙은 프록시와 `hook.record_feedback_events`가 켜진 데몬 모두에 적용됩니다.

개별 기억을 `not_relevant`나 `already_known`으로 평가하면 다음 캐시 적중 시 이벤트 전체를 버리지 않고 해당 기억만 주입 대상에서 제외합니다.

<a id="업스트림-단위-서피싱-스코핑"></a>

## 연결 서버별 적용 범위

서피싱은 기본적으로 모든 업스트림 MCP 서버에 적용되지만, 특정 서버에 대해서만 영구적으로 끄거나 다시 켤 수 있습니다. LTM 기억과 맞물릴 일이 없어 지연 시간만 늘리는 외부 서버나, 요청 맥락을 LTM 검색어로 넘기면 안 되는 민감한 업스트림 서버에 유용합니다.

```bash
mms surfacing <server>          # 현재 상태 확인
mms surfacing <server> off      # 이 업스트림의 서피싱 비활성화
mms surfacing <server> on       # 다시 활성화
```

이 설정은 공용 프록시 설정 파일(`stm_proxy.json`)에 업스트림별 `surfacing_enabled` 플래그(기본값 `true`)로 기록되므로, 같은 `mms`를 거치는 모든 MCP 클라이언트에 동일한 범위가 적용됩니다. 실행 중인 프록시는 재시작 없이 변경 사항을 즉시 반영하며, `mms list`의 SURFACING 열에서 현재 적용 상태를 확인할 수 있습니다. 비활성화된 업스트림의 호출은 LTM 검색 전에 건너뛰고 `stm_admin(action="surfacing_stats")`에 정상 건너뛰기(`upstream_disabled`)로 집계됩니다.

도구 단위로 세밀하게 제외하거나 여러 서버에 걸친 글롭(glob) 패턴을 지정하려면 `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS`(`server__tool` 패턴 매칭)를 설정하세요.

## 저장소·네임스페이스별 범위

0.7.7부터 `mms hook`으로 들어오는 Claude Code 내장 도구 호출은 호스트의 `cwd`가 속한 저장소로 검색 범위를 좁힙니다. `project_scope_from_cwd`(기본값 `true`)가 켜져 있고 고정된 네임스페이스가 없으면, STM은 전체 네임스페이스 대신 다음 네임스페이스만 검색합니다.

- 해당 저장소의 모든 Git 워크트리(worktree)와 `cwd` 자체에 대응하는 `claude:<slug>`
- `shared:<저장소 디렉터리 이름>`(이름에 `,` 또는 `*`가 포함되면 제외)
- `default`

이 범위 제한은 해당 워크트리 중 하나에 대해 Claude Code 프로젝트 디렉터리가 존재할 때만 적용되며, 그렇지 않으면 전체 네임스페이스 검색을 유지합니다. `default_namespace`나 `context_tools.<tool>.namespace`가 설정되어 있으면 그 값이 우선하며, 프록시 호출에는 저장소 범위 제한이 적용되지 않습니다.

`exclude_namespaces`는 범위 제한 여부나 훅·프록시 경로를 가리지 않고 모든 호출에 적용됩니다. 조회된 결과의 네임스페이스가 fnmatch 패턴 중 하나와 일치하면 해당 결과와 같은 네임스페이스의 주변 문맥 청크를 모두 주입하지 않습니다. Pinned Context는 `["*"]`를 지정해도 제외되지 않습니다. 기본값은 이전 세션의 계획(`claude-plans`)과 다른 호스트의 색인(`codex`)을 제외합니다.

```bash
# 계획과 codex 기억을 다시 주입하고, 훅에서도 전체 네임스페이스 검색
export MEMTOMEM_STM_SURFACING__EXCLUDE_NAMESPACES='[]'
export MEMTOMEM_STM_SURFACING__PROJECT_SCOPE_FROM_CWD=false
```

## 안전 장치

서피싱은 장애 복원력과 개인정보 보호를 위해 다음 안전장치 아래에서 동작합니다.

- **회로 차단기(Circuit breaker)** — 3상태(closed / open / half-open)로 동작합니다. 연속 실패가 `circuit_max_failures`(기본값 `3`)회에 도달하면 open 상태로 열리고, `circuit_reset_seconds`(기본값 `60s`)가 지나면 half-open으로 전환됩니다. `{}`, `results` 키가 없는 응답, 항목 형식이 잘못된 응답, 공백뿐인 응답처럼 잘못된 형식의 LTM 응답도 실패로 집계합니다(`{"results": []}`는 정상적인 빈 결과로 처리합니다).
- **서피싱 시간 제한** — 호출당 최대 `3s`의 엄격한 상한을 둡니다. LTM 연결이 아직 시작 중일 때 도착한 호출은 이 제한 시간 안에서 연결 완료를 기다린 뒤, 연결된 Core가 지원하는 컨텍스트 구성 방식을 사용합니다.
- **호출 빈도 제한** — 전체 도구를 합산해 분당 최대 `15`회로 제한합니다.
- **쓰기 도구 제외** — 파일 쓰기·삭제처럼 상태를 변경하는 부수효과가 있는 도구에서는 자동 제시를 비활성화합니다.
- **민감 검색어 건너뛰기(`sensitive_query`)** — 검색어가 자격증명이나 이메일 패턴(한글·가나·한자·악센트 있는 라틴 문자에 바로 붙은 자격증명과 조사가 붙은 이메일 주소 포함)과 일치하면 LTM 조회 전에 건너뜁니다(`surfacing_stats`에 `sensitive_query`로 집계되며 다이제스트 검색도 실행하지 않습니다). 검색어를 `query_template`이나 인자에서 만들 때는 원본 인자(및 서버·도구·템플릿 문자열)를 먼저 검사하며, 템플릿이 없는 도구에 에이전트가 직접 넘긴 검색어(`context_query` / `_context_query`)는 전달된 값만 검사해 민감 패턴이 없으면 정상적으로 관련 기억을 제시합니다. 건너뛴 호출은 Pinned Context를 포함해 아무것도 전달하지 않고, `surfacing_events` 행 기록과 웹훅 호출도 생략하며, 이를 끄는 스위치는 없습니다.
- **반복 검색 쿨다운** — 추출된 검색어가 최근 5초 이내에 처리한 검색어와 거의 동일하면(Jaccard 유사도 `> 0.95`) 건너뜁니다.
- **교차 세션 중복 제거** — 기본 TTL은 `604800s`(7일)이며 `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS`로 조정합니다.
- **주입 크기 상한** — 주입 1회당 기본 상한은 `3000 chars`입니다.
- **로컬 피드백 강등** — 서로 다른 이벤트에서 `not_relevant` 또는 `already_known` 평가를 반복해서 받은 기억은 `feedback_demotion_negative_threshold`(기본값 `3`회)에 도달한 시점부터 주입 전에 걸러집니다.
- **검색어 보호** — `query_retention_days`는 저장된 원문 검색어를 기본 30일 후 삭제하며, `persist_query_text=false`로 설정하면 원문 대신 `sha256:` 다이제스트를 저장합니다.
- **제시 기회 기록** — 피드백 추적기가 활성화된 엔진(데몬 및 `feedback_enabled`가 켜진 프록시)은 서피싱에 진입한 호출마다 `surfacing_opportunities`에 행을 하나씩 기록합니다. 각 행에는 종료 결과, 인자 형태(인자 개수, 경로 깊이, 주요 파일 확장자), 추출된 검색어의 다이제스트만 담기며 인자의 키와 값은 저장하지 않습니다. 행 크기는 약 320바이트이고 `stats_retention_days`에 따라 삭제됩니다. `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED=false`로 끄거나 `opportunities_sample_rate`로 표본 비율만 남길 수 있습니다(홀드아웃 그룹으로 배정된 호출은 항상 기록합니다).
- **호출 식별자** — 훅은 호스트의 `session_id`, `cwd`, `tool_use_id`, `agent_id`를 데몬에 전달하되 로그에는 남기지 않습니다. `surfacing_events` 행에는 `tool_use_id`, `host_session_id`, `host_agent_id`만 저장하고 `cwd`는 저장하지 않으며, 전달된 기억은 설치별 고유 키로 해시한 원본 경로와 미리보기 해시만 기록합니다.
- **보류(holdout)** — `holdout_rate`를 기본값(`0.0`)보다 크게 설정하면 데몬을 거치는 Claude Code 훅 호출 중 주입 대상 호출 일부를 무작위로 보류해 서피싱 효과를 측정합니다. 보류된 호출은 도구 응답을 그대로 반환하고 기록만 남기며, 프록시 경로에서는 보류하지 않습니다.

<a id="ltm-전송"></a>

## LTM 연결

STM은 MCP를 통해 LTM과 통신합니다. 기본 전송 방식은 `stdio`로 `memtomem-server`를 실행하며, 실행 중인 LTM 서비스에 `sse` 또는 `streamable_http`로 연결할 수도 있습니다.

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM 응답은 서피싱 엔진이 직접 소비하며 프록시의 압축·캐시 파이프라인을 거치지 않습니다.

서피싱과 단계적 공개 경로 전체에 동일한 `trace_id`가 전달되므로, Langfuse나 OpenTelemetry 호환 추적 도구에서 후속 이어 읽기 호출이 첫 번째 청크와 함께 묶입니다.

## 실행 조건과 관측

자동 길이 기준은 압축 전의 정제된 응답 원문을 기준으로 삼으며, 기본값에서는 5,000자 미만이면 자동 제시를 건너뜁니다. 명시적 `_context_query`는 이 길이 기준만 우회하며, 기능 비활성화·관련성 임계값·백엔드 연결 상태 조건은 우회하지 않습니다. `_context_query` 매개변수를 도구 스키마에 노출하려면 별도 설정(`MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY=true`)이 필요합니다.

관측 도구는 기본적으로 숨겨져 있습니다. 하위 MCP 프로세스 환경에 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`를 설정한 뒤 다시 연결하세요. 누적 집계 통계가 저장된다고 해서 호출별 트레이스가 외부로 전송되는 것은 아니며, Langfuse와 OTLP는 각각 별도로 활성화해야 합니다.
