---
title: CLI 레퍼런스
description: memtomem LTM 서버를 설정하고 운영하는 mm CLI 명령 전체.
---

`mm`은 `memtomem` 패키지와 함께 설치됩니다. 설정, 검색, 색인, 세션 기록, 프로젝트 간 컨텍스트 동기화를 관리합니다. 전체 명령은 `mm --help`, 설치된 버전은 `mm --version` 또는 `mm version`으로 확인하세요.

> 이 페이지는 memtomem v0.3.12를 기준으로 지원하는 명령을 기능별로 정리했습니다.

## 전체 명령 인덱스

지원하는 최상위 명령을 빠짐없이 정리했습니다. 각 명령의 옵션과 입력 형식은 설치된 버전에서 `mm <command> --help`로 확인하세요.

| 그룹 | 명령 |
|---|---|
| 설정 / 데이터 | `init`, `config`, `add`, `index`, `ingest`, `mem`, `memory` |
| 검색 / UI | `search`, `recall`, `tags`, `pinned`, `shell`, `web` |
| 실행 환경 컨텍스트 | `context`, `wiki`, `sync-doctor` |
| 협업 | `session`, `activity`, `agent`, `review` |
| 평가 / 운영 | `status`, `quality`, `warmup`, `watchdog`, `schedule` |
| 라이프사이클 | `gc`, `embedding-reset`, `purge`, `reset`, `upgrade`, `uninstall`, `version` |

명령 그룹별 하위 명령도 모두 나열합니다.

| 그룹 | 하위 명령 |
|---|---|
| `activity` | `log` |
| `agent` | `list`, `migrate`, `register`, `share` |
| `config` | `set`, `show`, `unset` |
| `context` | `adopt`, `copy`, `detect`, `diff`, `generate`, `init`, `install`, `memory-migrate`, `migrate`, `move`, `projects`, `pull`, `rescan`, `settings-copy`, `settings-doctor`, `settings-migrate`, `status`, `sync`, `update`, `version` |
| `context projects` | `add`, `list`, `pause`, `remove`, `resume` |
| `gc` | `orphan-projects`, `orphan-sources` |
| `ingest` | `claude-memory`, `codex-memory`, `gemini-memory` |
| `mem` | `init`, `rescan`, `rescan-files` |
| `memory` | `doctor` |
| `pinned` | `compose`, `delete`, `get`, `list`, `set` |
| `quality` | `cases`, `compare`, `experiment`, `export`, `gate`, `import`, `promote`, `replay`, `show`, `status` |
| `review` | `approve`, `list`, `recover`, `reject`, `scan`, `show` |
| `schedule` | `add`, `delete`, `list`, `run-now` |
| `session` | `end`, `events`, `list`, `start`, `wrap` |
| `tags` | `delete`, `list`, `merge`, `rename` |
| `watchdog` | `history`, `run`, `status` |
| `web` | `status`, `stop` |
| `wiki` | `agent`, `command`, `init`, `list`, `pull`, `push`, `remote`, `skill` |
| `wiki agent/command/skill` | `commit`, `diff`, `lint`, `new`, `override`, `promote` |

`mm web`은 UI를 실행하고 `mm web status`와 `mm web stop`은 실행 상태를 관리합니다.

## 설정

### `mm init`

대화형 설정 마법사를 실행합니다. 임베딩 제공자, 데이터베이스 경로, 토크나이저, 리랭커, 기본 네임스페이스를 설정합니다.

설정 마법사는 먼저 **프리셋 선택 화면**(Minimal / English (Recommended) / Korean-optimized)을 보여 줍니다. 프리셋은 임베딩·리랭커·토크나이저·네임스페이스 기본값을 한 번에 적용합니다. 입력 없이 실행하려면 `--preset <name>`을 지정하세요. `--advanced`는 프리셋 선택을 건너뛰고 10단계 전체 설정을 엽니다.

```bash
mm init                              # 대화형 설정 + 프리셋 선택
mm init --non-interactive            # 자동 수락; `--preset minimal --non-interactive`와 동일
mm init --preset korean              # 한국어 프리셋을 비대화 모드로 적용
mm init --preset english --non-interactive   # 영어 프리셋, 프롬프트 없음
mm init --advanced                   # 프리셋 선택 생략, 10단계 전체 마법사
mm init --fresh                      # 누적 설정 일괄 정리 후 마법사 재실행
```

