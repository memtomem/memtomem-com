---
title: MCP 도구
description: STM 프록시는 상태, 캐시, 서피싱, 압축, 점진적 전달을 위한 11개 관리 도구를 제공합니다.
---

업스트림 MCP 도구를 투명하게 프록시하는 것 외에도, memtomem-stm은 프록시를 관찰·제어하기 위한 **11개 관리 도구**를 노출합니다.

## 관찰 도구 노출 제어

11개 중 7개는 **관찰(observability)** 도구이며, 에이전트 컨텍스트를 아끼려면 MCP 도구 목록에서 숨길 수 있습니다. MCP 클라이언트 설정의 `env`에 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=false`를 지정하면 관찰 도구가 `tools/list`에서 빠집니다. 파이썬 테스트나 내부 코드에서는 여전히 호출 가능합니다.

| 범주 | 항상 노출 | 플래그 off일 때 숨김 |
|---|---|---|
| **항상 on** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **관찰** | — | `stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations` |

## 프록시 통계 및 제어

### `stm_proxy_stats`

토큰 절감, 캐시 히트, 도구별 호출 이력.

파라미터 없음. *(관찰 — `advertise_observability_tools=false`일 때 숨김.)*

### `stm_proxy_health`

업스트림 연결 상태와 서킷 브레이커 상태.

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
| `offset` | integer | 예 | 재개할 바이트 오프셋 |
| `limit` | integer | 아니오 | 이번 턴에 반환할 문자 수 |

> 에이전트는 `\n---\n` 단독이 아닌 정식 `PROGRESSIVE_FOOTER_TOKEN`(`\n---\n[progressive: chars=`)으로 분할해야 합니다. 단순 `\n---\n`는 Markdown HR·YAML 펜스와 충돌합니다.

## 서피싱 피드백

### `stm_surfacing_feedback`

자동 튜너가 임계값을 조정할 수 있도록 서피싱된 기억을 평가합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `surfacing_id` | string | 예 | 서피싱 푸터에서 얻은 id |
| `rating` | string | 예 | `helpful` / `not_relevant` / `already_known` |
| `memory_id` | string | 아니오 | 피드백 대상 개별 기억 |

### `stm_surfacing_stats`

서피싱 지표와 피드백 분포를 집계합니다. `events_total`, `distinct_tools`, `total_feedback`, 도구별 분해, rating 분포, helpfulness %, 최근 꼬리 목록을 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 업스트림 도구 이름으로 필터 |
| `since` | string | 아니오 | ISO-8601 타임스탬프(예: `2026-04-20T00:00:00`) 이후 이벤트만 포함 |
| `limit` | integer | 아니오 | `Recent` 섹션 꼬리 크기 (기본 `10`, `0`은 숨김) |

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

Progressive 압축을 거친 호출의 응답별 후속 읽기 비율과 커버리지를 집계합니다. 초기 청크와 이어지는 각 `stm_proxy_read_more`은 `progressive_reads` 테이블의 한 행으로 기록되며, 캐시 키 단위로 모읍니다 — 후속 5회 응답과 후속 없음 응답의 가중치가 동일합니다. total reads, total responses, follow-up rate, avg chars served, avg total chars, avg coverage, 도구별 분해를 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `tool` | string | 아니오 | 업스트림 도구 이름으로 필터 |

*(관찰 — `advertise_observability_tools=false`일 때 숨김.)*

### `stm_tuning_recommendations`

최근 피드백을 근거로 한 도구별 자동 튜너 권고.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `since_hours` | number | 아니오 | 시간 창 (기본 `24.0`) |
| `tool` | string | 아니오 | 도구 이름으로 필터 |

*(관찰.)*

## 프록시되는 업스트림 도구

등록된 업스트림 MCP 서버의 모든 도구는 `{prefix}__{tool}` 패턴으로 STM을 통해 프록시됩니다. 예:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem의 read_file 은 fs__read_file 이 됩니다
```

에이전트가 `fs__read_file`을 호출하면 프록시가 **CLEAN → COMPRESS → SURFACE → INDEX** 파이프라인을 실행하고, 압축된 응답 + 서피싱된 기억을 함께 반환합니다.

> 메커니즘은 [능동적 서피싱](/ko/stm/surfacing/)과 [압축 전략](/ko/stm/compression/)을 참조하세요.
