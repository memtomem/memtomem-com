---
title: MCP 도구
description: memtomem LTM MCP 도구 레퍼런스 — full 모드 80여 개, core 모드 9개.
---

memtomem은 `full` 모드에서 **80여 개의 MCP 도구**를 등록합니다. `core` 모드(기본값)에서는 자주 사용하는 9개만 직접 노출하고 — 그중 하나가 메타 도구 `mem_do`이며 나머지 비핵심 작업으로 요청을 라우팅합니다 — 에이전트의 컨텍스트 사용량을 최소화합니다.

노출 모드는 MCP 클라이언트 설정의 `env`에 `MEMTOMEM_TOOL_MODE`를 지정해 조정합니다.

| 모드 | 노출되는 도구 | 비고 |
|---|---|---|
| `core` (기본) | **9개** (`mem_do` 포함) | 컨텍스트 사용량 최소화. 비핵심 작업은 `mem_do(action=...)`로 라우팅 |
| `standard` | 약 30여 개 | core + 자주 쓰는 그룹 (CRUD, namespace, tags, sessions, scratch, relations) |
| `full` | 80여 개 | 모든 도구를 개별 등록 |

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

날짜 범위로 최근 기억 청크를 조회합니다 — 생성 시각 내림차순. 키워드 없이 시간·소스·네임스페이스 필터로 훑을 때 사용하며, 키워드 검색은 `mem_search`를 씁니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | string | No | 시작 시각 (포함). `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, ISO datetime 허용 |
| `until` | string | No | 종료 시각 (제외). `since`와 동일 형식 |
| `source_filter` | string | No | 소스 파일 경로 substring 또는 glob (`*`, `?`, `[]`) |
| `namespace` | string | No | 네임스페이스 — 단일·콤마 구분·glob (예: `project:*`) |
| `limit` | integer | No | 반환할 청크 수 (기본 20, 최대 500) |
| `output_format` | string | No | `compact` (기본) 또는 `structured` (JSON) |

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

`core` 모드에서 비핵심 작업을 라우팅하는 메타 도구입니다. 단일 진입점으로 80여 개 전체 도구에 접근할 수 있어, 에이전트에 노출되는 도구 수를 최소화합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | 호출할 도구 이름 또는 별칭 (예: `orphans` → `cleanup_orphans`) |
| `params` | object | No | 대상 도구의 파라미터 |

## 멀티 에이전트 도구

### `mem_agent_register`

에이전트를 등록하고 `agent-runtime:{agent_id}` 네임스페이스를 생성합니다. 이미 등록된 ID로 호출하면 메타데이터만 갱신됩니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | 고유 에이전트 식별자 (`[A-Za-z0-9._-]` 문자만 허용) |
| `description` | string | No | 에이전트 역할 설명 |
| `color` | string | No | UI용 색상 hex 코드 |

### `mem_agent_search`

에이전트의 개인 네임스페이스와 (선택적으로) 공유 네임스페이스를 함께 검색합니다. `agent_id`를 생략하면 활성 세션의 에이전트 또는 legacy `current_namespace`로 폴백합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | 검색 쿼리 |
| `agent_id` | string | No | 호출 에이전트 ID (생략 시 세션 컨텍스트 사용) |
| `include_shared` | boolean | No | 공유 네임스페이스도 함께 검색 (기본 `true`) |
| `top_k` | integer | No | 최대 결과 수 (기본 10) |
| `output_format` | string | No | `compact` (기본) / `verbose` / `structured` |

### `mem_agent_share`

청크를 다른 네임스페이스로 **복사**합니다. 참조 링크가 아닌 **복제**이므로 새 청크는 새로운 UUID를 받고, 원본 변경은 사본에 반영되지 않습니다. 출처 추적은 사본에 자동으로 붙는 `shared-from=<원본-uuid>` 태그로만 이뤄집니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chunk_id` | string | Yes | 복사할 청크의 UUID |
| `target` | string | No | 대상 네임스페이스 (기본 `shared`. `agent-runtime:{agent_id}`도 가능) |

## 태그 관리

태그 작업은 `services.tag_management`를 통해 라우팅되어 MCP·Web UI·검색 캐시 무효화가 일관되게 동작합니다.

| 도구 | 설명 |
|---|---|
| `mem_tag_list` | 태그별 사용 횟수 (빈도 내림차순) |
| `mem_tag_rename(old_tag, new_tag, dry_run=false)` | 태그를 일괄 이름 변경 |
| `mem_tag_delete(tag, dry_run=false)` | 모든 청크에서 태그 제거 (청크 자체는 보존) |
| `mem_tag_merge(sources, target, dry_run=false)` | 여러 source 태그를 하나의 target 태그로 통합 |

`dry_run=true`이면 영향 받는 청크 수와 샘플만 출력하고 쓰지 않습니다.

## 네임스페이스 관리

| 도구 | 설명 |
|---|---|
| `mem_ns_list` | 네임스페이스 + 청크 수 목록 |
| `mem_ns_get` | 현재 세션 네임스페이스 조회 |
| `mem_ns_set(namespace)` | 세션 기본 네임스페이스 설정. 이후 search/add/recall이 별도 지정 없이 이 값을 사용 |
| `mem_ns_rename(old, new)` | 네임스페이스 이름 변경 (재인덱싱 불필요, SQL UPDATE) |
| `mem_ns_assign(namespace, source_filter?, old_namespace?)` | 기존 청크를 다른 네임스페이스로 이동 (필터 필수) |
| `mem_ns_update(namespace, description?, color?)` | 네임스페이스 메타데이터(설명·색상) 갱신 |
| `mem_ns_delete(namespace)` | 네임스페이스의 모든 청크를 인덱스에서 삭제 (소스 파일은 보존) |

모든 네임스페이스 인자는 `validate_namespace()` 게이트를 통과해야 하며, 적대적 형식(`shared:foo:bar` 등)은 거부됩니다.

## 정리·중복·만료

| 도구 | 설명 |
|---|---|
| `mem_cleanup_orphans` | 소스 파일이 사라진 고아 청크 정리 |
| `mem_dedup_scan` / `mem_dedup_merge` | 중복 청크 탐지 및 병합 |
| `mem_decay_scan` / `mem_decay_expire` | 시간 기반 감쇠 점수 부여 / TTL 만료 적용 |

---

> 80여 개 전체 도구 목록과 시그니처는 [memtomem 저장소 문서](https://github.com/memtomem/memtomem/tree/main/docs)에서 확인할 수 있습니다.