재설치 후 `mm init`을 실행하면 기존 `~/.memtomem/memtomem.db`에 저장된 임베딩 제공자·모델·차원이 새 프리셋과 맞는지 검사합니다. 값이 다르면 대화형 모드에서는 벡터 인덱스(`chunks_vec`)를 다시 만드는 방법을 안내합니다. `--non-interactive`에서는 `mm embedding-reset --mode apply-current`를 안내합니다. 청크 테이블은 그대로 남으므로 이후 `mm index <path>`로 다시 색인하면 검색 데이터를 복구할 수 있습니다.

`--fresh`는 마법사가 다루지 않는 사용자 설정을 제거하고 설정을 다시 시작합니다. 이전 버전에서 남은 값을 한꺼번에 정리할 때 사용합니다. 기존 `config.json`은 `config.json.bak-<unix-ts>`로 백업한 뒤 다시 작성합니다.

### MCP 서버 실행

MCP 서버 실행 파일은 `memtomem-server`입니다. 일반적으로 직접 실행할 필요는 없습니다. Claude Desktop, Claude Code, Cursor 같은 MCP 클라이언트가 설정에 따라 자동으로 실행합니다. 등록 예시는 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.

MCP 클라이언트에 표시할 도구 범위는 `env`의 `MEMTOMEM_TOOL_MODE`(`core` / `standard` / `full`)로 정합니다. 기본 `core`는 핵심 도구 8개와 `mem_do`를 합쳐 9개를 표시합니다. `full`은 현재 도구 99개와 제거 예정인 `mem_context_migrate` 별칭 1개를 표시합니다. 자세한 목록은 [MCP 도구](/ko/ltm/mcp-tools/)를 참고하세요.

v0.1.25부터 MCP 연결만으로는 `~/.memtomem/memtomem.db`를 만들지 않습니다. DB는 도구를 처음 호출할 때 엽니다. 서버 pid/flock 파일은 `$XDG_RUNTIME_DIR/memtomem/server.pid`에 두며, 플랫폼에 따라 `$TMPDIR/memtomem-$UID/`를 사용합니다. 도구를 호출하지 않으면 홈 디렉터리에 파일을 남기지 않습니다.

### `mm config show / set / unset`

`mm config show`는 현재 설정을 표시하며 API 키는 자동으로 가립니다. `--json` 또는 `--format json`은 전체 설정을 JSON으로 출력합니다. `mm config set <key> <value>`는 사용자 값을 추가합니다. `mm config unset <keys...>`은 사용자 값을 제거해 내장 기본값이나 `config.d/*.json` 조각의 값으로 되돌립니다.

```bash
mm config show                       # 읽기 좋은 테이블
mm config show --json                # 스크립트용 JSON
mm config set search.default_top_k 20
mm config set rerank.model bge-reranker-base
mm config unset indexing.memory_dirs
mm config unset rerank.model search.default_top_k
```

`mm config unset`은 여러 번 실행해도 결과가 같습니다. 없는 키를 지정해도 오류가 나지 않습니다. 다른 컴퓨터에서 넘어온 `indexing.memory_dirs` 경로나 설정 조각을 덮어쓰는 값을 지울 때 유용합니다.

## 검색과 회상

### `mm search <query>`

터미널에서 기억 저장소를 검색합니다.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --top-k 5
```

`--top-k` / `-k` 가 결과 수를 제한합니다(기본 10). `--source-filter` / `-s`, `--tag-filter` / `-t`, `--namespace` / `-n`, `--as-of` (시점 한정, `YYYY-MM-DD` / `YYYY-QN`), `--format` (`table`·`json`·`plain`·`context`·`smart`)도 함께 사용할 수 있습니다.

### `mm tags list / rename / delete / merge`

청크에 붙은 태그를 한꺼번에 정리합니다. Web UI의 Tags 화면과 같은 작업을 CLI에서 실행할 수 있습니다. 기본 동작은 변경 내용을 보여 주는 미리보기이며, 실제로 적용하려면 `--apply`가 필요합니다.

```bash
mm tags list                                 # 사용 중인 태그와 사용 빈도
mm tags rename ops infra                      # 변경 내용 미리보기
mm tags rename ops infra --apply              # 실제 이름 변경
mm tags delete deprecated --apply             # 태그 제거 (청크는 그대로 유지)
mm tags merge py python --into python --apply # 여러 태그를 하나로 통합
```

`--apply` 없이 실행하면 영향을 받는 청크 수와 샘플을 먼저 보여줍니다. `delete`는 태그만 떼어내며 청크 자체는 인덱스에 남습니다.

### `mm recall`

최근 기억 청크를 시간순으로 조회합니다. 검색어 없이 날짜 범위, 소스, 네임스페이스로 결과를 거르는 점이 `mm search`와 다릅니다.

```bash
mm recall                                    # 최근 20개 청크 (기본 table 포맷)
mm recall --since 2026-04 --limit 50
mm recall --source-filter "postmortems/" --format json
mm recall --namespace project-x --format plain
```

`--format`은 `table`(기본), `json`(스크립트용), `plain`(텍스트 연결용) 중에서 선택합니다. 날짜는 `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, ISO datetime 형식을 지원합니다.

