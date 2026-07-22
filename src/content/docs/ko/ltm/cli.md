---
title: CLI 레퍼런스
description: memtomem LTM 서버 관리를 위한 mm CLI 명령어.
---

`mm` 명령어는 `memtomem` 패키지와 함께 설치됩니다. 설정, 검색, 인덱싱, 세션 추적, 프로젝트 간 컨텍스트 동기화 기능을 제공합니다. 전체 명령 목록은 `mm --help`, 설치된 버전은 `mm --version`(또는 `mm version` 서브명령)으로 확인할 수 있습니다.

> 이 페이지는 memtomem v0.3.12 기준입니다. 명령은 기능별로 묶여 있으나 단일 레퍼런스이므로 위에서 아래로 훑어보면 됩니다.

## 전체 명령 인덱스

현재 최상위 표면을 빠짐없이 유지합니다. 아래에는 작업별 상세 흐름이 이어지며 설치된 0.3.12 바이너리의 옵션 타입은 `mm <command> --help`로 확인합니다.

| 그룹 | 명령 |
|---|---|
| 설정 / 데이터 | `init`, `config`, `add`, `index`, `ingest`, `mem`, `memory` |
| 검색 / UI | `search`, `recall`, `tags`, `pinned`, `shell`, `web` |
| 런타임 컨텍스트 | `context`, `wiki`, `sync-doctor` |
| 협업 | `session`, `activity`, `agent`, `review` |
| 평가 / 운영 | `status`, `quality`, `warmup`, `watchdog`, `schedule` |
| 라이프사이클 | `gc`, `embedding-reset`, `purge`, `reset`, `upgrade`, `uninstall`, `version` |

명령 그룹의 모든 하위 명령도 다음과 같이 복제합니다.

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

Bare `mm web`은 UI를 실행하고 `status`, `stop`은 이를 관리합니다.

## 설정

### `mm init`

대화형 설정 마법사를 실행합니다. 임베딩 프로바이더, 데이터베이스 경로, 토크나이저, 리랭커, 기본 네임스페이스를 구성합니다.

설정 마법사 시작 시 **프리셋 피커** (Minimal / English / Korean)가 임베딩·리랭커·토크나이저·네임스페이스 기본값 번들을 한 번에 적용합니다. 비대화 모드에서는 `--preset <name>`으로 직접 선택하거나, `--advanced`로 전체 10단계 마법사를 강제 실행할 수 있습니다.

```bash
mm init                              # 대화형 설정 + 프리셋 피커
mm init --non-interactive            # 자동 수락; `--preset minimal --non-interactive`와 동일
mm init --preset korean              # 한국어 프리셋을 비대화 모드로 적용
mm init --preset english --non-interactive   # 영어 프리셋, 프롬프트 없음
mm init --advanced                   # 피커 생략, 10단계 전체 마법사
mm init --fresh                      # 누적 설정 일괄 정리 후 마법사 재실행
```

재설치 경로에서 `mm init`은 기존 `~/.memtomem/memtomem.db`에 저장된 임베딩 프로바이더·모델·차원이 새 프리셋과 일치하는지 검사합니다. 불일치가 감지되면 대화형에서는 벡터 인덱스(`chunks_vec`)를 그 자리에서 다시 만드는 방법을 제안하고, `--non-interactive` 비대화 모드에서는 `mm embedding-reset --mode apply-current` 복구 안내를 출력합니다. 청크 테이블은 보존되므로 이후 `mm index <path>`로 재인덱싱하면 작업 집합이 복원됩니다.

`--fresh`는 마법사가 수정하지 않은 필드 중 내장 기본값과 값이 다른 모든 키를 제거한 뒤 마법사를 다시 실행합니다. 이전 버전에서 누적된 설정 항목을 정리하는 안전한 일괄 정리 옵션이며, 기존 `config.json`은 `config.json.bak-<unix-ts>`로 백업된 후 재작성됩니다.

### MCP 서버 실행

memtomem의 MCP 서버는 `memtomem-server` 콘솔 스크립트로 제공됩니다. 일반적으로 직접 실행하지 않습니다 — MCP 클라이언트(Claude Desktop, Claude Code, Cursor 등)가 자신의 설정 파일에 등록된 항목에 따라 자동으로 기동합니다. 설정 예시는 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.

