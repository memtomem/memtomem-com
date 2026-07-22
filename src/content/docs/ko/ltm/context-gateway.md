---
title: Context Gateway
description: 에이전트, 스킬, 커맨드를 한 번 정의하고 여러 AI 런타임에 동기화합니다.
---

Claude Code에서 작성한 스킬을 Codex나 Cursor에서도 그대로 쓰고 싶거나, 같은 커맨드 세트를 여러 프로젝트에서 재사용하고 싶을 때가 있습니다. Context Gateway는 원본을 **Store**(`.memtomem/` 또는 사용자 Store)에 보관하고, Store 아티팩트를 선택한 런타임으로 **Push**하며, 런타임 복사본은 미리보기 우선 흐름으로 Store에 **Pull**합니다.

LTM 0.3.0부터 Context Gateway는 한 프로젝트 안에서 한 방향으로만 내보내던 도구를 넘어섰습니다. 이제 프로젝트와 계층(티어) 사이에서 항목(아티팩트: 에이전트·스킬·커맨드)을 옮기거나 복사하고, 여러 프로젝트를 한 번에 동기화하며, 재사용할 항목을 모아 두는 정규 wiki까지 아우르는 중심 기능입니다.

## 해결하는 문제

AI 런타임마다 컨텍스트 파일 위치와 포맷이 다릅니다:

| 런타임 | 예시 런타임 파일 |
|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md` |
| Codex CLI | `.agents/skills/*/SKILL.md`, `.codex/agents/*` |
| Antigravity CLI | `.gemini/agents/*`, `.gemini/skills/*`, `.gemini/commands/*` |
| 기타 MCP 클라이언트 / 프레임워크 | 런타임별 에이전트 정의 위치가 다름 |

정규 계층이 없으면 각 런타임 복사본이 쉽게 어긋납니다. Context Gateway를 사용하면 정규 파일을 한 번 수정하고 각 AI 런타임 경로로 동기화합니다.

## 첫 워크플로우

프로젝트 루트에서 실행합니다:

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

| 명령 | 목적 |
|---|---|
| `detect` | memtomem이 볼 수 있는 기존 런타임 파일 표시 |
| `init` | `.memtomem/` 아래 정규 파일 생성 |
| `sync` | Store 파일을 각 런타임 경로로 Push. `--runtime`으로 대상 제한 가능 |
| `diff` | 정규 파일과 런타임 복사본의 동기화 상태 확인 |

이동/복사, 다중 프로젝트, 버전 등 전체 명령 목록은 [CLI 레퍼런스](/ko/ltm/cli/)를 참고하세요.

## 정규 티어

Context Gateway는 기억을 쓸 때와 같은 세 가지 **계층(티어)**을 사용합니다. UI에는 익숙한 라벨(User / Project (shared) / Project (local))로 표시되고, 아래 `scope` 값은 CLI 플래그에서 씁니다:

| 티어 (CLI scope) | UI 라벨 | 정규 위치 | 적합한 용도 |
|---|---|---|---|
| `user` | User | `~/.memtomem/<artifact>/...` | 여러 프로젝트에서 재사용하는 개인 에이전트, 스킬, 커맨드 |
| `project_shared` | Project (shared) | `<project>/.memtomem/<artifact>/...` | git에 커밋할 팀 공유 프로젝트 컨텍스트 |
| `project_local` | Project (local) | `<project>/.memtomem/<artifact>.local/...` | 한 체크아웃에서만 쓰는 비공개 초안 |

`user` 티어는 능동 관리되는 전역 라이브러리입니다. 이 경로는 프로젝트 바깥의 홈 디렉터리에 쓰므로, 모든 user 티어 쓰기는 "프로젝트 외부에 쓸까요?" 확인 단계를 거칩니다. 게이트웨이가 실제로 건드릴 홈 디렉터리 파일 목록을 먼저 보여주고, 승인한 뒤에야 씁니다. 이 확인은 기능 플래그가 아니라 호스트 쓰기 안전 경계입니다.

`project_local` 정규 파일은 git에 올라가지 않으며(gitignore 처리), 에이전트 / 스킬 / 커맨드 런타임 경로로도 동기화되지 않습니다.

`project_shared`는 git으로 추적되므로 비밀값을 넣어서는 안 됩니다. 0.3.0의 동기화와 전송은 비밀값이 감지되면 `project_shared` 쓰기를 강제로 거부하며, `--force` 우회 밸브가 없습니다(git 히스토리는 영구적이기 때문입니다). `user`나 `project_local` 티어에서는 검토 후 재정의가 가능하지만, `project_shared`는 어떤 경우에도 거부합니다.

## 자주 쓰는 레시피

### 프로젝트 에이전트를 팀과 공유

```bash
mm context init --include agents --scope project_shared --confirm-project-shared
mm context sync --include agents --scope project_shared
```

생성된 `.memtomem/agents/` 파일은 검토 후 커밋합니다.

### 개인 스킬을 여러 프로젝트에서 사용

```bash
mm context init --include skills --scope user
mm context sync --include skills --scope user
```

정규 스킬은 `~/.memtomem/skills/` 아래에 저장되고, 지원되는 사용자 런타임 경로로 동기화됩니다(첫 쓰기 시 호스트 쓰기 확인 단계를 거칩니다).

### 공유 전 로컬에서 초안 작성

```bash
mm context init --include agents --scope project_local
mm context diff --include agents --scope project_local
```

`project_local` 정규 파일은 gitignored이며 런타임 경로로 동기화되지 않습니다. 준비가 끝나면 `mm context move`로 `project_shared`로 옮긴 뒤 `mm context sync --scope project_shared`를 실행합니다.

### 기존 런타임 파일을 Store로 Pull

이미 특정 런타임에서 직접 작성한 에이전트나 스킬이 있다면 Store로 Pull합니다. 단일 아티팩트 Pull은 기본적으로 미리보기이며 소스 런타임을 선택할 수 있습니다:

```bash
mm context detect --include agents,skills
mm context pull skills reviewer --from claude
mm context pull skills reviewer --from claude --diff
mm context pull skills reviewer --from claude --scope project_shared --apply
```

Store가 이미 해당 아티팩트를 소유한다면 `--overwrite`를 추가합니다. 교체 전에 현재 Store payload가 버전 이력에 스냅샷됩니다. 커밋 전에 생성된 파일을 검토하세요. 초기 discovery에는 section-level batch Pull과 `mm context init`도 남아 있지만, 여러 런타임에 같은 이름이 있을 때는 이름을 지정한 Pull이 가장 명확합니다.

## 프로젝트·티어 간 이동과 복사

0.3.0은 단방향 모델을 넘어, 하나의 정규 아티팩트(`agents` / `commands` / `skills`)를 티어 사이나 프로젝트 사이로 옮기거나 복사하는 전송 엔진을 제공합니다:

```bash
# 한 스킬을 user 티어로 옮김 (원본 정리)
mm context move skills my-skill --to user

# 다른 프로젝트로 복사 (원본 유지, 이름 변경 가능)
mm context copy agents reviewer --to-project <project> --as reviewer-v2
```

- `move`는 원본을 소비하고 원본의 오래된 런타임 복사본을 정리합니다.
- `copy`는 원본을 건드리지 않으며, `--as`로 이름을 바꿔 복사할 수 있습니다.
- 모든 전송은 기본적으로 실제로 바꾸지 않는 미리보기(dry-run)이며, 실행하려면 `--apply`를 붙입니다.
- 대상 충돌은 항상 거부되며 `--force` 밸브가 없습니다.
- `project_shared`로 들어가는 전송은 비밀값 스캔을 거치고 `--confirm-project-shared`를 요구합니다.
- 모든 성공한 전송은 이어서 실행할 `mm context sync` 명령을 출력합니다.

MCP 액션 `mem_context_artifact_transfer`로 헤드리스 환경에서도 동일하게 수행할 수 있습니다.

## 여러 프로젝트 관리

여러 프로젝트를 등록해 공유 아티팩트를 일괄 동기화하거나, 전체 프로젝트의 드리프트를 한 번에 점검할 수 있습니다. 모든 다중 프로젝트 작업은 `project_shared` 티어를 대상으로 합니다:

```bash
mm context projects list
mm context projects add <path>
mm context projects pause <selector>
mm context projects resume <selector>

# 등록된 모든 프로젝트에 일괄 동기화 (단일 락 윈도우)
mm context sync --all-projects

# 어떤 프로젝트가 어긋났는지 읽기 전용으로 점검
mm context status --all-projects
```

일시 정지된 프로젝트와 동기화 대상이 아닌 프로젝트는 건너뜁니다. 웹 UI에서는 프로젝트를 동기화 대상으로 등록하는 동작이 **Activate**("Project activated for sync")로 표시됩니다.

## MCP 서버 정의

에이전트 / 스킬 / 커맨드 외에 MCP 서버 정의도 게이트웨이가 관리합니다. 정규 정의를 `.memtomem/mcp-servers/<name>.json`에 두고 프로젝트의 `.mcp.json`으로 동기화합니다:

```bash
# 정규 MCP 서버 정의를 .mcp.json으로 동기화 (opt-in)
mm context sync --include=mcp-servers

# 다른 프로젝트로 정의 복사
mm context copy mcp-servers <name> --to-project <project>
```

`mcp-servers` 동기화는 명시적으로 켜야 동작합니다(opt-in; 일반 `mm context sync`는 `.mcp.json`을 건드리지 않습니다). 다른 항목과 동일한 비밀값 안전 검사가 적용되므로, 비밀값은 `env` 블록에 직접 넣지 말고 `${VAR}` 참조를 사용합니다. 현재는 `project_shared` 티어의 stdio 서버만 지원합니다.

## 버전 스냅샷

에이전트와 커맨드에는 버전 히스토리와 이동 가능한 라벨(production / staging 등)을 둘 수 있습니다:

```bash
mm context version create agents reviewer --note "초기 버전"
mm context version promote agents reviewer --label production
mm context version list agents reviewer
```

라벨이 가리키는 버전을 동기화하도록 sync를 구성할 수 있습니다. 전체 플래그는 [CLI 레퍼런스](/ko/ltm/cli/)를 참고하세요.

## 정규 wiki

호스트 전역 wiki(`~/.memtomem-wiki/`)에서 재사용 가능한 아티팩트를 한 번 작성한 뒤, `mm context install`로 프로젝트에 설치합니다. 각 아티팩트는 격리된 git 커밋으로 저장되며, `remote`/`push`/`pull`로 백업하고 여러 기기 사이에서 동기화할 수 있습니다:

```bash
mm wiki init
mm wiki skill commit my-skill --canonical
mm wiki remote <url>
mm wiki push
```

브라우저에서 직접 편집할 수도 있으며, 저장했지만 커밋하지 않은 변경은 내비게이션 배지로 표시됩니다.

## 변환 손실 처리

대상 런타임이 어떤 필드를 정확히 표현할 수 없으면 memtomem은 손실 정도를 분류합니다:

| 심각도 | 동작 |
|---|---|
| `ignore` | 지원하지 않는 필드를 건너뜀 |
| `warn` | 경고 출력 후 계속 |
| `error` | 변환 중단 |

## Web UI

```bash
mm web --open
```

Web UI에서는 **Gateway** 아래에 Overview, Projects, Skills, Commands, Subagents, MCP Servers, Hooks, Wiki 화면이 있습니다. 각 행은 CLI와 같은 Store 모델을 사용합니다:

- **Push** — 확인 후 Store 복사본을 하나 이상의 런타임으로 보냅니다.
- **Pull** — 런타임 복사본을 Store로 가져오기 전에 미리보기를 보여주며, 후보가 충돌하면 소스를 명시적으로 선택합니다.

상세 그리드에는 프로젝트·티어 필터, 런타임 대상 선택, 드리프트 상태, 다중 프로젝트 활성화가 표시됩니다. 한 번 Pull한 뒤에는 Store를 정본으로 보고, Store에서 수정한 뒤 검토된 버전을 Push하세요.

## 다음 단계

- [CLI 레퍼런스](/ko/ltm/cli/) — 전체 `mm context` · `mm wiki` 명령 목록
- [MCP 도구](/ko/ltm/mcp-tools/) — `mem_do`를 통한 context 액션
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 여러 에이전트를 위한 기억 네임스페이스
