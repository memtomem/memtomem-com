---
title: MCP 도구
description: STM 프록시는 상태, 캐시, 서피싱, 압축, 점진적 전달, 선택 통계를 위한 13개 관리 도구를 제공합니다.
---

프록시가 얼마나 토큰을 절감하는지 확인하거나, 오래된 캐시를 비우거나, 서피싱·압축 동작을 조정하려는 경우 memtomem-stm은 MCP를 통해 **관리 도구**를 노출합니다. 업스트림 MCP 도구를 프록시하는 것 외에 제공되는 이 도구는 모두 **13개**이며, 분류와 노출 정책은 아래 표를 기준으로 합니다.

## 관찰 도구 노출 제어

13개 중 4개는 **모델용 도구**로 기본 노출되며, 나머지 9개는 **관찰·관리(observability)** 도구로 에이전트 컨텍스트를 아끼기 위해 기본적으로 MCP 도구 목록에서 숨겨집니다. MCP 클라이언트 설정의 `env`에 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`를 지정하면 관찰 도구가 `tools/list`에 노출됩니다. 파이썬 테스트나 내부 코드에서는 어느 쪽이든 호출 가능합니다.

| 범주 | 항상 노출 | 플래그 on일 때 노출 |
|---|---|---|
| **모델용 (4)** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **관찰·관리 (9)** | — | `stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_index_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations` |

## 프록시 통계 및 제어

### `stm_proxy_stats`

토큰 절감, 캐시 히트, 도구별 호출 이력.

파라미터 없음. *(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

### `stm_proxy_health`

업스트림 연결 상태와 프록시 상태. 업스트림별로 **발견된(discovered)** 도구 수와 실제 **노출된(advertised)** 도구 수를 함께 보고하므로, 적격성 필터가 일부 도구를 제외했을 때 그 차이를 즉시 확인할 수 있습니다. 서피싱 서킷 브레이커 상태와, 외부 tool-graph 적격성 공급자를 활성화한 경우 그 상태도 함께 표시됩니다.

파라미터 없음. *(관찰.)*

### `stm_proxy_cache_clear`

응답 캐시 비우기.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `server` | string | 아니오 | 특정 업스트림 범위로 제한 |
| `tool` | string | 아니오 | 특정 도구 범위로 제한 |

*(관찰.)*

### `stm_proxy_select_chunks`

이전 호출에서 받은 `selective` / `hybrid` TOC 중 특정 섹션을 선택합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `key` | string | 예 | 이전 응답의 TOC 키 |
| `sections` | string[] | 예 | 확장할 섹션 id |

### `stm_proxy_read_more`

`progressive` 응답의 다음 청크를 읽습니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `key` | string | 예 | Progressive 응답 키 |
| `offset` | integer | 아니오 | 재개할 문자 오프셋 (기본 `0`) |
| `limit` | integer | 아니오 | 이번 턴에 반환할 문자 수 |

> 에이전트는 `\n---\n` 단독이 아닌 정식 `PROGRESSIVE_FOOTER_TOKEN`(`\n---\n[progressive: chars=`)으로 분할해야 합니다. 단순 `\n---\n`는 Markdown HR·YAML 펜스와 충돌합니다.

## 서피싱 피드백

### `stm_surfacing_feedback`

자동 튜너가 임계값을 조정할 수 있도록 서피싱된 기억을 평가합니다. 서피싱된 각 기억에는 고유한 `memory_id`가 부여되므로 기억을 하나씩 평가할 수 있으며, `not_relevant` 또는 `already_known`으로 표시한 기억은 다음 서피싱 호출에서 해당 기억만 무효화됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `surfacing_id` | string | 예 | 서피싱 푸터에서 얻은 id |
| `rating` | string | 아니오 | `helpful` / `partially_helpful` / `not_relevant` / `already_known` (단일 평가 경로) |
| `memory_id` | string | 아니오 | 단일 평가 경로에서 피드백 대상 개별 기억 |
| `ratings` | object[] | 아니오 | `memory_id`와 `rating`으로 구성된 per-memory batch 피드백 (단일 평가 필드와 상호 배타) |

### `stm_surfacing_stats`

서피싱 지표와 피드백 분포를 집계합니다. `events_total`, `distinct_tools`, `total_feedback`, 도구별 분해, rating 분포, helpfulness %, 최근 꼬리 목록을 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 업스트림 도구 이름으로 필터 |
| `since` | string | 아니오 | ISO-8601 타임스탬프(예: `2026-04-20T00:00:00`) 이후 이벤트만 포함 |
| `limit` | integer | 아니오 | `Recent` 섹션 꼬리 크기 (기본 `10`, `0`은 숨김) |

*(관찰.)*

## 선택 통계

### `stm_selection_stats`

도구 선택·실행 텔레메트리를 요약합니다. `proxy.selection_telemetry.enabled = true`로 설정하면 프록시가 JSONL 로그를 기록하며, 이 도구는 그 로그를 읽어 이벤트 수, ranker 버전별 선택, 서버·도구별 선택, 실행 ok/error 및 지연 시간 백분위수, 적격성 하드 필터의 reject 사유 집계를 보여 줍니다. 현재 프로세스의 쓰기 경로 카운터(기록·샘플 제외·redaction drop·쓰기 오류)도 함께 표시합니다. 활성 로그만 집계하며, 로테이션된 백업은 존재만 표시하고 파싱하지 않습니다.

파라미터 없음. *(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

## 인덱싱 통계

### `stm_index_stats`

자동 인덱싱과 추출 경로(`auto_index_response` = 응답 verbatim 청킹, `extract_and_store` = LLM 사실 추출 후 청킹)를 통한 STM 기반 LTM 쓰기 통계입니다. SURFACE 경로의 `stm_surfacing_stats`와 대칭이지만 INDEX는 의도적으로 품질 시그널을 두지 않으며, 운영자가 보는 값은 `attempts`(경로별 시도 수)와 `outcomes`(`stored` / `error` / `privacy_skip` / `dedup_skip` / `extracted_zero_facts`) 분포뿐입니다.

> 독립 실행형 `mms` 서버에서는 INDEX 쓰기 경로가 설계상 비활성 상태입니다(#288). `stm_proxy.json`에서 `auto_index`를 켜도 독립 실행형 서버는 LTM에 다시 기록하지 않으며, 이 카운터는 라이브러리 통합과 향후 서버 연결을 위해 존재합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 업스트림 도구 이름으로 필터 — `__total__` 행은 항상 포함 |

*(관찰.)*

## 압축 피드백

### `stm_compression_feedback`

압축이 누락한 정보를 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `server` | string | 예 | 업스트림 서버 |
| `tool` | string | 예 | 도구 이름 |
| `missing` | string | 예 | 에이전트가 필요했으나 받지 못한 내용 |
| `kind` | string | 아니오 | 범주 힌트 |
| `trace_id` | string | 아니오 | Langfuse 등 트레이스 id |

### `stm_compression_stats`

도구별 압축 피드백 집계.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 도구 이름으로 필터 |

*(관찰.)*

## 점진적 전달 통계

### `stm_progressive_stats`

Progressive 압축을 거친 호출의 응답별 후속 읽기 비율과 커버리지를 집계합니다. 초기 청크와 이어지는 각 `stm_proxy_read_more`은 `progressive_reads` 테이블의 한 행으로 기록되며, 캐시 키 단위로 모읍니다 — 후속 5회 응답과 후속 없음 응답의 가중치가 동일합니다. total reads, total responses, follow-up rate, avg chars served, avg total chars, avg coverage, 도구별 분해를 보고합니다. 또한 기본 `PROGRESSIVE` 저장 경로가 실패하여 캐시 없는 전체 응답 패스스루로 강등된 횟수도 함께 보고하므로, 백킹 스토어 장애가 조용히 묻히지 않습니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 업스트림 도구 이름으로 필터 |

*(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

### `stm_tuning_recommendations`

최근 피드백을 근거로 한 도구별 자동 튜너 권고.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `since_hours` | number | 아니오 | 시간 창 (기본 `24.0`) |
| `tool` | string | 아니오 | 도구 이름으로 필터 |

*(관찰.)*

## 프록시되는 업스트림 도구

등록된 업스트림 MCP 서버의 도구는 `{prefix}__{tool}` 패턴으로 STM을 통해 프록시됩니다. 예:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem의 read_file 은 fs__read_file 이 됩니다
```

STM은 업스트림 도구를 1:1로 그대로 노출하지 않고, 노출 시점에 적격성 필터를 적용합니다. 연결이 끊긴 서버의 도구, 메타데이터에 자격 증명으로 보이는 문자열이 포함된 도구, 이름이 충돌하는 도구는 에이전트에게 노출되지 않으며, 그 결과는 `stm_proxy_health`의 발견·노출 도구 수 차이로 확인할 수 있습니다.

MCP 도구 선택 UI(예: Claude Code의 `/mcp`)에서 렌더링되는 프록시 도구의 **제목**(`annotations.title` 필드)에는 출처를 나타내도록 `[{server}]` 접두사가 자동으로 붙습니다. 예를 들어 `filesystem` 서버의 `Read file` 도구는 `[filesystem] Read file` 로 표시됩니다. 이는 도구를 호출할 때 사용하는 `{prefix}__{tool}` 이름과는 별개이며, 업스트림 도구가 이미 `annotations.title` 을 제공하는 경우에만 적용됩니다.

에이전트가 `fs__read_file`을 호출하면 프록시는 활성 파이프라인인 **CLEAN → COMPRESS → SURFACE**를 실행하며, **INDEX**는 index engine이 연결된 경우에만 동작합니다. 반환값은 압축된 응답 + 서피싱된 기억입니다.

> 메커니즘은 [능동적 서피싱](/ko/stm/surfacing/)과 [압축 전략](/ko/stm/compression/)을 참조하세요.