서버가 노출할 도구 범위를 조정하려면 MCP 클라이언트 설정의 `env`에 `MEMTOMEM_TOOL_MODE`(`core` / `standard` / `full`)를 지정합니다. 기본은 `core`(핵심 도구 8개 + `mem_do` 라우터로 총 9개)이며, `full`은 99개 현행 도구와 deprecated `mem_context_migrate` 별칭 1개를 노출합니다. 모드와 도구 목록은 [MCP 도구](/ko/ltm/mcp-tools/) 페이지를 참조하세요.

v0.1.25부터 MCP 핸드셰이크만으로는 `~/.memtomem/memtomem.db`가 생성되지 않습니다 — DB는 첫 도구 호출 시점에 열리며, 서버 pid/flock 파일은 `$XDG_RUNTIME_DIR/memtomem/server.pid`(플랫폼에 따라 `$TMPDIR/memtomem-$UID/`)로 이동했습니다. 연결만 하고 도구를 호출하지 않는 클라이언트는 홈 디렉토리에 흔적을 남기지 않습니다.

### `mm config show / set / unset`

`mm config show` 는 현재 설정을 표시하며 API 키는 자동으로 마스킹됩니다. `--json`(또는 `--format json`)은 전체 설정을 기계 판독용 JSON으로 출력합니다. `mm config set <key> <value>` 는 내장 기본값에 사용자 오버라이드를 덧씌우고, `mm config unset <keys...>` 는 그 오버라이드를 제거해 내장 기본값(또는 `config.d/*.json` 프래그먼트 값)으로 되돌립니다.

```bash
mm config show                       # 읽기 좋은 테이블
mm config show --json                # 스크립트용 JSON
mm config set search.default_top_k 20
mm config set rerank.model bge-reranker-base
mm config unset indexing.memory_dirs
mm config unset rerank.model search.default_top_k
```

`mm config unset` 은 여러 번 실행해도 결과가 같습니다(idempotent) — 존재하지 않는 키를 제거해도 에러 없이 통과합니다. 다른 머신에서 이전된 `indexing.memory_dirs` 경로, 또는 프래그먼트를 덮고 있는 단일 필드를 정리할 때 유용합니다.

## 검색과 회상

### `mm search <query>`

커맨드 라인에서 지식 베이스를 검색합니다.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --top-k 5
```

`--top-k` / `-k` 가 결과 수를 제한합니다(기본 10). `--source-filter` / `-s`, `--tag-filter` / `-t`, `--namespace` / `-n`, `--as-of` (시점 한정, `YYYY-MM-DD` / `YYYY-QN`), `--format` (`table`·`json`·`plain`·`context`·`smart`)도 함께 사용할 수 있습니다.

### `mm tags list / rename / delete / merge`

청크에 붙은 태그를 일괄 정리합니다 — Web UI의 Tags 탭과 동일한 작업을 CLI에서 수행합니다. 모든 변경 작업은 기본이 실제로 바꾸지 않는 미리보기(dry-run)이며, 실제로 쓰려면 `--apply`가 필요합니다.

```bash
mm tags list                                 # 사용 중인 태그와 사용 빈도
mm tags rename ops infra                      # dry-run 미리보기
mm tags rename ops infra --apply              # 실제 이름 변경
mm tags delete deprecated --apply             # 태그 제거 (청크는 그대로 유지)
mm tags merge py python --into python --apply # 여러 태그를 하나로 통합
```

`--apply` 없이 실행하면 영향을 받는 청크 수와 샘플을 먼저 보여줍니다. `delete`는 태그만 떼어내며 청크 자체는 인덱스에 남습니다.

### `mm recall`

최근 기억 청크를 시간 순으로 조회합니다. 쿼리 없이 날짜 범위·소스·네임스페이스로 필터링하는 점이 `mm search`와 다릅니다.

```bash
mm recall                                    # 최근 20개 청크 (기본 table 포맷)
mm recall --since 2026-04 --limit 50
mm recall --source-filter "postmortems/" --format json
mm recall --namespace project-x --format plain
```

`--format`은 `table`(기본, 사람용), `json`(스크립트), `plain`(텍스트 파이프) 중 선택합니다. 날짜 인자는 `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, ISO datetime을 허용합니다.

### `mm web`

브라우저 기반 검색 및 기억 관리를 위한 Web UI 대시보드를 실행합니다.

