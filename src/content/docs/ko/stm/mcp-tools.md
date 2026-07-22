---
title: MCP 도구
description: STM 프록시가 제공하는 기본 도구 12개와 선택형 기억 제안 도구를 설명합니다.
---

memtomem-stm은 토큰 절감량을 확인하고, 오래된 캐시를 비우고, 관련 기억 제시와 압축을 조정할 수 있는 **관리 도구**를 MCP로 제공합니다. 기본 도구는 **12개**이며, 사용자가 직접 켜야 하는 `stm_memory_propose`가 별도로 있습니다.

## 관찰 도구 노출 제어

12개 기본 도구 중 모델이 작업에 쓰는 4개는 처음부터 보입니다. 나머지 관찰·관리 도구 8개는 기본적으로 숨겨지며 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`로 표시할 수 있습니다. `stm_memory_propose`는 `MEMTOMEM_STM_FORMATION__ENABLED=true`로 따로 켭니다. 도구를 표시할지는 이 플래그만으로 정합니다. 연결한 LTM이 검토 후 저장 방식을 지원하는지는 호출할 때 확인하며, 지원하지 않으면 `{"ok": false, "reason": "formation_unsupported"}`를 반환합니다.

| 범주 | 기본 표시 | 해당 설정을 켰을 때 표시 |
|---|---|---|
| **모델용 (4)** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **관찰·관리 (8)** | — | `stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations` (`MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS`) |
| **기억 형성 (선택)** | — | `stm_memory_propose` (`MEMTOMEM_STM_FORMATION__ENABLED`) |

## 프록시 통계 및 제어

### `stm_proxy_stats`

토큰 절감량, 캐시 사용 횟수, 도구별 호출 이력을 보여 줍니다.

파라미터 없음. *(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

### `stm_proxy_health`

연결한 서버와 프록시의 상태를 보여 줍니다. 서버별로 발견한 도구 수(`discovered`)와 실제로 표시한 도구 수(`advertised`)를 함께 알려 주므로, 조건 검사에서 제외된 도구가 있는지 바로 확인할 수 있습니다. 관련 기억 검색의 회로 차단기 상태와, 외부 도구 그래프의 자격 판정을 켠 경우 그 상태도 표시합니다.

파라미터 없음. *(관찰.)*

### `stm_proxy_cache_clear`

응답 캐시 비우기.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `server` | string | 아니오 | 특정 연결 서버로 제한 |
| `tool` | string | 아니오 | 특정 도구 범위로 제한 |

*(관찰.)*

### `stm_proxy_select_chunks`

이전 호출에서 받은 `selective` / `hybrid` 목차에서 읽을 섹션을 선택합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `key` | string | 예 | 이전 응답의 TOC 키 |
| `sections` | string[] | 예 | 펼쳐 볼 섹션 ID |

### `stm_proxy_read_more`

`progressive` 응답의 다음 청크를 읽습니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `key` | string | 예 | Progressive 응답 키 |
| `offset` | integer | 아니오 | 재개할 문자 오프셋 (기본 `0`) |
| `limit` | integer | 아니오 | 이번 턴에 반환할 문자 수 |

> 에이전트는 `\n---\n`만 사용하지 말고 정식 `PROGRESSIVE_FOOTER_TOKEN`(`\n---\n[progressive: chars=`)을 기준으로 나눠야 합니다. `\n---\n`는 Markdown 수평선이나 YAML 구분선과 겹칠 수 있습니다.

## 서피싱 피드백

### `stm_surfacing_feedback`

자동 튜너가 임계값을 조정할 수 있도록 서피싱된 기억을 평가합니다. 서피싱된 각 기억에는 고유한 `memory_id`가 부여되므로 기억을 하나씩 평가할 수 있으며, `not_relevant` 또는 `already_known`으로 표시한 기억은 다음 서피싱 호출에서 해당 기억만 무효화됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `surfacing_id` | string | 예 | 서피싱 푸터에서 얻은 id |
| `rating` | string | 아니오 | `helpful` / `partially_helpful` / `not_relevant` / `already_known` (단일 평가 경로) |
| `memory_id` | string | 아니오 | 단일 평가 경로에서 피드백 대상 개별 기억 |
| `ratings` | object[] | 아니오 | `memory_id`와 `rating`으로 구성된 기억별 일괄 피드백. 단일 평가 필드와 함께 사용할 수 없음 |

### `stm_surfacing_stats`

관련 기억 제시 지표와 피드백 분포를 집계합니다. `events_total`, `distinct_tools`, `total_feedback`, 도구별 내역, 평가 분포, 유용성 비율, 최근 기록을 보여 줍니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 연결한 도구 이름으로 필터링 |
| `since` | string | 아니오 | ISO-8601 타임스탬프(예: `2026-04-20T00:00:00`) 이후 이벤트만 포함 |
| `limit` | integer | 아니오 | `Recent` 섹션 꼬리 크기 (기본 `10`, `0`은 숨김) |

*(관찰.)*

## 선택 통계

### `stm_selection_stats`

도구 선택과 실행 기록을 요약합니다. `proxy.selection_telemetry.enabled = true`이면 프록시가 JSONL 로그를 남깁니다. 이 도구는 로그를 읽어 전체 기록 수, 순위 계산기 버전별·서버별·도구별 선택, 실행 성공과 오류, 지연 시간 분포(백분위수), 조건 검사에서 도구를 제외한 이유를 집계합니다. 현재 프로세스의 기록 수, 표본 제외 수, 민감 정보 때문에 버린 수, 쓰기 오류 수도 함께 표시합니다. 현재 로그만 집계하며 이전 로그 파일은 존재 여부만 확인하고 읽지는 않습니다.

파라미터 없음. *(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

## 압축 피드백

### `stm_compression_feedback`

압축이 누락한 정보를 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `server` | string | 예 | 연결한 서버 |
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

`progressive` 압축을 사용한 호출에서 후속 읽기가 이어진 비율과 전체 내용을 확인한 비율을 집계합니다. 첫 조각과 각 `stm_proxy_read_more` 호출은 `progressive_reads` 테이블에 한 행씩 기록하고 캐시 키별로 묶습니다. 후속 읽기가 5번인 응답과 한 번도 없는 응답을 각각 하나의 응답으로 같은 비중으로 계산합니다. 전체 읽기 수와 응답 수, 후속 읽기 비율, 평균 전달 문자 수, 평균 전체 문자 수, 평균 확인 비율, 도구별 내역을 보여 줍니다. 기본 `PROGRESSIVE` 저장 경로에 문제가 생겨 캐시 없이 원문을 그대로 보낸 횟수도 함께 표시하므로 저장소 장애를 놓치지 않을 수 있습니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 연결한 도구 이름으로 필터링 |

*(관찰 — `advertise_observability_tools=true`일 때만 MCP에 노출.)*

### `stm_tuning_recommendations`

최근 피드백을 근거로 한 도구별 자동 튜너 권고.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `since_hours` | number | 아니오 | 시간 창 (기본 `24.0`) |
| `tool` | string | 아니오 | 도구 이름으로 필터 |

*(관찰.)*

<a id="프록시되는-업스트림-도구"></a>

## 프록시가 중계하는 도구

등록한 MCP 서버의 도구는 `{prefix}__{tool}` 형식의 이름으로 STM을 통해 호출합니다. 예:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem의 read_file 은 fs__read_file 이 됩니다
```

STM은 연결한 도구를 모두 그대로 표시하지 않고 먼저 조건을 검사합니다. 연결이 끊긴 서버의 도구, 메타데이터에 자격 증명으로 보이는 문자열이 있는 도구, 이름이 겹치는 도구는 에이전트에 표시하지 않습니다. 제외된 수는 `stm_proxy_health`가 보여 주는 발견·노출 도구 수의 차이로 확인할 수 있습니다.

MCP 도구 선택 화면(예: Claude Code의 `/mcp`)에 표시되는 프록시 도구의 **제목**(`annotations.title` 필드)에는 출처를 나타내는 `[{server}]` 접두사가 자동으로 붙습니다. 예를 들어 `filesystem` 서버의 `Read file` 도구는 `[filesystem] Read file`로 보입니다. 이 제목은 도구를 호출할 때 쓰는 `{prefix}__{tool}` 이름과 별개입니다. 연결한 도구가 이미 `annotations.title`을 제공할 때만 적용됩니다.

에이전트가 `fs__read_file`을 호출하면 기본 프록시는 **CLEAN → COMPRESS → SURFACE** 순서로 처리합니다. 압축한 응답과 관련 기억을 반환하며, 응답을 LTM에 다시 기록하지 않습니다.

> 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)과 [압축 전략](/ko/stm/compression/)을 참고하세요.