### `mm web`

브라우저에서 기억을 검색하고 관리하는 Web UI를 실행합니다.

`mm web`을 실행하면 `http://127.0.0.1:8080`에서 대시보드가 열립니다. Simple 모드에는 **Home, Search, Sources, Gateway, Index, Settings**가 있습니다. Gateway에서는 Overview, Projects, Skills, Commands, Subagents, MCP Servers, Hooks, Wiki를 관리합니다. 각 항목에는 **Push**와 변경 내용을 먼저 보여 주는 **Pull**이 있습니다. Settings에는 Config, Namespaces, Reset Database가 있습니다.

헤더에서 **Advanced**를 켜면 Tags, Timeline과 Settings의 Dedup·Age-out·Export/Import가 추가됩니다. `--dev` 또는 `MEMTOMEM_WEB__MODE=dev`는 개발·유지보수용 **Sessions, Search Runs, Quality Lab, Working Memory, Procedures, Health Report, Redaction** 화면도 표시합니다.

```bash
mm web                               # 기본: http://localhost:8080 (prod 모드)
mm web --port 9000
mm web --open                        # 기본 브라우저에서 URL 자동 실행
mm web --dev                         # --mode dev 의 단축 플래그
mm web --mode dev                    # 메인테이너용 페이지 추가 노출
```

### `mm shell`

대화형 REPL을 시작합니다. 한 프롬프트에서 검색, 추가, recall, 태그 집계, 인덱스 통계를 실행할 수 있습니다. MCP 클라이언트 없이 기억을 살펴보거나 설치 직후 DB 상태를 확인할 때 유용합니다.

```bash
mm shell
mm> search deployment checklist
mm> ask 지난번 migration 롤백 결정 요약
mm> add "오늘 새로 배운 사실"
mm> stats
mm> quit
```

명령어 없이 텍스트만 입력하면 자동으로 `search`로 해석됩니다. Ctrl+D 또는 `quit` / `exit` / `q`로 종료합니다.

## 기억 추가와 인덱싱

### `mm add`

새 기억을 추가하고 색인합니다. `--file`을 지정하지 않으면 UTC 기준 오늘 날짜의 `~/.memtomem/memories/YYYY-MM-DD.md`에 덧붙입니다.

```bash
mm add "hallway-door PR에 tree-sitter AST 파서 적용"
mm add "API 타임아웃 정책 결정" --title "API timeout" --tags "ops,api"
mm add "postmortem 요약" --file postmortems/2026-04-auth.md
```

`--tags`로 지정한 태그는 파일에 내용을 덧붙인 뒤 청크 메타데이터에 합칩니다. 본문에서 태그를 자동으로 읽지는 않습니다. `--file`에는 `~/.memtomem/memories/` 아래의 상대 경로만 사용할 수 있으며 `..` 경로는 거부합니다.

### `mm index <path>`

디스크에 있는 기존 파일을 처음 색인하는 명령입니다. 해시로 변경된 부분만 찾아 갱신하므로 같은 경로에 다시 실행해도 안전합니다.

```bash
mm index .                           # 현재 디렉토리 인덱싱
mm index ~/docs/architecture         # 특정 디렉터리 색인
mm index README.md                   # 단일 파일 인덱싱
```

`memtomem-server`는 `indexing.memory_dirs`에 등록된 경로를 계속 감시하지만 **새로 생긴 변경만 처리**합니다. 서버를 시작한 뒤 발생한 파일 수정·생성·이동만 다시 색인하며 기존 파일은 자동으로 읽지 않습니다. 기존 파일은 `mm index <dir>` 또는 `mem_index(path="<dir>")`로 처음 한 번 색인하세요. Web UI를 시작할 때 기존 파일도 자동으로 확인하려면 `MEMTOMEM_INDEXING__STARTUP_BACKFILL=true`를 직접 설정합니다.

### `mm ingest`

다른 AI 도구의 기억을 memtomem으로 통합합니다. `--source` 경로는 필수이며, 재실행 시 콘텐츠 해시로 변경된 파일만 증분 반영됩니다.