`mm web`을 실행하면 `http://127.0.0.1:8080`에서 대시보드가 열립니다. Simple 모드는 **Home, Search, Sources, Gateway, Index, Settings**를 보여줍니다. Gateway에는 Overview, Projects, Skills, Commands, Subagents, MCP Servers, Hooks, Wiki가 있고 각 행은 **Push**와 미리보기 우선 **Pull**을 사용합니다. Settings에는 Config, Namespaces, Reset Database가 있습니다.

헤더의 **Advanced** 토글은 Tags와 Timeline, Settings의 Dedup·Age-out·Export/Import를 추가합니다. `--dev` 또는 `MEMTOMEM_WEB__MODE=dev`는 **Sessions, Search Runs, Quality Lab, Working Memory, Procedures, Health Report, Redaction** 메인테이너 페이지를 더합니다.

```bash
mm web                               # 기본: http://localhost:8080 (prod 티어)
mm web --port 9000
mm web --open                        # 기본 브라우저에서 URL 자동 실행
mm web --dev                         # --mode dev 의 단축 플래그
mm web --mode dev                    # 메인테이너용 페이지 추가 노출
```

### `mm shell`

대화형 REPL을 시작합니다 — 검색, 추가, recall, 태그 집계, 인덱스 통계를 한 프롬프트에서 돌립니다. MCP 클라이언트 없이 터미널에서 기억을 훑거나, 설치 직후 DB 세팅을 빠르게 감 잡을 때 유용합니다.

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

새 기억을 추가하고 인덱싱합니다. `--file`을 지정하지 않으면 UTC 기준 오늘 날짜로 `~/.memtomem/memories/YYYY-MM-DD.md`에 append 됩니다.

```bash
mm add "hallway-door PR에 tree-sitter AST 파서 적용"
mm add "API 타임아웃 정책 결정" --title "API timeout" --tags "ops,api"
mm add "postmortem 요약" --file postmortems/2026-04-auth.md
```

`--tags`로 지정한 태그는 append 후 해당 파일의 청크 메타데이터에 병합됩니다(청커가 본문에서 태그를 파싱하지 않으므로 명시적 머지). `--file`은 `~/.memtomem/memories/` 하위 상대 경로만 허용하며 `..` 컴포넌트를 거부합니다.

### `mm index <path>`

디스크에 이미 존재하는 파일을 **한 번에 시드**하는 one-shot 명령입니다. 해시 기반 변경 감지로 증분 인덱싱을 수행하므로 재실행은 안전합니다.

```bash
mm index .                           # 현재 디렉토리 인덱싱
mm index ~/docs/architecture         # 특정 디렉토리 인덱싱
mm index README.md                   # 단일 파일 인덱싱
```

`indexing.memory_dirs`에 등록된 경로는 장기 실행되는 `memtomem-server` 프로세스의 파일 워처가 감시하지만, 워처는 **변경에만 반응**합니다. 시작 이후의 modify/create/move 이벤트만 재인덱싱하므로 기존 파일은 자동 스캔되지 않습니다. `mm index <dir>`(또는 `mem_index(path="<dir>")`)로 한 번 시드한 뒤 MCP 서버 워처가 이후 변경을 처리하게 하세요. Web UI 시작 시 one-shot backfill이 필요하면 `MEMTOMEM_INDEXING__STARTUP_BACKFILL=true`를 명시적으로 켭니다.

### `mm ingest`

다른 AI 도구의 기억을 memtomem으로 통합합니다. `--source` 경로는 필수이며, 재실행 시 콘텐츠 해시로 변경된 파일만 증분 반영됩니다.

```bash
mm ingest claude-memory --source ~/.claude/projects/    # Claude Code 메모리 수집
mm ingest gemini-memory --source ~/.gemini/GEMINI.md    # Antigravity CLI GEMINI.md 수집
mm ingest codex-memory --source ~/.codex/memories/      # Codex CLI 메모리 수집
```

### `mm mem init / rescan / rescan-files`

명시적 project memory trust gate를 관리하고 새 기억을 쓰지 않은 채 기존 저장 자료를 검사합니다.

```bash
mm mem init --scope project_local
mm mem init --scope project_shared --confirm-project-shared
mm mem rescan --scope user [--source PATH] [--json] [--quiet]
mm mem rescan-files --json
```

