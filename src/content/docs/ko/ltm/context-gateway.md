---
title: Context Gateway
description: 에이전트, 스킬, 명령의 기준본을 여러 AI 도구와 프로젝트에 배포합니다.
---

Claude Code에서 만든 스킬을 Codex나 Cursor에서도 사용하거나 같은 명령을 여러 프로젝트에서 재사용할 수 있습니다. Context Gateway는 **Store**에 기준본을 보관합니다. **Push**는 기준본을 선택한 실행 환경으로 보내고, **Pull**은 실행 환경의 파일을 미리 확인한 뒤 Store로 가져옵니다. Store는 `.memtomem/` 또는 사용자 Store에 있습니다.

Context Gateway는 에이전트·스킬·명령 같은 항목을 프로젝트와 계층(티어) 사이에서 옮기거나 복사합니다. 여러 프로젝트를 한 번에 동기화할 수 있고, 자주 쓰는 항목은 공용 위키에 모아 재사용할 수 있습니다.

## 해결하는 문제

AI 도구마다 컨텍스트 파일의 위치와 형식이 다릅니다.

| AI 도구 | 파일 위치 예시 |
|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md` |
| Codex CLI | `.agents/skills/*/SKILL.md`, `.codex/agents/*` |
| Antigravity CLI | `.gemini/agents/*`, `.gemini/skills/*`, `.gemini/commands/*` |
| 기타 MCP 클라이언트 / 프레임워크 | 클라이언트마다 에이전트 정의 위치가 다름 |

기준본이 없으면 도구마다 저장된 파일의 내용이 달라지기 쉽습니다. Context Gateway에서는 기준본을 한 번 수정한 뒤 각 AI 도구의 경로로 보냅니다.

## 첫 워크플로우

프로젝트 루트에서 실행합니다.

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

| 명령 | 목적 |
|---|---|
| `detect` | memtomem이 찾은 기존 AI 도구 파일 표시 |
| `init` | `.memtomem/` 아래 기준본 생성 |
| `sync` | Store 파일을 각 AI 도구 경로로 Push. `--runtime`으로 대상 제한 가능 |
| `diff` | 기준본과 AI 도구 복사본의 동기화 상태 확인 |

이동/복사, 다중 프로젝트, 버전 등 전체 명령 목록은 [CLI 레퍼런스](/ko/ltm/cli/)를 참고하세요.

<a id="정규-티어"></a>
## 기준본을 보관하는 계층

Context Gateway는 세 가지 **계층(티어)**에 기준본을 보관합니다. UI에는 User, Project (shared), Project (local)로 표시됩니다. CLI에서는 다음 `scope` 값을 사용합니다.

| 계층 (CLI `scope`) | UI 라벨 | 기준본 위치 | 적합한 용도 |
|---|---|---|---|
| `user` | User | `~/.memtomem/<artifact>/...` | 여러 프로젝트에서 재사용하는 개인 에이전트, 스킬, 명령 |
| `project_shared` | Project (shared) | `<project>/.memtomem/<artifact>/...` | git에 커밋할 팀 공유 프로젝트 컨텍스트 |
| `project_local` | Project (local) | `<project>/.memtomem/<artifact>.local/...` | 한 체크아웃에서만 쓰는 비공개 초안 |

`user` 계층은 여러 프로젝트에서 사용하는 개인 라이브러리입니다. 홈 디렉터리에 파일을 쓰기 때문에 먼저 "프로젝트 외부에 쓸까요?"라고 확인합니다. Context Gateway는 수정할 파일 목록을 보여 준 뒤 사용자가 승인해야 저장합니다. 이 단계는 기능 설정이 아니라 프로젝트 밖 쓰기를 보호하는 안전장치입니다.

`project_local` 기준본은 git에 포함되지 않으며(gitignore 처리) AI 도구의 에이전트·스킬·명령 경로로도 보내지지 않습니다.

`project_shared`는 git으로 추적되므로 비밀값을 넣으면 안 됩니다. 비밀값이 발견되면 쓰기를 거부하며 `--force`로 우회할 수 없습니다. git 이력에 비밀값이 남을 수 있기 때문입니다. `user`와 `project_local`에서는 내용을 확인한 뒤 다시 시도할 수 있지만 `project_shared`에는 저장할 수 없습니다.

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

스킬 기준본은 `~/.memtomem/skills/`에 저장되고 지원되는 AI 도구의 사용자 경로로 전송됩니다. 처음 저장할 때는 홈 디렉터리에 쓸 파일을 확인합니다.

### 공유 전 로컬에서 초안 작성

```bash
mm context init --include agents --scope project_local
mm context diff --include agents --scope project_local
```

`project_local` 기준본은 git에 포함되지 않고 AI 도구 경로로도 전송되지 않습니다. 준비가 끝나면 `mm context move`로 `project_shared`에 옮기고 `mm context sync --scope project_shared`를 실행하세요.

<a id="기존-런타임-파일을-store로-pull"></a>
### 기존 AI 도구의 파일을 Store로 Pull

특정 AI 도구에서 직접 만든 에이전트나 스킬은 Pull로 Store에 가져올 수 있습니다. 항목 하나를 Pull하면 기본적으로 변경 내용을 미리 보여 주며, 가져올 AI 도구도 선택할 수 있습니다.

```bash
mm context detect --include agents,skills
mm context pull skills reviewer --from claude
mm context pull skills reviewer --from claude --diff
mm context pull skills reviewer --from claude --scope project_shared --apply
```

Store에 같은 항목이 이미 있다면 `--overwrite`를 추가합니다. 교체하기 전에 현재 기준본을 버전 이력에 저장합니다. 실제로 적용하기 전에 생성될 파일을 확인하세요. 처음 항목을 찾을 때는 종류별 일괄 Pull이나 `mm context init`도 사용할 수 있습니다. 여러 AI 도구에 같은 이름이 있다면 항목 이름과 가져올 도구를 직접 지정하는 편이 안전합니다.

<a id="프로젝트티어-간-이동과-복사"></a>
## 프로젝트·계층 간 이동과 복사

기준 항목(`agents` / `commands` / `skills`)은 계층이나 프로젝트 사이에서 옮기고 복사할 수 있습니다.

```bash
# 한 스킬을 user 티어로 옮김 (원본 정리)
mm context move skills my-skill --to user

# 다른 프로젝트로 복사 (원본 유지, 이름 변경 가능)
mm context copy agents reviewer --to-project <project> --as reviewer-v2
```

- `move`는 원본을 삭제하고 이전 위치에 남은 AI 도구의 복사본도 정리합니다.
- `copy`는 원본을 건드리지 않으며, `--as`로 이름을 바꿔 복사할 수 있습니다.
- 모든 전송은 기본적으로 변경 내용을 보여 주는 미리보기 실행입니다. 실제로 적용하려면 `--apply`를 붙입니다.
- 대상에 같은 이름이 있으면 거부하며 `--force`로 덮어쓸 수 없습니다.
- `project_shared`로 들어가는 전송은 비밀값 스캔을 거치고 `--confirm-project-shared`를 요구합니다.
- 모든 성공한 전송은 이어서 실행할 `mm context sync` 명령을 출력합니다.

UI가 없는 환경에서는 MCP 액션 `mem_context_artifact_transfer`로 같은 작업을 실행할 수 있습니다.

## 여러 프로젝트 관리

여러 프로젝트를 등록하면 공유 항목을 한꺼번에 동기화하고 프로젝트별 불일치를 확인할 수 있습니다. 다중 프로젝트 작업은 `project_shared` 계층만 대상으로 합니다.

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

에이전트·스킬·명령뿐 아니라 MCP 서버 정의도 관리할 수 있습니다. 기준본은 `.memtomem/mcp-servers/<name>.json`에 두고 프로젝트의 `.mcp.json`으로 보냅니다.

```bash
# MCP 서버 기준본을 .mcp.json으로 동기화 (직접 지정할 때만 실행)
mm context sync --include=mcp-servers

# 다른 프로젝트로 정의 복사
mm context copy mcp-servers <name> --to-project <project>
```

`mcp-servers` 동기화는 직접 지정해야 실행됩니다. 일반 `mm context sync`는 `.mcp.json`을 수정하지 않습니다. 다른 항목과 마찬가지로 비밀값을 검사하므로 `env`에 값을 직접 넣지 말고 `${VAR}` 참조를 사용하세요. 현재는 `project_shared` 계층의 `stdio` 서버만 지원합니다.

## 버전 스냅샷

에이전트와 명령에는 버전 이력과 이동 가능한 라벨(production / staging 등)을 둘 수 있습니다.

```bash
mm context version create agents reviewer --note "초기 버전"
mm context version promote agents reviewer --label production
mm context version list agents reviewer
```

라벨이 가리키는 버전을 보내도록 동기화 설정을 바꿀 수 있습니다. 전체 플래그는 [CLI 레퍼런스](/ko/ltm/cli/)를 참고하세요.

<a id="정규-wiki"></a>
## 공용 위키

공용 위키(`~/.memtomem-wiki/`)에 재사용할 항목을 만들고 `mm context install`로 프로젝트에 설치합니다. 각 항목은 별도 git 커밋으로 저장됩니다. `remote`, `push`, `pull`로 백업하거나 여러 기기에서 동기화할 수 있습니다.

```bash
mm wiki init
mm wiki skill commit my-skill --canonical
mm wiki remote <url>
mm wiki push
```

브라우저에서 직접 편집할 수도 있으며, 저장했지만 커밋하지 않은 변경은 내비게이션 배지로 표시됩니다.

## 변환 손실 처리

대상 AI 도구가 일부 필드를 표현하지 못하면 memtomem은 손실 정도에 따라 처리합니다.

| 심각도 | 동작 |
|---|---|
| `ignore` | 지원하지 않는 필드를 건너뜀 |
| `warn` | 경고 출력 후 계속 |
| `error` | 변환 중단 |

## Web UI

```bash
mm web --open
```

Web UI의 **Gateway** 아래에는 Overview, Projects, Skills, Commands, Subagents, MCP Servers, Hooks, Wiki 화면이 있습니다. 각 항목은 CLI와 같은 Store 모델을 사용합니다.

- **Push** — 확인 후 Store 기준본을 하나 이상의 AI 도구로 보냅니다.
- **Pull** — AI 도구의 복사본을 Store로 가져오기 전에 변경 내용을 보여 줍니다. 후보가 겹치면 가져올 도구를 직접 선택합니다.

상세 표에서는 프로젝트·계층 필터, 대상 AI 도구, 불일치 상태, 다중 프로젝트 활성화 여부를 확인할 수 있습니다. Pull을 마친 뒤에는 Store의 기준본을 수정하고, 검토한 버전을 Push하세요.

## 다음 단계

- [CLI 레퍼런스](/ko/ltm/cli/) — 전체 `mm context` · `mm wiki` 명령 목록
- [MCP 도구](/ko/ltm/mcp-tools/) — `mem_do`를 통한 context 액션
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 여러 에이전트를 위한 기억 네임스페이스
