---
title: MCP 도구
description: memtomem이 MCP 클라이언트에 기억 기능을 노출하는 방식.
---

memtomem은 LTM 기능을 MCP 도구로 노출합니다. 처음 쓰는 경우 기본값인 `core` 모드를 유지하세요. 자주 쓰는 도구만 직접 노출하고 나머지는 `mem_do`로 라우팅하므로, 에이전트가 보는 도구 목록이 작아집니다.

## 도구 모드

MCP 클라이언트 설정의 `MEMTOMEM_TOOL_MODE`로 모드를 지정합니다.

| 모드 | 노출 도구 | 권장 상황 |
|---|---|---|
| `core` (기본) | `mem_do` 포함 총 9개 | 대부분의 에이전트에 가장 좋은 기본값 |
| `standard` | `mem_do` 포함 38개 | 자주 쓰는 관리 도구를 직접 노출하고 싶을 때 |
| `full` | 87개 | 디버깅, 문서화, 대량 도구 목록을 잘 다루는 클라이언트 |

예시:

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "env": { "MEMTOMEM_TOOL_MODE": "core" }
    }
  }
}
```

## Core 모드

`core` 모드에서 에이전트는 일상적인 기억 작업에 필요한 도구를 봅니다:

| 도구 | 용도 |
|---|---|
| `mem_status` | 서버, 스토리지, 임베딩, 인덱스 상태 확인 |
| `mem_stats` | 인덱스 통계 반환 |
| `mem_add` | 새 기억 저장 |
| `mem_search` | 인덱싱된 기억 하이브리드 검색 |
| `mem_recall` | 최근 또는 날짜 필터 기반 기억 조회 |
| `mem_index` | 파일 또는 디렉터리 인덱싱 |
| `mem_list` | 인덱싱된 기억 / 소스 목록 |
| `mem_read` | 인덱싱된 원본 파일 읽기 |
| `mem_do` | 비핵심 액션 라우팅 |

에이전트에게 자연어로 원하는 작업을 말하면 보통 적절한 core 도구를 선택합니다.

## `mem_do`

`mem_do`는 나머지 기능에 접근하는 진입점입니다. `action`과 선택적 `params`를 받습니다.

```text
mem_do(action="help")
mem_do(action="help", params={"category": "context"})
mem_do(action="schedule_list")
mem_do(action="context_diff", params={"scope": "project_shared"})
mem_do(action="context_artifact_transfer", params={"asset_type": "skill", "name": "my-skill", "mode": "copy", "to_scope": "project_shared"})
```

설치된 버전의 액션 카탈로그는 MCP 클라이언트에서 `mem_do(action="help")`를 호출해 확인하세요.

## 자주 쓰는 액션

| 범주 | 예시 |
|---|---|
| 네임스페이스 | `ns_list`, `ns_set`, `ns_assign`, `ns_update`, `ns_rename`, `ns_delete` |
| 태그 | `tag_list`, `tag_rename`, `tag_merge`, `tag_delete` |
| 세션 | `session_start`, `session_end`, `session_list` |
| 스크래치 | `scratch_set`, `scratch_get`, `scratch_promote` |
| Context Gateway | `context_detect`, `context_init`, `context_generate`, `context_diff`, `context_sync`, `context_artifact_transfer` (스킬·에이전트·커맨드를 프로젝트·티어 간 이동/복사), `context_version`, `context_promote` |
| 유지보수 | `dedup_scan`, `dedup_merge`, `decay_scan`, `decay_expire`, `cleanup_orphans`, `auto_tag` |
| 가져오기 / 내보내기 | `export`, `import`, `import_obsidian`, `import_notion`, `ingest` |
| 분석 | `activity`, `timeline`, `eval`, `reflect` |

## 언제 모드를 바꿀까?

다음 경우에는 `core`를 유지하세요:

- memtomem을 에이전트에 처음 연결하는 중입니다.
- 프롬프트 / 도구 목록 오버헤드를 줄이고 싶습니다.
- 어떤 모드가 필요한지 아직 모릅니다.

MCP 클라이언트가 `mem_do` 라우팅보다 직접 도구 노출을 더 잘 다루면 `standard`를 사용하세요.

테스트, 문서화, 전체 도구 수동 점검이 필요할 때는 `full`을 사용합니다. `full`은 의도적으로 많은 도구를 한꺼번에 노출합니다.

## CLI 대응 명령

대부분의 일반 MCP 작업은 CLI 대응 명령이 있습니다:

| MCP | CLI |
|---|---|
| `mem_status` | `mm status` |
| `mem_add` | `mm add` |
| `mem_search` | `mm search` |
| `mem_index` | `mm index` |
| `mem_do(action="context_sync")` | `mm context sync` |
| `mem_do(action="schedule_list")` | `mm schedule list` |

에이전트가 도구 선택을 어려워하면 CLI 명령을 한 번 직접 실행한 뒤 같은 작업을 에이전트에게 요청하면 됩니다.