```bash
mm ingest claude-memory --source ~/.claude/projects/    # Claude Code 메모리 수집
mm ingest gemini-memory --source ~/.gemini/GEMINI.md    # Antigravity CLI GEMINI.md 수집
mm ingest codex-memory --source ~/.codex/memories/      # Codex CLI 메모리 수집
```

### `mm mem init / rescan / rescan-files`

프로젝트 기억을 신뢰할지 명시적으로 설정하고, 새 기억을 쓰지 않은 채 기존 저장 자료의 민감 정보를 검사합니다.

```bash
mm mem init --scope project_local
mm mem init --scope project_shared --confirm-project-shared
mm mem rescan --scope user [--source PATH] [--json] [--quiet]
mm mem rescan-files --json
```

`init`은 실제 프로젝트 표시 파일이 있는지 확인하고 선택한 기억 계층을 한 번에 등록합니다. `rescan`은 데이터를 바꾸지 않으며 대상 `scope`를 반드시 지정해야 합니다. 민감 정보가 발견되면 종료 코드 1을 반환합니다. `rescan-files`는 이전에 가져오거나 내려받은 파일과 세션 파일을 검사합니다.

## Context Gateway

Context Gateway는 에이전트·스킬·명령의 기준본을 Store에 보관합니다. `sync`는 Store의 기준본을 AI 도구로 Push합니다. `pull`은 AI 도구의 복사본을 미리 확인한 뒤 Store로 가져옵니다. 프로젝트·계층 간 이동과 여러 프로젝트의 일괄 작업도 지원합니다.

계층은 UI에서 **User**(`--scope user`, 모든 프로젝트에서 사용하는 개인용), **Project (shared)**(`--scope project_shared`, git 추적 대상), **Project (local)**(`--scope project_local`, 로컬 초안)로 표시됩니다.

### `mm context sync`

Store에 저장된 기준본을 감지된 AI 도구의 파일과 동기화합니다.

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

**Project (shared)**는 git으로 추적하므로 비밀값을 넣으면 안 되며 저장 전 확인이 필요합니다. **User** 계층(`--scope user`)의 기준본은 `~/.memtomem/` 아래에 저장되어 모든 프로젝트에서 사용할 수 있습니다. 프로젝트 밖의 홈 디렉터리에 쓰는 작업이므로 Gateway는 수정할 파일을 먼저 보여 주고 확인을 요청합니다. 입력할 수 없는 환경에서는 `--yes`로 확인을 건너뛸 수 있습니다.

MCP 서버 정의도 같은 방식으로 관리할 수 있습니다. `mm context sync --include=mcp-servers`는 기준본을 프로젝트의 `.mcp.json`으로 보냅니다. 비밀값을 검사하며, `mcp-servers`를 직접 지정했을 때만 실행됩니다.

### `mm context pull`

이름을 지정한 AI 도구의 항목 하나를 Store로 가져옵니다. 기본 동작은 미리보기입니다. `--diff`는 가져올 변경 내용을 보여 주고, 여러 후보가 있으면 `--from`으로 AI 도구를 선택합니다. `--overwrite`는 기존 Store 내용을 버전 이력에 저장한 뒤 교체합니다.

```bash
mm context pull skills reviewer
mm context pull skills reviewer --from claude --diff
mm context pull skills reviewer --from claude --scope project_shared --overwrite --apply
```

### 다른 프로젝트의 스킬 재사용 (`mm context move` / `copy`)

다른 프로젝트에서 만든 스킬·에이전트·명령을 현재 프로젝트로 가져오거나 계층 사이에서 옮길 때 사용합니다. `copy`는 원본을 남기며 `--as`로 이름을 바꿀 수 있습니다. `move`는 원본을 삭제합니다.

```bash
# 다른 프로젝트의 스킬을 현재 프로젝트로 복사 (먼저 미리보기)
mm context copy skills my-skill --to-project ~/work/other-app
mm context copy skills my-skill --to-project ~/work/other-app --apply

# user 계층으로 이름을 바꿔 복사
mm context copy agents reviewer --to user --as reviewer-strict --apply

# 계층 이동: 로컬 초안을 공유 계층으로 옮김
mm context move commands deploy --to project_shared --confirm-project-shared --apply

# MCP 서버 정의를 다른 프로젝트로 복사
mm context copy mcp-servers github --to-project ~/work/other-app --apply
```

