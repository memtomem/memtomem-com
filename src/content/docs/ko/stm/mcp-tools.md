---
title: MCP 도구
description: STM 프록시가 제공하는 모델용 도구 5개와 관찰 액션 8개를 담은 stm_admin, 선택형 기억 제안 도구를 설명합니다.
---

memtomem-stm은 토큰 절감량을 확인하고, 오래된 캐시를 비우고, 관련 기억 제시와 압축을 조정할 수 있는 **관리 도구**를 MCP로 제공합니다. 모델이 작업에 쓰는 도구는 **5개**이며, 여기에 `stm_admin` 디스패처와 사용자가 직접 켜야 하는 `stm_memory_propose`가 있습니다.

## 관찰 도구 노출 제어

모델용 도구 5개는 처음부터 보입니다. 관찰·관리 기능은 별도 도구가 아니라 **`stm_admin` 디스패처 하나에 담긴 액션 8개**이며, 이 디스패처 자체가 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`를 설정하기 전까지 MCP 목록에서 숨겨집니다. `stm_memory_propose`는 `MEMTOMEM_STM_FORMATION__ENABLED=true`로 따로 켭니다. 도구를 표시할지는 이 플래그만으로 정합니다. 연결한 LTM이 검토 후 저장 방식을 지원하는지는 호출할 때 확인하며, 지원하지 않으면 `{"ok": false, "reason": "formation_unsupported"}`를 반환합니다.

| 분류 | 기본 노출 | 플래그를 켰을 때 노출 |
|---|---|---|
| **모델용 (5)** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_proxy_describe_tool`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **관찰·관리 (도구 1개, 액션 8개)** | — | `stm_admin` (`MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS`) |
| **기억 제안 (선택)** | — | `stm_memory_propose` (`MEMTOMEM_STM_FORMATION__ENABLED`) |

## 압축된 응답 다루기

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

### `stm_proxy_describe_tool`

등록된 도구의 전체 메타데이터를 페이지 단위로 읽습니다. 업스트림 도구를 실행하지는 않습니다. 호스트의 설명 길이 제한 때문에 에이전트가 받은 도구 설명이 잘렸을 때 복구하는 경로입니다. 이름은 STM의 `{prefix}__{tool}` 형식으로 넘기며, 호스트가 붙이는 `mcp__server__` 접두사는 **빼고** 전달합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | string | 예 | STM의 `{prefix}__{tool}` 이름 |
| `part` | string | 아니오 | `description`(기본값. 재정의를 반영한 실제 설명), `input_schema`, `upstream_description` |
| `offset` | integer | 아니오 | 재개할 문자 오프셋 (기본 `0`) |
| `limit` | integer | 아니오 | 페이지당 문자 수, 1–16000 (기본 `4000`) |
| `generation` | string | 아니오 | 이전 페이지가 돌려준 연속 토큰 |

모든 페이지에는 `text`, `format`, `total_chars`, `generation`, `next_offset`이 담깁니다. 같은 `name`·`part`·`generation`으로 `next_offset`을 다음 `offset`에 넣어 이어 읽고, `next_offset`이 null이면 끝입니다. `generation`이 바뀌었다면 메타데이터가 변경된 것이므로 `generation` 없이 오프셋 `0`부터 다시 시작합니다. 인자 설명과 예시까지 복구하려면 `input_schema`를 명시적으로 선택해 각 페이지의 `text`를 이어 붙인 뒤 JSON으로 파싱합니다. `limit`은 상한일 뿐이며, 전체 응답 16384바이트 예산 때문에 페이지가 더 짧아질 수 있습니다.

`upstream_description`은 `description_override`가 대체한 원본 문구를 돌려주며, 운영자가 `MEMTOMEM_STM_PROXY__RECOVER_UPSTREAM_DESCRIPTION=true`를 설정하고 재정의를 구성했을 때만 사용할 수 있습니다. 기본값이 꺼짐인 이유는, 재정의가 모델에게 무엇을 알릴지 결정하는 장치이므로 원본을 그대로 돌려주면 그 재정의가 겨냥한 바로 그 독자에게 원문이 다시 전달되기 때문입니다.

## 피드백

### `stm_surfacing_feedback`

자동 튜너가 임계값을 조정할 수 있도록 서피싱된 기억을 평가합니다. 서피싱된 각 기억에는 고유한 `memory_id`가 부여되므로 기억을 하나씩 평가할 수 있으며, `not_relevant` 또는 `already_known`으로 표시한 기억은 다음 서피싱 호출에서 해당 기억만 무효화됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `surfacing_id` | string | 예 | 서피싱 푸터에 표시된 ID |
| `rating` | string | 아니오 | `helpful` / `partially_helpful` / `not_relevant` / `already_known` (단일 평가 경로) |
| `memory_id` | string | 아니오 | 단일 평가가 가리키는 특정 기억 |
| `ratings` | object[] | 아니오 | `memory_id`와 `rating`을 담은 기억별 일괄 평가 (단일 평가 필드와 함께 쓸 수 없음) |

### `stm_compression_feedback`

압축 과정에서 빠진 정보를 보고합니다. 현재 턴을 복구하는 기능이 아니라 학습 신호이며, 보고 내용은 `stm_admin(action="compression_stats")`에 누적됩니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `server` | string | 예 | 업스트림 서버 |
| `tool` | string | 예 | 도구 이름 |
| `missing` | string | 예 | 필요했지만 받지 못한 내용 |
| `kind` | string | 아니오 | 분류 힌트 |
| `trace_id` | string | 아니오 | 가능한 경우 Langfuse trace ID |