`init`은 실제 project marker를 요구하며 선택한 memory tier를 원자적으로 등록합니다. `rescan`은 read-only이고 privacy finding에서 exit 1이며 scope를 반드시 명시합니다. `rescan-files`는 과거 import, fetch, session 파일을 검사합니다.

## Context Gateway

Context Gateway는 에이전트·스킬·명령어 원본을 Store에 보관합니다. `sync`는 Store 복사본을 런타임으로 Push하고, `pull`은 선택한 런타임 복사본을 미리 본 뒤 Store로 가져옵니다. 프로젝트·티어 간 전송과 다중 프로젝트 작업도 같은 모델을 사용합니다.

티어는 친숙한 라벨로 다룹니다: **User**(`--scope user`, 모든 프로젝트에서 보이는 개인용), **Project (shared)**(`--scope project_shared`, git 추적 대상), **Project (local)**(`--scope project_local`, 로컬 초안).

### `mm context sync`

저장된 정규 파일을 감지된 런타임 파일과 동기화합니다.

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

**Project (shared)** 는 git 추적 대상이므로 명시 확인이 필요하고 secret을 넣으면 안 됩니다. **User** 티어(`--scope user`)에 동기화하면 정규 파일이 `~/.memtomem/` 아래에 들어가 모든 프로젝트에서 보이게 됩니다 — 프로젝트 바깥(홈 디렉토리)을 건드리는 쓰기이므로, Gateway가 실제로 수정할 파일 경로를 보여주고 확인을 요청합니다. 비대화 환경에서는 `--yes`로 확인을 건너뛸 수 있습니다.

MCP 서버 정의도 같은 흐름으로 옮길 수 있습니다. `mm context sync --include=mcp-servers` 는 정규 MCP 서버 정의를 프로젝트의 `.mcp.json` 으로 동기화하며(secret 안전성 검사 포함), 이는 명시적으로 요청해야 동작하는 opt-in 경로입니다.

### `mm context pull`

이름을 지정한 런타임 아티팩트 하나를 Store로 가져옵니다. 기본은 미리보기이며, `--diff`는 실제로 들어올 변경을 보여주고, 후보가 다르면 `--from`으로 런타임을 선택합니다. `--overwrite`는 기존 Store payload를 스냅샷한 뒤 교체합니다.

```bash
mm context pull skills reviewer
mm context pull skills reviewer --from claude --diff
mm context pull skills reviewer --from claude --scope project_shared --overwrite --apply
```

### 다른 프로젝트의 스킬 재사용 (`mm context move` / `copy`)

다른 프로젝트에서 이미 만든 스킬·에이전트·명령어를 지금 프로젝트로 가져오거나, 티어 사이로 옮길 때 사용합니다. `copy` 는 원본을 남기고(필요하면 `--as` 로 이름을 바꿔 복사), `move` 는 원본을 정리합니다.

```bash
# 다른 프로젝트의 스킬을 현재 프로젝트로 복사 (먼저 미리보기)
mm context copy skills my-skill --to-project ~/work/other-app
mm context copy skills my-skill --to-project ~/work/other-app --apply

# user 티어로 이름을 바꿔 복사
mm context copy agents reviewer --to user --as reviewer-strict --apply

# 티어 이동: 로컬 초안을 공유 티어로 승격
mm context move commands deploy --to project_shared --confirm-project-shared --apply

# MCP 서버 정의를 다른 프로젝트로 복사
mm context copy mcp-servers github --to-project ~/work/other-app --apply
```

기본 동작은 dry-run 미리보기이며, 실제 실행하려면 `--apply` 가 필요합니다. 대상에 같은 이름이 이미 있으면 항상 거부합니다(`--force` 우회 없음). **Project (shared)** 로 들어가는 이전은 privacy 검사를 거치고 `--confirm-project-shared` 가 추가로 필요합니다. 이전이 끝나면 대상에서 AI 도구로 내보내는 후속 명령(예: `mm context sync`)을 그대로 출력하므로 이어서 실행하면 됩니다.

### 여러 프로젝트 한 번에 다루기 (`mm context projects`)

자주 작업하는 프로젝트를 등록해 두면, 공유 아티팩트를 한 번에 모든 프로젝트로 내보내거나(`sync --all-projects`), 어느 프로젝트가 어긋났는지 읽기 전용으로 점검할 수 있습니다(`status --all-projects`).