기본 동작은 변경 내용을 보여 주는 미리보기입니다. 실제로 옮기거나 복사하려면 `--apply`가 필요합니다. 대상에 같은 이름이 있으면 거부하며 `--force`로 덮어쓸 수 없습니다. **Project (shared)**로 옮길 때는 민감 정보를 검사하고 `--confirm-project-shared`를 추가로 요구합니다. 작업이 끝나면 AI 도구로 보낼 때 사용할 다음 명령(예: `mm context sync`)을 출력합니다.

### 여러 프로젝트 한 번에 다루기 (`mm context projects`)

자주 사용하는 프로젝트를 등록하면 공유 항목을 모든 프로젝트에 한꺼번에 보낼 수 있습니다(`sync --all-projects`). `status --all-projects`는 파일을 바꾸지 않고 프로젝트별 불일치를 확인합니다.

```bash
mm context projects add ~/work/app-a          # 레지스트리에 등록
mm context projects list                      # 등록된 프로젝트 + 상태/등록 여부
mm context projects pause ~/work/app-a        # 일괄 작업에서 제외
mm context projects resume ~/work/app-a       # 다시 포함

mm context sync --all-projects                # 모든 적격 프로젝트로 일괄 동기화
mm context status --all-projects              # 읽기 전용: 어떤 프로젝트가 어긋났는가
```

일괄 동기화는 **Project (shared)** 계층만 대상으로 합니다. 한 프로젝트에서 실패해도 나머지 작업은 계속합니다. `pause` 상태인 프로젝트는 모든 `--all-projects` 작업에서 건너뜁니다.

<a id="기존-런타임-파일에서-시드하기"></a>
### 기존 AI 도구의 파일을 기준본으로 가져오기

별도의 `mm context import` 명령은 없습니다. AI 도구의 기존 파일로 기준본을 만들려면 항목 종류와 대상 계층을 지정해 `mm context init`을 실행합니다.

```bash
mm context detect --include agents,skills
mm context init --include agents,skills --scope project_shared --confirm-project-shared
mm context diff --include agents,skills --scope project_shared
```

Claude Code, Codex CLI, Antigravity CLI 등에서 직접 만든 파일을 앞으로 memtomem으로 관리할 때 사용합니다. 프로젝트 사이에서 재사용하려면 위의 `move`와 `copy`를 사용하세요. 공용 라이브러리에서 설치하려면 `mm wiki`를 사용합니다.

<a id="wiki--정규-아티팩트-라이브러리"></a>
## Wiki — 공용 항목 라이브러리

공용 위키(`~/.memtomem-wiki/`)에 스킬·에이전트·명령의 기준본을 모아 두고 필요할 때 프로젝트에 설치합니다. 위키는 일반 git 저장소입니다. 항목별 커밋으로 변경을 기록하고 `remote`, `push`, `pull`로 백업하거나 여러 기기에서 동기화할 수 있습니다.

```bash
mm wiki init                          # ~/.memtomem-wiki/ 생성 (skills/ agents/ commands/)
mm wiki init --from git@host:me/wiki  # 기존 위키를 git URL에서 가져오기
mm wiki list                          # 보유한 스킬·에이전트·명령어 목록
mm wiki list --type skills

mm wiki remote git@host:me/wiki       # 백업 원격 저장소(origin) 설정
mm wiki push                          # 원격 저장소로 백업
mm wiki pull                          # 다른 기기에서 복원
```

각 항목 종류(`skill` / `agent` / `command`)에는 AI 도구별 재정의 파일을 만들고 검사·커밋하는 하위 명령이 있습니다. dev 모드 Web UI의 Commit 버튼으로도 같은 작업을 실행할 수 있으므로 git 명령을 직접 쓰지 않아도 됩니다.

```bash
mm wiki skill override my-skill --vendor claude --editor   # 기준본으로 재정의 파일 만들기
mm wiki skill diff my-skill --vendor claude                # 기준본을 변환한 결과와 비교
mm wiki skill lint my-skill                                # 설치 가능 여부 검사 (CI에서도 사용 가능)
mm wiki skill commit my-skill --vendor claude              # 격리 커밋으로 기록
```

위키에 모아 둔 항목은 `mm context install <type> <name>`으로 프로젝트에 설치합니다.

## 세션과 멀티 에이전트

### `mm pinned`

검색 결과보다 앞에 붙는 Pinned Context 블록을 관리합니다. 장기 보관할 짧은 사실과 지침에 사용합니다. 하위 명령은 `list`, `get`, `set`, `delete`, `compose`입니다.

```bash
mm pinned list
mm pinned get <key>
mm pinned set <key> --content "리뷰는 근거부터 제시"
mm pinned delete <key>
mm pinned compose
```

계층 범위, 우선순위, 중복 호출 처리, 조합 규칙은 [Pinned Context](/ko/ltm/pinned-context/)를 참고하세요.