## 관찰·관리 — `stm_admin`

관찰 기능 8가지는 예전에는 각각 별도의 MCP 도구였습니다. 지금은 디스패처 하나의 액션이므로, 관찰 기능을 켠 운영자가 에이전트 도구 목록에서 차지하는 자리는 8개가 아니라 1개입니다.

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `action` | string | 예 | 액션 이름. `help`를 넘기면 각 액션의 파라미터를 보여 줍니다. |
| `params` | object | 아니오 | 액션에 전달할 인자. 예: `{"tool": "mem_search"}` |

CLI로는 `mms stats`, `mms health`, `mms tune`이 같은 정보를 보여 줍니다.

| 액션 | 파라미터 | 보고 내용 |
|---|---|---|
| `proxy_stats` | — | 토큰 절감량, 캐시 적중, 도구별 호출 이력 |
| `proxy_health` | — | 업스트림 연결 상태와 프록시 상태. 업스트림마다 **발견한** 도구 수와 실제로 **노출한** 도구 수를 함께 보고하므로, 노출 조건 검사로 걸러진 차이를 한눈에 확인할 수 있습니다. 서피싱 서킷 브레이커 상태도 보여 주며, 외부 도구 그래프 노출 조건 제공자를 켰다면 그 상태도 포함합니다. |
| `proxy_cache_clear` | `server`, `tool` | 캐시를 비웁니다. 범위를 지정하지 않으면 SQLite 응답 캐시와 메모리 내 서피싱 캐시를 모두 비우고, `server` 또는 `tool`로 범위를 좁히면 응답 캐시만 비웁니다. 서피싱 캐시는 질의 해시로만 색인되어 서버·도구 축이 없기 때문입니다. 시작 시에만 쓰는 도구 그래프 조회 캐시는 건드리지 않습니다. |
| `surfacing_stats` | `tool`, `since`, `limit` | `events_total`, `distinct_tools`, `total_feedback`, 도구별 집계, 평가 분포, 도움이 된 비율, 최근 목록을 보고합니다. `since`는 ISO-8601 시각이며, `limit`의 기본값은 `10`이고 `0`이면 최근 목록을 숨깁니다. |
| `selection_stats` | — | 도구 선택과 실행 텔레메트리. `proxy.selection_telemetry.enabled = true`로 설정하면 프록시가 JSONL 로그를 기록하며, 이 액션이 그 로그를 읽어 이벤트 수, 랭커 버전별 선택, 서버·도구별 선택, 지연 백분위를 포함한 실행 성공·실패, 노출 조건 검사의 거부 사유 집계로 정리합니다. 이 프로세스의 기록 경로 카운터(기록된 이벤트 / 샘플링 제외 / 마스킹 제외 / 기록 오류)도 함께 보여 줍니다. 집계 대상은 활성 로그뿐이며, 회전된 백업은 존재만 표시하고 파싱하지 않습니다. |
| `compression_stats` | `tool` | 도구별 압축 피드백 건수 |
| `progressive_stats` | `tool` | Progressive 압축 호출의 응답별 후속 조회 비율과 적용 범위. 최초 청크와 `stm_proxy_read_more` 후속 호출이 각각 `progressive_reads`의 한 행이 되며, 집계는 캐시 키 단위로 묶으므로 후속 조회가 다섯 번인 응답과 한 번도 없는 응답의 가중치가 같습니다. 총 조회 수, 총 응답 수, 후속 조회 비율, 평균 제공 문자 수, 평균 전체 문자 수, 평균 적용 범위, 도구별 집계를 보고합니다. 기본 `PROGRESSIVE` 저장 경로가 실패해 캐시 없는 전체 응답 전달로 내려간 횟수도 함께 보고하므로, 저장소 고장이 조용히 묻히지 않습니다. |
| `tuning_recommendations` | `since_hours`, `tool` | 최근 피드백에서 도출한 도구별 자동 튜닝 권고. `since_hours`의 기본값은 `24.0`입니다. |

<a id="프록시되는-업스트림-도구"></a>

## 프록시가 중계하는 도구

등록한 MCP 서버의 도구는 `{prefix}__{tool}` 형식의 이름으로 STM을 통해 호출합니다. 예:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem의 read_file 은 fs__read_file 이 됩니다
```

STM은 연결한 도구를 모두 그대로 표시하지 않고 먼저 조건을 검사합니다. 연결이 끊긴 서버의 도구, 메타데이터에 자격 증명으로 보이는 문자열이 있는 도구, 이름이 겹치는 도구는 에이전트에 표시하지 않습니다. 제외된 수는 `stm_admin(action="proxy_health")`이 보여 주는 발견·노출 도구 수의 차이로 확인할 수 있습니다.

MCP 도구 선택 화면(예: Claude Code의 `/mcp`)에 표시되는 프록시 도구의 **제목**(`annotations.title` 필드)에는 출처를 나타내는 `[{server}]` 접두사가 자동으로 붙습니다. 예를 들어 `filesystem` 서버의 `Read file` 도구는 `[filesystem] Read file`로 보입니다. 이 제목은 도구를 호출할 때 쓰는 `{prefix}__{tool}` 이름과 별개입니다. 연결한 도구가 이미 `annotations.title`을 제공할 때만 적용됩니다.

에이전트가 `fs__read_file`을 호출하면 기본 프록시는 **CLEAN → COMPRESS → SURFACE** 순서로 처리합니다. 압축한 응답과 관련 기억을 반환하며, 응답을 LTM에 다시 기록하지 않습니다.

> 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)과 [압축 전략](/ko/stm/compression/)을 참고하세요.
