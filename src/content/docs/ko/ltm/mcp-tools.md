---
title: MCP 도구
description: memtomem이 MCP 클라이언트에 기억 도구를 제공하는 방식.
---

memtomem은 LTM 기능을 MCP 도구로 제공합니다. 처음에는 기본값인 `core` 모드를 사용하세요. 자주 쓰는 도구만 목록에 표시하고 나머지는 `mem_do`를 통해 호출하므로 AI 도구가 살펴볼 목록이 작아집니다.

## 도구 모드

MCP 클라이언트 설정의 `MEMTOMEM_TOOL_MODE`로 모드를 지정합니다.

| 모드 | 노출 도구 | 권장 상황 |
|---|---|---|
| `core` (기본) | `mem_do` 포함 총 9개 | 대부분의 에이전트에 가장 좋은 기본값 |
| `standard` | `mem_do` 포함 38개 | 자주 쓰는 관리 도구를 직접 노출하고 싶을 때 |
| `full` | 현재 도구 99개 + 제거 예정 별칭 1개 | 디버깅, 문서화, 많은 도구를 잘 다루는 클라이언트 |

다음 예시는 MCP 서버만 수동으로 연결할 때 사용합니다. 클라이언트 플러그인이
이미 memtomem을 제공한다면 항목을 추가하기 전에
[AI 클라이언트 연결](/ko/guides/connect-ai-client/)에서 해당 클라이언트의
공존 규칙을 확인하세요.

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

`core` 모드에서는 일상적인 기억 작업에 필요한 도구만 표시됩니다.

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
| `mem_do` | 나머지 기능으로 요청 전달 |

AI 도구에 자연어로 작업을 요청하면 필요한 core 도구를 선택합니다.

## `mem_do`

`mem_do`는 나머지 기능을 호출하는 공통 도구입니다. `action`과 선택 사항인 `params`를 받습니다.

```text
mem_do(action="help")
mem_do(action="help", params={"category": "context"})
mem_do(action="schedule_list")
mem_do(action="context_diff", params={"scope": "project_shared"})
mem_do(action="context_artifact_transfer", params={"asset_type": "skill", "name": "my-skill", "mode": "copy", "to_scope": "project_shared"})
mem_do(action="version")
```

설치된 버전에서 사용할 수 있는 액션은 MCP 클라이언트에서 `mem_do(action="help")`를 호출해 확인하세요.

v0.3.12에는 현재 도구 99개가 등록되어 있습니다. Full 모드는 v0.5.0에서
제거할 `mem_context_migrate` 별칭도 유지하므로 이름은 총 100개입니다.
Pinned Context는 `mem_pinned_list/get/set/delete`와 `mem_context_compose`를
제공합니다. 검토 우선 흐름에는 `mem_formation_scan`과
`mem_candidate_propose/list/review/recover`가 있습니다. Full 모드에는 AI
도구의 복사본을 미리 확인한 뒤 가져오는 `mem_context_pull`과 Quality Lab에서
결정론적 재실행에 사용하는 `mem_quality_replay`도 포함됩니다.

`mem_do(action="version")`은 서버 버전, 기능 목록, 실제 임베딩·리랭커 실행
환경을 반환합니다. `runtime_profile`에는 빠진 선택 의존성이 표시되며 비밀값은
포함하지 않습니다.

`mem_candidate_propose(content, source, source_ref, idempotency_key)`는 민감
정보를 검사한 뒤 검토 대기 후보를 만듭니다. 장기 기억에는 바로 저장하지
않으며 승인된 후보만 일반 쓰기 단계로 넘어갑니다. 같은
`idempotency_key`에 다른 내용을 보내면 거부합니다.

## OpenCode

공개된 `opencode-memtomem@0.1.2` 플러그인에는 Core 0.3.12가 포함되어 있습니다.
OpenCode는 단수 `plugin` 키를 사용하며 `opencode plugin add` 명령은 없습니다:

```json
{"plugin": ["opencode-memtomem@0.1.2"]}
```

플러그인의 슬래시 명령과 스킬 없이 MCP 도구만 사용하려면
`opencode.json`에 로컬 서버를 설정합니다.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.3.12", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core"}
    }
  }
}
```

기존 수동 `mcp.memtomem` 항목은 플러그인의 기본 서버보다 우선하므로 서버
하나만 실행합니다. 수동 서버를 쓰려면 이 키를 정확히 유지하고, 플러그인
서버를 쓰려면 수동 항목을 제거하세요. `mcp."memtomem-local"`처럼 다른 키는
중복 제거되지 않아 서버 두 개가 실행됩니다. 가능한 구성은
[OpenCode 연결 안내](/ko/guides/connect-ai-client/#opencode)에서 모두 확인할
수 있습니다.

## 자주 쓰는 액션

| 범주 | 예시 |
|---|---|
| 네임스페이스 | `ns_list`, `ns_set`, `ns_assign`, `ns_update`, `ns_rename`, `ns_delete` |
| 태그 | `tag_list`, `tag_rename`, `tag_merge`, `tag_delete` |
| 세션 | `session_start`, `session_end`, `session_list` |
| 스크래치 | `scratch_set`, `scratch_get`, `scratch_promote` |
| Context Gateway | `context_detect`, `context_init`, `context_generate`, `context_diff`, `context_sync`, `context_pull`, `context_artifact_transfer` (스킬·에이전트·명령을 프로젝트·계층 간 이동/복사), `context_version`, `context_promote` |
| 유지보수 | `dedup_scan`, `dedup_merge`, `decay_scan`, `decay_expire`, `cleanup_orphans`, `auto_tag` |
| 가져오기 / 내보내기 | `export`, `import`, `import_obsidian`, `import_notion`, `ingest` |
| 품질 / 분석 | `quality_replay`, `activity`, `timeline`, `eval`, `reflect` |

<a id="언제-모드를-바꿀까"></a>

## 모드 선택

다음 경우에는 `core`를 유지하세요.

- memtomem을 AI 도구에 처음 연결합니다.
- 프롬프트와 도구 목록의 크기를 줄이고 싶습니다.
- 어떤 모드가 필요한지 아직 모릅니다.

MCP 클라이언트가 `mem_do`보다 개별 도구를 직접 호출하는 방식을 더 잘 다루면 `standard`를 사용하세요.

테스트, 문서화, 전체 도구 수동 점검이 필요할 때는 `full`을 사용합니다. `full`은 의도적으로 많은 도구를 한꺼번에 노출합니다.

## CLI 대응 명령

대부분의 MCP 작업에는 같은 기능을 하는 CLI 명령이 있습니다.

| MCP | CLI |
|---|---|
| `mem_status` | `mm status` |
| `mem_add` | `mm add` |
| `mem_search` | `mm search` |
| `mem_index` | `mm index` |
| `mem_do(action="context_sync")` | `mm context sync` |
| `mem_do(action="schedule_list")` | `mm schedule list` |

AI 도구가 적절한 도구를 고르지 못하면 CLI에서 한 번 직접 실행한 뒤 같은 작업을 다시 요청해 보세요.