### `mm review`

검토할 기억 후보를 만들고 승인하거나 거부합니다. 승인하기 전에는 장기 기억에 저장하지 않습니다.

```bash
mm review scan <session-id>
mm review list --status pending
mm review show <candidate-id>
mm review approve <candidate-id> --reviewer alice
mm review reject <candidate-id> --reviewer alice --reason "장기 기억이 아님"
mm review recover --stale-after-minutes 15 --actor alice
```

### `mm session`

AI 도구의 세션을 시작·종료·조회하고 관련 이벤트를 관리합니다. 하위 명령은 `start`, `end`, `list`, `events`, `wrap`입니다. 세션은 활동 기록을 묶어 AI 도구와 연결합니다.

```bash
mm session start --agent-id claude-code --title "리팩터링 auth"
mm session list --json                           # 스크립트용 JSON 출력
mm session events <session-id> --json            # 이벤트 타임라인 JSON
mm session wrap -- <command...>                  # 명령어 실행 전후로 세션 자동 start/end
mm session end
```

현재 세션 ID는 `~/.memtomem/.current_session`에 저장됩니다. `mm activity log` 같은 다음 명령은 이 값을 자동으로 사용합니다.

### `mm activity log`

현재 세션에 도구 호출, 결정, 오류, 서브에이전트 상태 변경을 기록합니다. 훅 실행을 방해하지 않도록 기본적으로 아무것도 출력하지 않습니다. `--json`을 지정하면 스크립트용 확인 응답을 출력합니다.

```bash
mm activity log --type tool_call --content "ran tests"
mm activity log --type decision --content "전략 X 채택" --meta '{"k":"v"}' --json
```

`--json`을 지정하면 성공 시 `{"ok": true, ...}`를 표준 출력으로 보냅니다. 활성 세션이 없거나 기록에 실패하면 `{"ok": false, "reason": ...}`를 출력합니다. 종료 코드는 항상 0입니다.

### `mm agent register / list / share`

여러 AI 도구를 등록·조회하고 청크를 공유합니다. MCP `mem_agent_*` 도구와 같은 기능을 CLI에서 제공합니다.

```bash
mm agent register planner --description "Planning subagent" --color "#6c5ce7"
mm agent list                        # 등록된 에이전트 + 공유 네임스페이스
mm agent list --json
mm agent share <chunk-id>                          # `shared` 로 복사
mm agent share <chunk-id> --target agent-runtime:reviewer
```

`mm agent register`는 `agent-runtime:{agent_id}` 네임스페이스를 자동으로 만듭니다. 같은 ID로 다시 호출하면 메타데이터만 갱신합니다. `agent_id`에는 `[A-Za-z0-9._-]`만 사용할 수 있습니다.

`mm agent share`는 청크를 **복사**하며 참조 링크를 만들지 않습니다. 새 청크에는 별도 UUID가 생기고 원본을 바꿔도 사본은 바뀌지 않습니다. 출처는 `shared-from=<원본-uuid>` 태그로 추적합니다.

## 진단

### `mm status`

MCP의 `mem_status`와 같은 점검을 터미널에서 실행합니다. 설치 직후 실행 파일, 설정, DB 연결, 임베딩 상태를 한 번에 확인할 때 사용합니다. `mm config show`보다 넓은 상태를 보여 주며 `mm watchdog status`처럼 이전 점검 기록을 다루지는 않습니다.

```bash
mm status                            # 인덱싱 통계 + 설정 요약 (mem_status와 동일 출력)
mm status --json                     # 기계 판독용 — 스크립트 / `jq` 파이프라인
```

이 명령은 v0.1.25에 추가됐고 `--json`과 `--format json`은 v0.3.4부터 지원합니다. MCP 클라이언트를 실행하지 않고도 DB가 열리는지, 기억이 몇 건 있는지 빠르게 확인할 수 있습니다.

### `mm sync-doctor`

현재 비공개 기억 동기화 저장소를 여섯 가지 항목으로 검사합니다. 파일은 수정하지 않습니다. 오류가 있으면 0이 아닌 종료 코드를 반환하지만 경고만 있으면 성공으로 끝납니다.

```bash
mm sync-doctor
```

### `mm warmup`

로컬 임베딩·리랭커 모델을 미리 불러옵니다. 첫 검색 때 모델을 불러오느라 지연되는 것을 막을 수 있습니다. 선택 사항이며 실행하지 않으면 처음 사용할 때 모델을 불러옵니다.

```bash
mm warmup                            # 지금 모델 로드 (일회성)
```

