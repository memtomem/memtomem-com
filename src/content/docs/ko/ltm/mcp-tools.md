---
title: MCP 도구
description: memtomem LTM MCP 도구 전체 레퍼런스 — full 모드 74개, core 모드 9개 도구.
---

memtomem은 `full` 모드에서 **74개의 MCP 도구**를 노출합니다. `core` 모드(기본값)에서는 자주 사용하는 9개 도구를 직접 노출하고, 메타 도구 `mem_do`가 나머지 도구로 요청을 라우팅합니다 — 에이전트의 컨텍스트 사용량을 최소화합니다.

## 코어 도구

### `mem_status`

서버 연결 상태와 통계를 확인합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

### `mem_add`

콘텐츠, 태그, 네임스페이스와 함께 기억을 저장합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | 저장할 기억 콘텐츠 |
| `tags` | string[] | No | 분류를 위한 태그 |
| `namespace` | string | No | 대상 네임스페이스 (기본값: `default`) |
| `ttl` | integer | No | 유효 기간 (초 단위) |

### `mem_search`

BM25 키워드 + 밀집 벡터 + RRF 융합을 활용한 하이브리드 검색을 수행합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | 검색 쿼리 |
| `namespace` | string | No | 검색할 네임스페이스 |
| `limit` | integer | No | 최대 결과 수 (기본값: 10) |
| `min_score` | float | No | 최소 관련성 점수 |

### `mem_recall`

ID로 단일 기억을 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | 기억 ID |

### `mem_list`

필터링과 페이지네이션을 적용하여 기억 목록을 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | No | 네임스페이스로 필터링 |
| `tags` | string[] | No | 태그로 필터링 |
| `limit` | integer | No | 최대 결과 수 |
| `offset` | integer | No | 페이지네이션 오프셋 |

### `mem_read`

이전에 인덱싱된 소스 파일을 읽습니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | 파일 경로 |

### `mem_index`

파일 또는 경로를 지식 베이스에 인덱싱합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | 파일 또는 디렉토리 경로 |
| `recursive` | boolean | No | 하위 디렉토리 포함 (기본값: true) |

### `mem_stats`

인덱스 및 검색 통계를 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

### `mem_do`

`core` 모드에서 비핵심 작업을 라우팅하는 메타 도구입니다. 단일 진입점을 통해 74개 전체 도구에 접근할 수 있어, 에이전트에 노출되는 도구 수를 최소화합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | 호출할 도구 이름 |
| `params` | object | No | 대상 도구의 파라미터 |

## 멀티 에이전트 도구

### `mem_agent_register`

에이전트를 ID와 설명으로 등록합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | 고유 에이전트 식별자 |
| `description` | string | No | 에이전트 설명 |

### `mem_agent_search`

에이전트의 개인 네임스페이스와 공유 네임스페이스를 대상으로 검색합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | 검색 쿼리 |
| `agent_id` | string | Yes | 호출 에이전트의 ID |
| `limit` | integer | No | 최대 결과 수 |

### `mem_agent_share`

개인 네임스페이스의 기억을 공유 네임스페이스로 내보냅니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memory_id` | string | Yes | 공유할 기억 |
| `agent_id` | string | Yes | 원본 에이전트의 ID |

## 유지보수 도구

### `mem_tag`

태그 관리 — 기억에 태그를 추가, 제거, 또는 목록 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | `add`, `remove`, 또는 `list` |
| `memory_id` | string | 조건부 | 대상 기억 (add/remove 시) |
| `tag` | string | 조건부 | 태그 이름 (add/remove 시) |

### `mem_namespace`

네임스페이스 관리 작업을 수행합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | 관리 작업 |
| `namespace` | string | No | 대상 네임스페이스 |

### `mem_health`

인덱스 상태 진단을 실행합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

### `mem_cleanup`

만료된 기억과 중복 기억을 정리합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dry_run` | boolean | No | 적용 없이 변경 사항 미리보기 (기본값: false) |

---

> 74개 전체 도구 목록은 [memtomem 저장소 문서](https://github.com/memtomem/memtomem/tree/main/docs)에서 확인할 수 있습니다.