```bash
mm context projects add ~/work/app-a          # 레지스트리에 등록
mm context projects list                      # 등록된 프로젝트 + 상태/등록 여부
mm context projects pause ~/work/app-a        # 일괄 작업에서 제외
mm context projects resume ~/work/app-a       # 다시 포함

mm context sync --all-projects                # 모든 적격 프로젝트로 일괄 동기화
mm context status --all-projects              # 읽기 전용: 어떤 프로젝트가 어긋났는가
```

일괄 동기화는 **Project (shared)** 티어만 대상으로 하며, 한 프로젝트가 실패해도 배치 전체가 중단되지 않습니다. `pause` 된 프로젝트는 모든 `--all-projects` 작업에서 건너뜁니다.

### 기존 런타임 파일에서 시드하기

별도의 `mm context import` 명령은 없습니다. 런타임별 파일에서 정규 파일을 시드하려면 아티팩트 종류와 대상 티어를 지정해 `mm context init`을 실행합니다.

```bash
mm context detect --include agents,skills
mm context init --include agents,skills --scope project_shared --confirm-project-shared
mm context diff --include agents,skills --scope project_shared
```

이미 Claude Code, Codex CLI, Antigravity CLI 또는 다른 런타임에서 파일을 직접 작성했고, 앞으로는 memtomem이 관리하도록 하고 싶을 때 유용합니다. 프로젝트 간 재사용은 위의 `move`/`copy`, 호스트 전역 라이브러리에서의 설치는 `mm wiki` 를 참고하세요.

## Wiki — 정규 아티팩트 라이브러리

호스트 전역 위키(`~/.memtomem-wiki/`)에 스킬·에이전트·명령어의 정규 버전을 모아 두고, 필요할 때 프로젝트에 설치합니다. 위키는 일반 git 저장소이므로 격리된 커밋으로 변경을 기록하고 remote/push/pull로 백업·기기 간 동기화를 합니다 — 별도 동기화 도구가 필요 없습니다.

```bash
mm wiki init                          # ~/.memtomem-wiki/ 생성 (skills/ agents/ commands/)
mm wiki init --from git@host:me/wiki  # 기존 위키를 git URL에서 복제
mm wiki list                          # 보유한 스킬·에이전트·명령어 목록
mm wiki list --type skills

mm wiki remote git@host:me/wiki       # 백업 remote(origin) 설정
mm wiki push                          # remote로 백업
mm wiki pull                          # 다른 기기에서 복원
```

각 아티팩트 종류(`skill` / `agent` / `command`)에는 런타임별 override를 만들고 검증·커밋하는 서브그룹이 있습니다. dev 모드 브라우저의 Commit 버튼으로도 같은 작업을 수행할 수 있어 raw git이 필요 없습니다.

```bash
mm wiki skill override my-skill --vendor claude --editor   # 정규 내용에서 override 시드
mm wiki skill diff my-skill --vendor claude                # 정규 렌더와의 차이
mm wiki skill lint my-skill                                # 설치 가능 여부 검증 (CI 게이트로 사용 가능)
mm wiki skill commit my-skill --vendor claude              # 격리 커밋으로 기록
```

위키에 모아 둔 아티팩트는 `mm context install <type> <name>` 으로 프로젝트에 설치합니다.

## 세션과 멀티 에이전트

### `mm pinned`

검색 기억보다 앞에 조합되는 durable Pinned Context 블록을 관리합니다. 전체 그룹은 `list`, `get`, `set`, `delete`, `compose`입니다.

```bash
mm pinned list
mm pinned get <key>
mm pinned set <key> --content "리뷰는 근거부터 제시"
mm pinned delete <key>
mm pinned compose
```

정확한 scope, shadowing, idempotency, composition 규칙은 [Pinned Context](/ko/ltm/pinned-context/)를 참고하세요.

### `mm review`

review-first 기억 후보를 생성하고 판정합니다. 승인 전에는 durable memory가 되지 않습니다.

```bash
mm review scan <session-id>
mm review list --status pending
mm review show <candidate-id>
mm review approve <candidate-id> --reviewer alice
mm review reject <candidate-id> --reviewer alice --reason "장기 기억이 아님"
mm review recover --stale-after-minutes 15 --actor alice
```

### `mm session`

에이전트 세션을 관리합니다 — start · end · list · events · wrap. 세션은 활동 이벤트를 묶어 에이전트 런타임에 연결합니다.