MCP 서버를 시작할 때 자동으로 준비하려면 `MEMTOMEM_WARMUP__ENABLED=true`를 설정하세요. Ollama, OpenAI, Cohere 같은 원격 제공자는 미리 불러올 로컬 자원이 없으므로 건너뜁니다.

### `mm memory doctor`

디스크의 노트 폴더, 인덱스 파일, 검색 DB가 서로 맞는지 검사합니다. 서버가 꺼진 동안 추가되어 색인되지 않은 파일이나 대상이 사라진 인덱스 링크를 찾습니다. 기본 동작은 읽기 전용이며 아무것도 수정하지 않습니다.

```bash
mm memory doctor                     # 모든 memory_dir 점검 (읽기 전용)
mm memory doctor ~/notes             # 특정 memory_dir만 점검
mm memory doctor --fix               # 제거할 인덱스 링크 미리보기
mm memory doctor --fix --apply       # 실제로 끊어진 링크 제거
```

`--fix`는 대상 파일이 사라진 인덱스 포인터만 제거합니다. `--apply`가 없으면 변경 내용을 보여 주기만 합니다. error 등급 문제가 있으면 종료 코드 1을 반환하므로 CI에서도 사용할 수 있습니다.

`dangling_wikilink`는 참고 정보입니다. 앞으로 만들 문서를 미리 가리키거나 이전 이름이 남은 경우일 수 있으므로 검사를 실패시키지 않고 `--fix`로도 제거하지 않습니다.

### `mm quality`

같은 입력에 같은 결과를 내는 검색 평가 사례를 관리합니다. 평가를 다시 실행하고 보고서를 비교하거나 품질 기준을 검사할 수 있습니다. 실행 기록과 라벨은 dev 모드 Web UI의 Search Runs와 Quality Lab에서도 확인할 수 있습니다.

```bash
mm quality cases list
mm quality replay --output report.json
mm quality compare baseline.json candidate.json
mm quality gate baseline.json candidate.json
```

### `mm watchdog`

상태 검사를 정기적으로 실행하고 기록을 조회합니다. 백그라운드 스케줄러가 남긴 결과를 보거나 지금 바로 한 번 실행할 수 있습니다.

```bash
mm watchdog status                           # 최근 체크 요약
mm watchdog status --json                    # JSON 출력
mm watchdog run                              # 지금 즉시 모든 체크 실행
mm watchdog history db_size --hours 48       # 특정 체크 48시간 추이
```

MCP 서버는 `health_watchdog.enabled`가 켜져 있을 때만 상태 검사를 백그라운드에서 예약 실행합니다. 이 설정이 꺼져 있어도 `mm watchdog run`으로 한 번씩 직접 검사할 수 있습니다.

### `mm schedule add / list / run-now / delete`

인덱스 압축, 중요도 낮추기, 끊어진 링크 정리, 중복 검사 같은 예약 작업을 등록·조회·실행·삭제합니다.

```bash
mm schedule add --cron "0 3 * * *" --job dedup_scan
mm schedule add --cron "0 */6 * * *" --job importance_decay --params '{"max_age_days": 90}'
mm schedule list
mm schedule list --json
mm schedule run-now <sched-id>       # 다음 예약 시각을 기다리지 않고 즉시 실행
mm schedule delete <sched-id>
```

`--cron`에는 UTC 기준 5필드 표현식을 사용합니다. `--params`는 작업별 입력을 담은 JSON 객체입니다. 예약 작업을 실제로 실행하려면 `scheduler.enabled`와 `health_watchdog.enabled`가 모두 켜져 있어야 합니다.

## 유지보수와 라이프사이클

### `mm gc orphan-sources`

원본 파일이 사라진 인덱스 자료 출처를 찾습니다. 기본적으로 삭제할 항목만 보여 줍니다. `--apply`를 붙이면 원본이 없는 자료 출처와 해당 청크를 제거합니다.

```bash
mm gc orphan-sources
mm gc orphan-sources --apply
```

`mm gc orphan-projects`는 기록된 `project_root`가 사라진 청크를 찾습니다. 기본 동작은 미리보기입니다. `--apply`는 프로젝트 루트마다 확인하고, `--apply --yes`는 추가 입력 없이 삭제합니다. 이동식 디스크이거나 잠시 연결이 끊긴 경로가 아닌지 먼저 확인하세요.

### `mm embedding-reset`

DB에 저장된 임베딩 모델·차원과 현재 설정이 다를 때 상태를 확인하거나 복구합니다. 주로 임베딩 제공자를 바꾸거나 다시 설치한 뒤 사용합니다. `--mode`로 동작을 선택하세요.

