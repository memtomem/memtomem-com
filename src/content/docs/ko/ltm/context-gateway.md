---
title: Context Gateway
description: 에이전트, 스킬, 커맨드를 한 번 정의하고 여러 AI 런타임에 동기화합니다.
---

Context Gateway는 런타임별 에이전트 파일을 하나의 정규 `.memtomem/` 소스에서 동기화합니다. 여러 AI 런타임을 함께 쓰거나, 같은 스킬/커맨드 세트를 모든 체크아웃에서 사용하고 싶을 때 유용합니다.

## 해결하는 문제

AI 런타임마다 컨텍스트 파일 위치와 포맷이 다릅니다:

| 런타임 | 예시 런타임 파일 |
|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md` |
| Codex CLI | `.agents/agents/*.toml`, `.agents/skills/*/SKILL.md` |
| Gemini CLI | `.gemini/agents/*.md`, `.gemini/skills/*/SKILL.md`, `.gemini/commands/*.toml` |
| Cursor / Windsurf / Claude Desktop | 런타임별 에이전트 정의 위치가 다름 |

정규 계층이 없으면 각 런타임 복사본이 쉽게 어긋납니다. Context Gateway를 사용하면 정규 파일을 수정하고 바깥 런타임 경로로 동기화합니다.

## 첫 워크플로우

프로젝트 루트에서 실행합니다:

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

각 명령의 역할:

| 명령 | 목적 |
|---|---|
| `detect` | memtomem이 볼 수 있는 기존 런타임 파일 표시 |
| `init` | `.memtomem/` 아래 정규 파일 생성 |
| `sync` | 정규 파일을 런타임별 경로로 fan-out |
| `diff` | 정규 파일과 런타임 복사본의 동기화 상태 확인 |

## 정규 티어

Context Gateway는 기억 쓰기와 같은 세 가지 티어 이름을 사용합니다:

| 티어 | 정규 위치 | 적합한 용도 | 런타임 fan-out |
|---|---|---|---|
| `user` | `~/.memtomem/<artifact>/...` | 여러 프로젝트에서 재사용하는 개인 에이전트, 스킬, 커맨드 | 사용자 런타임 경로 |
| `project_shared` | `<project>/.memtomem/<artifact>/...` | git에 커밋할 팀 공유 프로젝트 컨텍스트 | 프로젝트 런타임 경로 |
| `project_local` | `<project>/.memtomem/<artifact>.local/...` | 한 체크아웃에서만 쓰는 비공개 초안 | 에이전트, 스킬, 커맨드는 fan-out 없음 |

`project_shared`는 "git으로 추적됨"을 뜻합니다. 비밀값, 인증정보, 개인 초안, 검토 전 프롬프트는 넣지 마세요. 로컬에만 남겨야 하는 내용은 `user` 또는 `project_local`을 사용합니다.

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

정규 스킬은 `~/.memtomem/skills/` 아래에 저장되고, 지원되는 사용자 런타임 경로로 fan-out됩니다.

### 공유 전 로컬에서 초안 작성

```bash
mm context init --include agents --scope project_local
mm context status --scope project_local
```

`project_local` 정규 파일은 gitignored이며 에이전트 / 스킬 / 커맨드 런타임 경로로 fan-out되지 않습니다. 준비가 끝나면 파일을 `project_shared`로 승격한 뒤 `mm context sync --scope project_shared`를 실행합니다.

### 기존 런타임 파일에서 정규 파일 시드

이미 특정 런타임에서 직접 작성한 에이전트나 스킬이 있다면 대상 티어를 지정해 `init`을 실행합니다. `init`은 정규 파일을 만들고, 감지된 런타임 파일을 가능한 경우 가져옵니다:

```bash
mm context detect --include agents,skills
mm context init --include agents,skills --scope project_shared --confirm-project-shared
mm context diff --include agents,skills --scope project_shared
```

커밋 전에 생성된 정규 파일을 검토하세요.

## 동기화 방식

```
.memtomem/                  # 정규 소스
├── agents/
├── skills/
└── commands/

     mm context sync

.claude/                    # Claude Code 런타임 파일
.agents/                    # Codex 호환 런타임 파일
.gemini/                    # Gemini 런타임 파일
```

`sync`는 정규 파일에서 런타임 파일로 가는 단방향 변환입니다. 기존 런타임 파일에서 정규 파일을 시드하려면 `mm context init`에 `--include`를 함께 사용합니다.

대상 런타임이 어떤 필드를 정확히 표현할 수 없으면 memtomem은 손실 정도를 분류합니다:

| 심각도 | 동작 |
|---|---|
| `ignore` | 지원하지 않는 필드를 건너뜀 |
| `warn` | 경고 출력 후 계속 |
| `error` | 변환 중단 |

## Web UI & Context Portal

Web UI 대시보드 실행:

```bash
mm web --open
```

기본적으로 Context Gateway는 **Context Portal**(프로젝트 포털) 화면으로 연결됩니다. 다음 기능을 제공합니다:
- 등록된 MCP 클라이언트와 활성 프로젝트/티어 선택을 보여주는 통합 뷰.
- 클라이언트/런타임 등록 상태 및 활성 파일 표시.
- 한 번의 실행으로 등록된 모든 런타임에 정규 설정을 반영하는 **Sync All** 기능 (단계별 실시간 진행 상황 툴팁 제공).

## Sync Enrollment (동기화 등록)

Context Gateway는 프로젝트 감지와 실제 동기화 단계를 분리하여 작동합니다. 기존 프로젝트는 자동으로 감지되지만, 사용자가 명시적으로 **등록(enroll)**하기 전까지는 동기화가 실행되지 않습니다:
- **등록, 일시 정지 및 재개(Enroll, Pause, Resume)**: UI에서 각 프로젝트의 동기화 활성 상태를 자유롭게 제어할 수 있습니다.
- **쓰기 제한**: 일시 정지되었거나 등록되지 않은 프로젝트는 동기화 쓰기 작업이 제한됩니다. 에디터 런타임이나 API에서 쓰기를 시도하면 `409 Conflict` 응답과 함께 세부 정보가 차단됩니다.

## Artifact Versioning (아티팩트 버전 관리 - ADR-0022)

정규 에이전트와 명령어 파일에 대해 단일 플랫 파일 대신 Git 스타일의 버전 스냅샷과 라벨 포인터를 사용할 수 있습니다.

- **버전 스냅샷**: 수정 가능한 정규 아티팩트 파일을 불변 스냅샷(예: `v1`, `v2`)으로 동결하고 설명을 남길 수 있습니다.
- **라벨 포인터**: 특정 버전 스냅샷을 가리키는 이동 가능한 포인터(예: `production`, `staging`)를 지정합니다.
- **예약된 `latest` 라벨**: `latest` 라벨은 예약된 읽기 전용 라벨입니다. 항상 현재 활성화되어 작업 중인 정규 파일을 가리키며, promote 명령을 통해 대상을 변경할 수 없습니다.
- **버전 동기화**: CLI 명령에서 `--label <이름>` (예: `mm context sync --label production` 또는 `mm context generate --label production`)을 전달하여 활성 작업 파일 대신 특정 버전/라벨을 배포할 수 있습니다.
- **개별 도구**: `full` 모드에서는 버전 스냅샷 생성 및 라벨 관리를 위한 개별 MCP 도구인 `mem_context_version` 및 `mem_context_promote`가 직접 제공됩니다.

## 다음 단계

- [CLI 레퍼런스](/ko/ltm/cli/) — 전체 `mm context` 명령 목록
- [MCP 도구](/ko/ltm/mcp-tools/) — context 액션
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 여러 에이전트를 위한 기억 네임스페이스