```bash
mm session start --agent-id claude-code --title "리팩터링 auth"
mm session list --json                           # 스크립트용 JSON 출력
mm session events <session-id> --json            # 이벤트 타임라인 JSON
mm session wrap -- <command...>                  # 명령어 실행 전후로 세션 자동 start/end
mm session end
```

현재 세션 ID는 `~/.memtomem/.current_session`에 저장되어 `mm activity log` 등 후속 명령이 자동으로 참조합니다.

### `mm activity log`

현재 세션에 활동 이벤트(도구 호출, 결정, 오류, 서브에이전트 라이프사이클)를 기록합니다. 훅 호출이 실패하지 않도록 기본은 침묵 출력이며, `--json`을 지정하면 스크립트용 ack를 내보냅니다.

```bash
mm activity log --type tool_call --content "ran tests"
mm activity log --type decision --content "전략 X 채택" --meta '{"k":"v"}' --json
```

`--json` 옵션에서는 성공 시 `{"ok": true, ...}`, 활성 세션이 없거나 쓰기 실패 시 `{"ok": false, "reason": ...}`을 stdout으로 내보냅니다. 종료 코드는 항상 0입니다.

### `mm agent register / list / share`

멀티 에이전트 워크플로우의 에이전트 등록·조회·청크 공유를 다룹니다 — MCP `mem_agent_*` 도구의 CLI 미러입니다.

```bash
mm agent register planner --description "Planning subagent" --color "#6c5ce7"
mm agent list                        # 등록된 에이전트 + 공유 네임스페이스
mm agent list --json
mm agent share <chunk-id>                          # `shared` 로 복사
mm agent share <chunk-id> --target agent-runtime:reviewer
```

`mm agent register` 는 `agent-runtime:{agent_id}` 네임스페이스를 자동 생성하며, 같은 ID 로 다시 호출하면 메타데이터만 갱신됩니다. `agent_id` 는 `[A-Za-z0-9._-]` 만 허용 — 허용 패턴을 벗어난 ID는 거부됩니다.

`mm agent share` 는 청크를 **복제**합니다 (참조 링크 아님). 새 청크는 별도 UUID를 받고, 원본 변경은 사본에 전파되지 않습니다. 출처는 `shared-from=<원본-uuid>` 태그로만 추적됩니다.

## 진단

### `mm status`

MCP `mem_status` 도구를 터미널에서 그대로 실행하는 명령입니다. 설치 직후 "실행 파일 동작, 설정 읽기, DB 연결, 임베딩 정합성"을 에디터 없이 한 번에 확인할 때 사용합니다. `mm config show`(설정 전용)와 `mm watchdog status`(주기 체크 스냅샷)의 중간 지점입니다.

```bash
mm status                            # 인덱싱 통계 + 설정 요약 (mem_status와 동일 출력)
mm status --json                     # 기계 판독용 — 스크립트 / `jq` 파이프라인
```

v0.1.25에 추가된 명령이며, `--json` / `--format json`은 v0.3.4에 추가되었습니다. MCP 클라이언트를 띄우지 않은 상태에서 "DB 열리고 몇 건 들어있나"를 점검하는 설치 직후 간단 점검(스모크 테스트)에 적합합니다.

### `mm sync-doctor`

현재 private memory sync 저장소에 대해 여섯 가지 read-only 검사를 실행합니다. 실패는 non-zero로 종료하고 경고만으로는 실패하지 않습니다.

```bash
mm sync-doctor
```

### `mm warmup`

로컬 임베더 / 리랭커 모델을 미리 로드해 **첫** 질의가 일회성 모델 로드 비용을 물지 않도록 합니다. 선택 사항이며, 사용하지 않으면 첫 사용 시점에 지연 로드됩니다.

```bash
mm warmup                            # 지금 모델 로드 (일회성)
```

MCP 서버 기동 시 자동으로 예열하려면 `MEMTOMEM_WARMUP__ENABLED=true`를 설정하세요. 원격 프로바이더(Ollama / OpenAI / Cohere)는 미리 로드할 로컬 자원이 없어 건너뜁니다.

### `mm memory doctor`

기억 저장소의 정합성을 읽기 전용으로 점검합니다 — 디스크의 노트 폴더, 인덱스 파일, 검색용 DB 사이의 3-way 드리프트를 보고합니다(예: 서버가 꺼진 사이 추가돼 인덱싱되지 않은 파일, 끊어진 인덱스 링크). 기본은 읽기 전용이며 아무것도 수정하지 않습니다.