```bash
mm embedding-reset                            # --mode status (기본): DB 저장값 vs 현재 설정 비교
mm embedding-reset --mode apply-current       # DB를 현재 설정으로 재설정 (파괴적 — 재인덱싱 필요)
mm embedding-reset --mode revert-to-stored    # 실행 중인 임베더를 DB 저장값에 맞춤 (비파괴적)
```

`apply-current`는 `chunks_vec`를 현재 설정의 차원으로 다시 만듭니다. 청크 테이블은 남지만 모든 벡터를 삭제하므로 이후 `mm index <path>`로 다시 색인해야 합니다. `revert-to-stored`는 설정 파일을 바꾸지 않고 실행 중인 임베더만 DB 값으로 되돌립니다. 이 상태를 계속 사용하려면 `~/.memtomem/config.json`의 임베딩 설정도 같은 값으로 바꾸세요.

### `mm purge --matching-excluded`

내장 자격 증명 차단 목록이나 사용자 `indexing.exclude_patterns`에 해당하는 기존 청크를 제거합니다. 기본 동작은 삭제 대상 미리보기입니다. 실제로 삭제하려면 `--apply`를 추가하세요.

```bash
mm purge --matching-excluded              # 삭제 대상 미리보기
mm purge --matching-excluded --apply      # 실제 삭제 실행
```

### `mm reset`

DB의 청크, 세션, 활동 로그 등 모든 데이터를 삭제하고 스키마를 다시 만듭니다. 임베딩 설정은 유지되므로 설정을 다시 하지 않고 색인만 실행하면 됩니다. 삭제할 행 수를 보여 주고 확인을 요청하며 `-y`로 이 단계를 건너뛸 수 있습니다.

```bash
mm reset                             # 확인 프롬프트 후 삭제
mm reset -y                          # 프롬프트 스킵
```

`mm embedding-reset --mode apply-current`는 벡터만 다시 만들지만 `mm reset`은 인덱스 전체를 비웁니다. 설정 파일은 바꾸지 않습니다. 설정도 초기화하려면 `mm init --fresh`나 `mm uninstall`을 사용하세요.

### `mm upgrade`

실행 중인 `memtomem-server`를 멈춘 뒤 `uv tool`로 다시 설치합니다. `uv tool install --reinstall memtomem`만 실행하면 설치 파일은 바뀌지만 MCP 클라이언트가 이미 불러온 서버는 이전 버전으로 계속 동작할 수 있습니다. `mm upgrade`는 실행 중인 프로세스까지 정리합니다.

```bash
mm upgrade                           # 최신 버전으로 재설치 (extras 자동 감지)
mm upgrade --version 0.3.12           # 특정 버전 고정
mm upgrade --extras all              # 설치할 extras 명시 (기본은 현재 설치에서 자동 감지)
mm upgrade --dry-run                 # 계획만 출력, 실제 변경 없음
```

선택 기능(extras)은 현재 `uv tool` 설치 내역에서 자동으로 찾습니다. `memtomem[all]`을 사용했다면 `[all]` 설정을 유지합니다.

### `mm uninstall`

실행 파일과 별도로 `~/.memtomem/`의 설정, DB, 설정 조각, 백업, 업로드를 정리합니다. `uv tool uninstall memtomem` 같은 패키지 관리자 명령은 실행 파일만 제거하므로 이전 데이터가 남을 수 있습니다. `mm uninstall`은 v0.1.23부터 이 데이터까지 정리합니다.

```bash
mm uninstall                  # 대화형, 전체 삭제
mm uninstall -y               # 확인 프롬프트 스킵
mm uninstall --keep-config    # config.json + config.d/* + 백업 보존
mm uninstall --keep-data      # SQLite DB + ~/.memtomem/memories/ 보존
mm uninstall --force          # 서버 실행 중 안전장치 우회
```

기본 경로 밖에 지정한 `storage.sqlite_path`도 삭제 대상 목록에 포함합니다. WAL 손상을 막기 위해 MCP 서버가 실행 중이면 작업을 거부합니다. 서버를 먼저 종료하거나 `--force`를 사용하세요. `~/.claude.json`, `~/.codex/config.toml` 같은 외부 편집기의 MCP 설정은 경로만 알려 주고 수정하지 않습니다. 마지막에는 설치 방식에 맞는 실행 파일 제거 명령(예: `uv tool uninstall memtomem`, `pip uninstall memtomem`)을 출력합니다.

> 전체 시작 과정은 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.