```bash
mm memory doctor                     # 모든 memory_dir 점검 (읽기 전용)
mm memory doctor ~/notes             # 특정 memory_dir만 점검
mm memory doctor --fix               # 끊어진 인덱스 링크 제거 미리보기 (dry-run)
mm memory doctor --fix --apply       # 실제로 끊어진 링크 제거
```

`--fix` 는 대상이 디스크에서 사라진 인덱스 포인터 라인만 제거하며, `--apply` 없이는 dry-run입니다. error 등급 발견이 있으면 종료 코드 1을 반환하므로 CI 점검에도 쓸 수 있습니다.

`dangling_wikilink`는 정보 수준입니다. 의도한 미래 참조일 수도 있고 오래된 이름일 수도 있으므로 실행을 실패시키지 않으며 `--fix`도 제거하지 않습니다.

### `mm quality`

결정론적 검색 평가 case를 관리하고 replay·report 비교·품질 gate를 실행합니다. 검색 실행과 라벨은 dev-mode Web UI의 Search Runs와 Quality Lab에서도 확인할 수 있습니다.

```bash
mm quality cases list
mm quality replay --output report.json
mm quality compare baseline.json candidate.json
mm quality gate baseline.json candidate.json
```

### `mm watchdog`

주기 헬스 체크 명령 그룹. 백그라운드 스케줄러가 남긴 스냅샷을 조회하거나, 즉시 한 번 실행합니다.

```bash
mm watchdog status                           # 최근 체크 요약
mm watchdog status --json                    # JSON 출력
mm watchdog run                              # 지금 즉시 모든 체크 실행
mm watchdog history db_size --hours 48       # 특정 체크 48시간 추이
```

스케줄러 자체는 `health_watchdog.enabled` 설정이 켜졌을 때만 MCP 서버가 백그라운드에서 돌립니다. 스케줄러 off 상태라도 `mm watchdog run`은 언제든 one-shot 실행이 가능해 오프라인 점검에 쓸 수 있습니다.

### `mm schedule add / list / run-now / delete`

크론 기반 스케줄 잡(인덱스 압축, 중요도 감쇠, dead-link 정리, 중복 검사 등)을 등록·조회·실행·삭제합니다.

```bash
mm schedule add --cron "0 3 * * *" --job dedup_scan
mm schedule add --cron "0 */6 * * *" --job importance_decay --params '{"max_age_days": 90}'
mm schedule list
mm schedule list --json
mm schedule run-now <sched-id>       # 다음 발화를 기다리지 않고 즉시 실행
mm schedule delete <sched-id>
```

`--cron` 은 5필드 표현식(UTC). `--params` 는 잡별 파라미터의 JSON 딕셔너리. 디스패처는 health watchdog 루프 위에서 동작하므로, 등록된 잡이 실제로 발화하려면 `scheduler.enabled` 와 `health_watchdog.enabled` 가 모두 켜져 있어야 합니다.

## 유지보수와 라이프사이클

### `mm gc orphan-sources`

원본 파일이 더 이상 존재하지 않는 인덱스 source record를 찾습니다. 기본은 미리보기이며 `--apply`를 붙이면 orphan source와 해당 청크를 제거합니다.

```bash
mm gc orphan-sources
mm gc orphan-sources --apply
```

`mm gc orphan-projects`는 기록된 `project_root`가 더 이상 존재하지 않는 청크를 처리합니다. 기본값은 preview이며 `--apply`는 root별 확인, `--apply --yes`는 명시적 비대화 삭제입니다. 이동식 또는 잠시 unmount된 경로인지 확인한 뒤 승인하세요.

### `mm embedding-reset`

저장된 임베딩 모델/차원과 현재 설정이 어긋났을 때(주로 프로바이더 교체·재설치 경로) 상태를 점검하거나 복구합니다. `--mode`로 동작을 선택합니다.

```bash
mm embedding-reset                            # --mode status (기본): DB 저장값 vs 현재 설정 비교
mm embedding-reset --mode apply-current       # DB를 현재 설정으로 재설정 (파괴적 — 재인덱싱 필요)
mm embedding-reset --mode revert-to-stored    # 런타임 임베더를 DB 저장값에 맞춤 (비파괴적)
```

`apply-current`는 `chunks_vec`를 현재 설정의 차원으로 재생성합니다. 청크 테이블 자체는 보존되지만 모든 벡터가 삭제되므로 이후 `mm index <path>`로 재인덱싱해야 합니다. `revert-to-stored`는 설정을 바꾸지 않고 런타임만 DB 저장값으로 되돌리므로, 해당 상태를 영구화하려면 `~/.memtomem/config.json`에서 임베딩 필드를 직접 맞춰주세요.

### `mm purge --matching-excluded`

내장 자격 증명 denylist 또는 사용자 지정 `indexing.exclude_patterns`와 일치하는 이미 인덱싱된 청크를 제거합니다. 기본 동작은 dry-run이며, `--apply` 플래그를 추가해야 실제 삭제가 수행됩니다.

```bash
mm purge --matching-excluded              # dry-run — 삭제 대상 미리보기
mm purge --matching-excluded --apply      # 실제 삭제 실행
```

### `mm reset`

DB의 모든 데이터(청크, 세션, 활동 로그 등)를 삭제하고 스키마를 재초기화합니다. 임베딩 설정은 보존되므로 재설정 없이 바로 재인덱싱만 수행하면 됩니다. 기본 동작은 대상 행 수와 함께 확인 프롬프트를 띄우며 `-y`로 스킵할 수 있습니다.

```bash
mm reset                             # 확인 프롬프트 후 삭제
mm reset -y                          # 프롬프트 스킵
```

`mm embedding-reset --mode apply-current`가 벡터만 재생성하는 복구 명령이라면, `mm reset`은 인덱스 전체를 비우는 리셋입니다. 설정 파일은 건드리지 않으므로 설정까지 리셋하려면 `mm init --fresh`나 `mm uninstall`을 함께 고려하세요.

### `mm upgrade`

실행 중인 memtomem-server를 정지한 뒤 `uv tool`로 재설치합니다. `uv tool install --reinstall memtomem` 만으로는 디스크의 바이트만 교체되고, MCP 클라이언트가 이미 임포트한 서버는 이전 버전 그대로 돌아가므로 이 프로세스 정리 단계가 필요합니다.

```bash
mm upgrade                           # 최신 버전으로 재설치 (extras 자동 감지)
mm upgrade --version 0.3.12           # 특정 버전 고정
mm upgrade --extras all              # 설치할 extras 명시 (기본은 현재 설치에서 자동 감지)
mm upgrade --dry-run                 # 계획만 출력, 실제 변경 없음
```

extras는 기본적으로 현재 uv-tool 설치 내역에서 자동 감지되므로 `memtomem[all]` 사용자는 `[all]`이 유지됩니다.

### `mm uninstall`

바이너리 제거와는 별개로 `~/.memtomem/` 상태(설정·DB·프래그먼트·백업·업로드)를 정리합니다. `uv tool uninstall memtomem` 같은 패키지 매니저 명령은 바이너리만 제거하므로, 재설치 시 구 버전 상태가 그대로 남아 문제가 될 수 있습니다 — v0.1.23부터 이 간극을 닫는 전용 명령이 추가되었습니다.

```bash
mm uninstall                  # 대화형, 전체 삭제
mm uninstall -y               # 확인 프롬프트 스킵
mm uninstall --keep-config    # config.json + config.d/* + 백업 보존
mm uninstall --keep-data      # SQLite DB + ~/.memtomem/memories/ 보존
mm uninstall --force          # 서버 실행 중 안전장치 우회
```

이 명령은 기본 경로 바깥의 `storage.sqlite_path` 도 인벤토리에 포함시키고, WAL 손상 위험 때문에 MCP 서버가 살아 있을 때는 실행을 거부합니다 — 서버를 먼저 종료하거나 `--force` 로 우회하세요. 외부 에디터의 MCP 엔트리(`~/.claude.json`, `~/.codex/config.toml` 등)는 감지해서 경로만 알려주며 수정하지는 않습니다. 실행 후 마지막에 설치 컨텍스트에 맞는 바이너리 제거 명령(예: `uv tool uninstall memtomem`, `pip uninstall memtomem`)을 출력하므로 그 단계를 이어서 수행하면 됩니다.

> 전체 시작 가이드는 [빠른 시작](/ko/guides/quickstart/)을 참조하세요.
