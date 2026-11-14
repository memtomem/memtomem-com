---
title: STM CLI 레퍼런스
description: memtomem-stm 프록시를 관리하는 mms 명령 전체를 설정·등록, 관련 기억 제시·훅, 진단·튜닝, 프로젝트·호스트 순으로 정리하고 --json 실패 문서 형식을 설명합니다.
---

`mms` 명령은 `memtomem-stm` v0.7.8 패키지와 함께 설치됩니다. 이 페이지에는 최상위 명령을 빠짐없이 정리했습니다. 설치된 버전이 지원하는 정확한 옵션은 `mms <command> --help`, 버전은 `mms --version` 또는 `mms version`으로 확인하세요.

STM으로 서버 설정을 가져와도 원래 등록 정보는 보존됩니다. 결과가 만족스럽지 않으면 `mms eject`로 원래 MCP 클라이언트 설정에 복원할 수 있습니다.

<a id="명령어"></a>

<a id="명령"></a>

## 설정·등록

### `mms init`

가장 빠르게 동작을 확인하려면 결과가 일정한 내장 읽기 전용 데모를 만들고, 감지된 클라이언트에 등록한 뒤 전체 진단을 실행하세요.

```bash
mms init --demo --client auto
mms doctor
```

선택 옵션을 지정하지 않으면 설정 도우미가 연결할 서버를 묻고, 필요하면 연결을 확인한 뒤 프록시 설정 저장과 클라이언트 등록을 진행합니다. 클라이언트 선택값은 `auto`, `claude`, `codex`, `json`, `skip`입니다. `--mcp claude|json|skip`은 이전 버전과의 호환을 위해 유지합니다.

| 옵션 | 설명 |
|---|---|
| `--config PATH` | 프록시 설정 경로(기본 `~/.memtomem/stm_proxy.json`) |
| `--no-validate` | 선택적 연결 확인 생략 |
| `--client auto\|claude\|codex\|json\|skip` | 현재 클라이언트 등록 흐름 선택 |
| `--mcp claude\|json\|skip` | 이전 등록 흐름의 호환 표기 |
| `--resume` | 프록시 설정이 있으면 클라이언트 등록부터 이어서 진행 |
| `--demo` | 결과가 일정한 내장 읽기 전용 서버 설정 |
| `--freshness live\|balanced\|reuse` | 응답 캐시 최신성 설정(기본 `balanced`) |
| `--allow-project-configs` | 프로젝트 내부의 MCP 설정 탐색 허용 |
| `--replace-registration` | 선택된 클라이언트의 기존 등록 교체 |
| `--save-unverified` | 연결 확인에 실패해도 설정 저장 |
| `--json` | JSON 결과 문서 하나 출력 |
| `--prune-originals` | 가져오기에 성공한 뒤 클라이언트의 원본 직접 등록 제거 |
| `--lang en\|ko` | 토큰 예산 언어 설정. `ko`는 CJK 전용 비율과 상한을 기록 |

`--lang ko`는 `chars_per_token=1.85`, `default_max_result_chars=8500`, 서버별 `max_result_tokens=2000`처럼 한국어·CJK(한중일) 문자에 맞춘 토큰 환산 기본값을 함께 설정합니다. 대화형 터미널이 아닌 환경에서 `--lang`을 생략하면 `en`을 사용합니다.

설정 파일이 이미 있으면 `mms init`은 보통 중단됩니다. 중단된 클라이언트 등록을 이어 가려면 `--resume`, 서버를 추가하려면 `mms add`, 프록시 설정을 바꾸지 않고 다른 클라이언트에 등록하려면 `mms register`를 사용하세요.

### `mms register`

`mms init` 이후에 MCP 클라이언트 등록 절차만 다시 실행합니다. 초기 설정에서 `skip`을 선택했거나 클라이언트를 재설치한 뒤 다시 등록할 때 유용합니다.

```bash
mms register --client auto           # 감지된 지원 클라이언트
mms register --client claude         # Claude Code
mms register --client codex          # Codex
mms register --client json           # 현재 디렉터리에 .mcp.json 작성
mms register --client skip           # 수동 등록 안내 출력
```

전체 옵션은 `--config`, `--client auto|claude|codex|json|skip`, 호환 `--mcp claude|json|skip`, `--replace-registration`, `--json`입니다. 반복 실행해도 안전하며 교체를 요청하지 않으면 기존 등록을 유지합니다.

`mms register`는 신뢰할 수 없는 작업 디렉터리가 `sys.path` 맨 앞에 추가되지 않도록 `<python> -P -m memtomem_stm` 형태로 등록하며, `mms init --demo`는 `args: ["-P", "-m", "memtomem_stm.demo_server"]`를 기록합니다(`GHSA-2p94-5932-5f3p`). 0.7.8 이전에서 업그레이드할 때는 프로젝트별 `.mcp.json`에서 `mms register --client json --replace-registration`, Claude Code 사용자 범위는 `mms register --client claude --replace-registration`, Codex는 `mms register --client codex --replace-registration`을 실행해 기존 등록을 갱신하고(기본 경로가 아닌 설정으로 등록했다면 같은 `--config <path>` 전달), 직접 작성한 호스트 설정은 `"-m"` 앞에 `"-P"`를 추가하세요. `stm_proxy.json`에 이전 데모 업스트림이 있다면 `mms init --demo --resume`은 기존 항목을 바꾸지 않으므로 `upstream_servers.demo.args`를 `["-P", "-m", "memtomem_stm.demo_server"]`로 수정합니다.

### `mms add <name>`

STM이 중계할 MCP 서버를 등록합니다.

```bash
mms add filesystem --command filesystem-server --prefix fs
mms add github --command github-mcp --args "--token $GH_TOKEN" --prefix gh
mms add remote-api --transport streamable_http --url https://example/mcp --prefix api
mms add filesystem --command filesystem-server --prefix fs --validate
```

| 플래그 | 설명 |
|------|-------------|
| `--command` | 실행할 서버 명령(stdio 연결) |
| `--args` | 공백으로 구분된 인수 |
| `--prefix` | 도구 네임스페이스 (`--from-clients` 사용 시에만 생략 가능). 도구는 `{prefix}__{tool}` 형태 |
| `--transport` | `stdio` (기본), `sse`, `streamable_http` |
| `--url` | `sse` / `streamable_http` 엔드포인트 URL |
| `--env KEY=VALUE` | 연결한 서버 프로세스에 전달할 환경 변수(반복 가능) |
| `--header KEY=VALUE` | `sse` / `streamable_http`용 평문 헤더(반복 가능, 설정 파일 권한 `0600`) |
| `--compression` | `auto` (기본), `none`, `truncate`, `selective`, `hybrid` |
| `--max-chars` | 서버별 문자 예산. 생략하면 설정에 값을 쓰지 않으므로 모델에 맞춰 조정되는 전역 예산(`default_max_result_chars`, 기본 16,000자)을 상속하며, 지정하면 그 값으로 고정 |
| `--validate` | 저장 전에 MCP `initialize`와 `list-tools`로 서버 확인 |
| `--timeout` | `--validate`에서 서버별로 기다릴 시간(초, 기본 `10`) |
| `--json` | JSON 결과 문서 하나 출력 |

#### MCP 클라이언트에서 일괄 가져오기

`mms add --from-clients`(별칭 `--import`)는 Claude Desktop, Claude Code, 프로젝트 `.mcp.json`에 등록된 서버를 찾아 STM 프록시 설정(`stm_proxy.json`)으로 한꺼번에 가져옵니다. `mms init`과 같은 탐색·선택 화면을 사용하며 이미 등록된 서버는 건너뜁니다. 클라이언트 설정을 `~/.mms/registry.toml`로 옮기는 [`mms import`](#mms-import)와는 다른 명령입니다.

```bash
mms add --from-clients               # 대화형 일괄 가져오기
mms add --import                     # 별칭
mms add --from-clients --prune       # 가져온 뒤 원본 클라이언트에서 직접 등록 제거
```

가져오기에 성공하면 같은 서버가 STM 프록시 경로와 원본 클라이언트의 직접 경로 양쪽에 표시됩니다. 직접 경로는 압축·캐시·관련 기억 검색을 거치지 않습니다. 가져온 항목에는 원본 클라이언트 종류와 기존 등록 정보 사본을 함께 기록하므로 [`mms eject`](#mms-eject-name)로 언제든 원래 상태를 복원할 수 있습니다.

`--prune` 옵션을 지정하거나 대화형 터미널의 확인 질문에서 동의하면(기본값 **No**), Claude Code 범위별 `claude mcp remove`와 Claude Desktop JSON 파일의 안전한 재작성을 통해 이중 등록을 정리합니다. 제거 전에는 각 항목을 `~/.memtomem/pruned_upstreams.json`에 백업하므로 이 작업도 되돌릴 수 있습니다. 비대화형 환경에서 `--prune` 없이 실행하면 안내 경고와 직접 등록을 제거하는 명령만 출력합니다.

`NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`와 함께 쓸 수 없습니다. `--prune`은 반드시 `--from-clients` / `--import`와 함께 써야 합니다.

<a id="host-discovery"></a>

#### 클라이언트 설정 탐색

`mms init`, `mms add --from-clients`, `mms prune`은 Claude Code와 같은 방식으로 Claude Code 설정을 읽습니다. `CLAUDE_CONFIG_DIR`가 절대 경로이면 `$CLAUDE_CONFIG_DIR/.claude.json`, 아니면 `~/.claude.json`을 읽고, 그 안에서는 저장소 루트의 프로젝트 항목을 사용하므로 하위 디렉터리에서도 루트에 등록한 서버를 찾습니다. 연결된 worktree, submodule, 심볼릭 링크로 연결된 `.git` 안에서는 프로젝트 항목을 읽지 않습니다. Claude Code가 어느 파일을 읽는지 STM이 판단할 수 없으면(예: 상대 경로이거나 비어 있는 `CLAUDE_CONFIG_DIR`, 설정된 `CLAUDE_CODE_CUSTOM_OAUTH_URL`, Claude Code 설정 디렉터리의 이전 형식 `.config.json`) Claude Code의 사용자·프로젝트 서버를 읽지 않고 안내를 출력합니다. `<cwd>/.mcp.json`은 이 경우에도 읽습니다. `mms import`, `mms host`, `mms eject`도 같은 규칙을 따릅니다.

`mms init`, `mms add --from-clients`, `mms prune`은 STM을 경유하지 않는 서버는 가져오지 않고 이름만 별도로 안내합니다.

- **Claude Code 플러그인 서버:** `claude`가 `PATH`에 있으면 현재 디렉터리에서 `claude plugin list --json`을 실행하고, 활성화된 플러그인이 등록한 MCP 서버를 `/mcp`에 표시되는 이름(`plugin:<plugin>:<server>`)으로 보여 줍니다. STM은 이 서버를 중계하지 않습니다. STM을 거치게 하려면 `mms add … --validate`로 추가한 뒤 플러그인 쪽 서버를 비활성화합니다. `--json`은 이 목록을 `plugin_bypass`에 담고, `/mcp`에서 비활성화한 서버를 확인하지 못한 이유를 `plugin_bypass_disables_unread`에 담습니다(`"no_key"`, `"no_config"`, 기록된 이유가 없으면 `null`).
- **Codex 등록 서버:** 해당 명령의 탐색 범위 밖에 있는 Codex MCP 등록을 이름만 보여 줍니다(`--json`: `codex_extra_servers`, 목록을 가져오지 못하면 `null`).

`mms import`와 `mms host status|scan|sync`는 같은 서버를 이 JSON 필드 없이 stderr에 출력하며, 플러그인 서버를 가져오거나 제거하지 않습니다. `mms doctor`는 이 서버들을 WARN 항목으로 보고합니다. 이 클라이언트 CLI 조회는 선택 사항이며 네트워크 요청을 보낼 수 있습니다. 건너뛰려면 `MMS_NO_HOST_PROBE=1`을 설정합니다.

### `mms list`

등록한 모든 서버의 상세 정보를 보여 줍니다.

```bash
mms list                             # 사람이 읽기 좋은 표
mms list --json                      # 스크립트용 JSON
```

표의 **ORIGIN** 열에는 각 서버를 가져온 위치가 표시됩니다. 값은 원본 클라이언트 종류(`mcp-json`, `claude-user`, `claude-project`, `claude-desktop`)이며, `mms add`로 직접 등록한 항목은 `-`로 표시합니다. 값 뒤의 `*`는 클라이언트의 원본 등록을 정리해 현재 STM을 통해서만 호출된다는 의미입니다. `mms eject <name>`로 복원할 수 있습니다. v0.1.32부터는 **SURFACING** 열도 표시하므로 서버별 `mms surfacing` 설정을 여기서 확인할 수 있습니다.

**SOURCE** 열은 각 서버 정의의 출처를 `file`, `env`, `file+env`로 표시하며, 환경 변수로만 정의된 서버도 행으로 나타납니다. **COMPRESSION** 열은 파일에 적힌 값이 아니라 실제로 적용되는 서버 기본 전략을 보여 줍니다. 서버가 `compression`을 생략하면 `default_compression`을 상속하고 `MEMTOMEM_STM_PROXY__*` 환경 변수 재정의도 반영합니다. 설정 파일이 검증에 실패하면 서버 시작 시 실제로 사용하는 환경 변수·기본값 기반 설정을 보여 주며, 시작 시 거부되는 환경 변수처럼 실행 설정을 만들 수 없을 때만 `unknown`으로 표시합니다. 서버가 하나 이상이면 표 아래에 `COMPRESSION shows the resolved server default; tool overrides may differ.` 줄과, 도구별로 명시한 `compression`마다 `"server"/"tool": strategy (tool override)` 줄이 이어집니다. 표에서는 URL의 사용자 정보, 쿼리 문자열, 프래그먼트를 지우고, 환경 변수가 적용된 행(`env`, `file+env`)의 인자는 `[args hidden]`으로 가립니다. 서버별 `max_result_chars`는 도구별 재정의로 달라질 수 있어 열로 표시하지 않으므로 `--json`이나 설정 파일에서 확인합니다.

등록한 서버가 없고 실행 설정이 유효하면 `mms list`는 `No upstream servers configured.` 다음 줄에 ``Run `mms add` (or `mms init`) to register an upstream.``를 출력합니다. 설정 파일이나 프록시 환경 변수가 검증에 실패한 경우에는 서버를 추가해도 해결되지 않으므로 이 안내를 출력하지 않습니다.

표의 열 구성은 바뀔 수 있으므로 스크립트에서는 `--json`을 사용하세요. `--json`의 `servers` 맵은 여전히 파일 내용을 그대로 보여 주고, 실제 실행 기준의 값은 `effective_servers`, `server_sources`, `effective_compression`(서버 이름별 `strategy`, `source`(`server` 또는 `global`), `tool_overrides`)에서 확인합니다. 이 값들은 실행 설정을 만들 수 없을 때뿐 아니라 실제 설정에 서버가 하나도 없을 때도 빈 객체(`{}`)가 되므로, 설정 실패 여부는 `config_valid`와 `config_error`로 판단합니다. 각 `effective_servers` 항목에는 서버에 적용되는 `delivery_format`과, `tool_overrides` 항목이 있는 도구별 적용 형식인 `tool_delivery_overrides`도 포함됩니다.

### `mms status`

프록시가 설정되어 있고 올바른 설정 파일을 가리키는지 요약해서 보여 줍니다. 서버별 상세 정보는 포함하지 않습니다.

```bash
mms status
mms status --json                    # 스크립트용 JSON
```

v0.1.32부터 `status`는 설정 경로, `enabled` 값, 스키마 검증 경고, `Servers: N (P host-pruned)`를 요약합니다. 서버별 압축 전략과 관련 기억 제시 상태는 `mms list`에서 확인합니다. `status --json`은 민감 정보를 가린 `servers` 맵 전체와 `server_count` / `pruned_count` 키를 반환하며, `effective_server_count`(환경 변수 때문에 시작할 수 없는 설정이면 `null`)도 포함합니다. `enabled`는 시작 시 설정 해석이 성공하면 환경 변수 재정의까지 반영한 실제 값입니다.

사람이 읽는 출력의 마지막 줄은 다음에 할 일을 안내합니다. 설정 파일 오류에는 ``Run `mms config validate` to fix the proxy file.``, 환경 변수 때문에 서버를 시작할 수 없을 때(예: `MEMTOMEM_STM_PROXY=[]`)는 `Fix the runtime configuration named in the warning above first.`를 출력합니다. 서버가 등록되어 있으면 `mms list`와 `mms health`를, 그 밖의 경우에는 `mms add`를 안내합니다. `--json`에는 이 줄이 없습니다.

`list`와 `status`는 서버 시작 시와 같은 기준으로 설정을 검증하므로, 시작 시 거부되는 환경 변수가 있으면 설정을 유효하지 않은 것으로 표시합니다. `config_error`에는 값 없이 오류 위치와 유형 코드만 표시합니다. 위치에는 환경 변수나 헤더 이름 같은 키가 포함될 수 있지만 값은 포함되지 않습니다. 파일 오류의 자세한 내용은 `mms config validate`로 확인합니다.

### `mms remove <name>`

등록한 서버를 제거합니다.

```bash
mms remove filesystem                # 확인 프롬프트
mms remove filesystem -y             # 확인 생략
```

가져온 서버를 제거하면 원본 클라이언트 등록을 잃지 않고 복원할 수 있도록 `mms eject` 안내도 함께 출력합니다.

### `mms prune`

`mms init` 또는 `mms add --import`로 서버를 STM에 등록한 뒤, 원본 MCP 클라이언트(Claude Code, Claude Desktop, 프로젝트 `.mcp.json`)에 남아 있는 직접 등록을 한꺼번에 제거합니다. 그러면 모든 도구 호출이 STM 프록시 한 경로로만 흐르며 압축·캐시·관련 기억 검색을 거칩니다. 사용자가 직접 실행해야 하는 명령입니다.

```bash
mms prune --all                      # 이중 등록된 서버 모두
mms prune filesystem github          # 이름 지정 (한 개 이상)
mms prune --all --dry-run            # 무엇을 지울지만 미리보기
mms prune --all -y                   # 비대화 — 확인 프롬프트 생략
```

제거하기 전에 각 항목은 `~/.memtomem/pruned_upstreams.json`에 백업되므로 작업을 되돌릴 수 있습니다 — 원본 클라이언트 등록으로 복원하려면 [`mms eject`](#mms-eject-name) 를 사용하세요. STM 자체 설정 파일(`~/.memtomem/stm_proxy.json`)은 변경하지 않습니다.

### `mms eject <name>`

`prune`과 반대로 동작합니다. 가져온 서버를 원래 MCP 클라이언트 설정에 복원하고, 복원이 확인된 뒤에만 STM 항목을 제거합니다. STM 프록시를 시험한 뒤 사용하지 않기로 하면 안전하게 원래 상태로 되돌릴 수 있습니다. 여러 이름을 한꺼번에 지정할 수도 있습니다.

```bash
mms eject filesystem                 # 원본 클라이언트 설정에 복원 후 STM 항목 제거
mms eject filesystem github          # 여러 개 한 번에
mms eject filesystem --dry-run       # 무엇을 복원할지만 미리보기
mms eject filesystem --keep          # 클라이언트에 복원하되 STM 항목은 유지(이중 등록)
mms eject filesystem --yes           # 비대화 — 확인 프롬프트 생략
```

가져올 때 기록한 원본 등록 정보를 클라이언트에 다시 쓰고, 설정을 재확인한 뒤에만 STM 항목을 삭제합니다. 어느 단계에서 실패해도 서버는 적어도 한 곳에 남습니다. 최악의 경우에도 이중으로 등록될 뿐 서버가 사라지지는 않습니다.

복원 대상 클라이언트 설정을 읽을 수 없거나 형식이 잘못되었을 때, 또는 Claude Code 프로젝트 항목이 연결된 worktree, submodule, 심볼릭 링크로 연결된 `.git`에서 기록되었을 때는 `--force`를 지정해도 `eject`가 거부됩니다. Claude Code가 어느 설정 파일을 읽는지 STM이 판단할 수 없을 때도 Claude Code 대상 복원은 거부됩니다([클라이언트 설정 탐색](#host-discovery) 참고). 이런 경우에는 `stm_proxy.json`의 `upstream_servers.<name>.origin.original`을 참고해 직접 복원합니다.

| 플래그 | 설명 |
|------|-------------|
| `--to TARGET` | 출처가 기록되지 않은 항목의 복원 대상 지정 (`claude-user` / `claude-project[:PATH]` / `mcp-json[:PATH]` / `claude-desktop`). 출처가 이미 기록된 항목에서는 이 옵션을 무시합니다 |
| `--keep` | 클라이언트에 복원하되 STM 항목 유지(이중 등록) |
| `--force` | 같은 이름이지만 내용이 다른 클라이언트 항목 덮어쓰기 |
| `--allow-argv-secrets` | 비밀값으로 분류된 내용을 포함한 `claude mcp add-json` 실행 허용. `argv`가 프로세스 목록에 노출될 수 있음 |
| `--accept-schema-loss` | 복원한 클라이언트 항목이 원본과 구조적으로 일치하지 않아도 STM 항목 제거. 기본값은 STM 항목을 유지하고 실패 처리. 복원 후 확인 단계에서 클라이언트 설정을 읽을 수 없거나 항목을 찾지 못하면 이 옵션을 지정해도 STM 항목을 유지 |
| `--dry-run` | 계획만 출력, 쓰기 없음 |
| `--yes` / `-y` | 확인 프롬프트 생략 (스크립트 / CI / 비-TTY) |

## 관련 기억 제시·훅

### `mms surfacing <server> [on|off]`

특정 서버의 관련 기억 자동 제시를 켜거나 끕니다. 상태 인수를 생략하면 현재 값만 출력합니다.

```bash
mms surfacing filesystem             # 현재 상태 확인
mms surfacing filesystem off         # 이 서버의 서피싱 비활성화
mms surfacing filesystem on          # 다시 활성화
```

`surfacing_enabled` 값은 공용 프록시 설정(`stm_proxy.json`)에 기록됩니다. 실행 중인 프록시에도 재시작 없이 즉시 반영되며, 같은 `mms` 프록시를 쓰는 모든 MCP 클라이언트가 이 설정을 공유합니다. 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.

### `mms hook`

지원하는 클라이언트의 내장 도구 호출에 STM의 관련 기억 검색을 연결합니다. Claude Code와 호환 클라이언트는 `PostToolUse` 훅에서 이 명령을 호출합니다. JSON 입력은 표준 입력으로 받고, `mms hook`은 관련 기억을 담은 `additionalContext`가 포함될 수 있는 훅 결과를 출력합니다. Bash 출력 압축은 별도 기능이며 `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED=1`로 직접 켜야 합니다.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read|Grep|Glob|WebFetch|Bash",
        "hooks": [{ "type": "command", "command": "mms hook" }]
      }
    ]
  }
}
```

훅은 항상 종료 코드 0으로 끝납니다. 관련 기억 검색, 데몬, 압축 중 어느 단계에서 문제가 생겨도 클라이언트 도구의 원래 출력은 바꾸지 않고 그대로 전달합니다.

| 옵션 | 설명 |
|---|---|
| `--host claude` | 클라이언트의 입력·응답 형식(현재 Claude Code) |
| `--use-daemon` / `--no-daemon` | 이 호출에서 데몬 사용 여부 재정의 |
| `--surfacing-timeout-seconds N` | 데몬을 쓰지 않는 관련 기억 검색의 제한 시간 재정의 |
| `--daemon-timeout-seconds N` | 훅과 데몬 사이 왕복 제한 시간 재정의 |
| `--persist-query-text` / `--no-persist-query-text` | 이 훅 호출의 검색어 원문 보존 여부 재정의 |

### `mms daemon`

`mms hook`이 사용하는 로컬 관련 기억 검색 데몬을 관리합니다. 데몬은 기본으로 활성화되며(`MEMTOMEM_STM_HOOK__USE_DAEMON=1`), 조건을 충족하는 첫 훅 호출에서 자동으로 시작됩니다. 보통은 직접 시작할 필요가 없습니다.

```bash
mms daemon status                    # 데몬 실행 여부 확인
mms daemon status --json             # 스크립트용 상태
mms daemon start                     # 직접 시작
mms daemon stop                      # 현재 설정의 데몬 중지
mms daemon stop --all                # 다른 설정 fingerprint의 데몬도 함께 중지
mms daemon restart                   # 이 설정을 중지한 뒤 한 번 새로 시작
mms daemon run                       # 포그라운드에서 서버 계속 실행
```

데몬은 현재 설정에 맞는 LTM MCP 세션 하나를 미리 연결해 둡니다. 호출할 때마다 세션을 새로 열도록 하려면 `MEMTOMEM_STM_HOOK__USE_DAEMON=0`으로 설정하세요. 데몬을 사용할 수 없을 때 새 세션을 여는 방식으로 대신 처리하려면 `MEMTOMEM_STM_HOOK__FALLBACK=cold`를 설정합니다. 데몬이 `busy`나 `expired`로 응답하면 이 설정과 관계없이 해당 호출의 관련 기억 추가를 건너뜁니다. 다른 설정 fingerprint로 실행 중인 데몬은 환경 변수가 다른 STM 프로세스(예: MCP가 실행한 서버와 셸·hook)가 사용 중인 데몬일 수 있으므로, `--all`로 중지하기 전에 `mms daemon status`로 확인합니다.

훅과 데몬 사이 프로토콜 버전은 데몬 식별값에 포함되며, 0.7.0부터 v9입니다. 릴리스의 업그레이드 안내에 프로토콜 변경이 있으면, STM을 실행하는 MCP 클라이언트를 종료하고 **업그레이드 전에** 이전 빌드로 `mms daemon stop`을 실행합니다. 새 빌드는 이전 빌드가 시작한 데몬에 접근할 수 없고, pending SQLite 저장소를 함께 쓰는 프로세스는 같은 버전이어야 하기 때문입니다. 프로토콜 버전이 바뀌지 않은 업그레이드(예: 0.7.8 업그레이드)에서도 새 코드와 `-P` 실행 인자가 적용되도록 업그레이드 후 MCP 클라이언트를 종료하고 이전 데몬을 중지하세요(macOS·Linux에서는 `mms daemon stop --all`, Windows에서는 `--all`이 종료 신호를 보내지 못하므로 작업 관리자에서 이전 데몬 프로세스를 종료하며, OTLP `endpoint`가 검증에 실패하면 `mms daemon`이 설정을 읽으므로 먼저 수정합니다). 전체 절차는 upstream [업그레이드 안내](https://github.com/memtomem/memtomem-stm/blob/v0.7.8/docs/guides/operations.md#upgrading)를 참고하세요. `idle_timeout_seconds=0`으로 고정한 데몬은 스스로 종료되지 않으므로 `mms daemon stop --all`로 중지합니다. Windows에서는 이 명령으로 종료할 수 없으므로 작업 관리자에서 프로세스를 종료하세요.

`mms daemon stop`은 처리한 모든 데몬이 종료를 마쳤거나, 실행 중인 데몬이 없거나, 발견한 기록이 오래된 것일 때만 종료 코드 0을 반환합니다. 그 밖의 경우에는 stderr에 이유를 출력하고 종료 코드 1을 반환합니다. 예를 들어 5초 동안 대기한 뒤에도 데몬의 수명 주기 잠금(lifetime lock)이 해제되지 않았거나, 프로세스에 종료 신호를 보낼 수 없거나, Windows에서 종료 신호로만 중지할 수 있는 데몬이 여전히 연결을 수신 중인 경우입니다. `--all`은 모두 합쳐 최대 10초까지 기다리며, `data_dir`가 있지만 목록을 읽을 수 없으면 다른 설정의 데몬을 하나도 중지하지 않고 종료 코드 1을 반환합니다. `mms daemon restart`는 중지 단계가 성공한 경우에만 새 데몬을 시작합니다.

`mms daemon status`는 handshake가 없지만 lifetime lock이 잡혀 있거나 확인할 수 없으면 현재 설정의 데몬을 `starting` 또는 `unknown`으로 표시합니다. `mms daemon status --json`은 다른 설정 fingerprint로 실행 중인 데몬을 `foreign` 목록으로 보여 줍니다. 각 항목에는 `fingerprint`, `pid`, `host`, `port`, `idle_shutdown_seconds`, `exits_when_idle`이 포함되며 인증 토큰은 포함되지 않습니다. `exits_when_idle`은 유휴 시 스스로 종료하는 데몬이면 `true`, 종료하지 않는 데몬(`idle_shutdown_seconds`가 `null`)이면 `false`이고, 값이 없거나 유효하지 않은 경우에는 `null`(알 수 없음)로 표시됩니다. 각 항목에는 `listening`과 `lock`도 포함됩니다. 기록을 읽을 수 없는 데몬은 lock이 잡혀 있거나 확인할 수 없는 동안에만 목록에 나타나며, `handshake_unreadable: true`와 함께 `pid`, `host`, `port`, `idle_shutdown_seconds`, `exits_when_idle`이 `null`로 표시됩니다. `data_dir`가 있지만 목록을 읽을 수 없으면 `foreign`은 `null`이고 `foreign_error`에 오류 종류가 담깁니다. `queue` 객체와 텍스트 출력의 `queue:` 줄에는 `pre_auth_evictions`가 있습니다. 데몬은 인증 전 연결을 최대 64개까지 유지하며, 이를 넘으면 가장 오래된 인증 전 연결을 끊고 이 값을 1 늘립니다.

## 진단·튜닝

### `mms health`

등록한 모든 서버의 MCP 연결 상태를 점검합니다. 출력 형식은 `status` / `list`와 일관됩니다.

```bash
mms health                           # 사람이 읽기 좋은 출력
mms health --json                    # 스크립트용 JSON
mms health --timeout 5               # 서버별 연결 타임아웃(초)
mms health --names                   # 64자 MCP 도구명 한도를 넘는 도구도 함께 보고
```

`--names`는 `mcp__<server>__<prefix>__<tool>`의 전체 길이가 MCP의 64자 제한(#261)을 넘어 등록 후 표시되지 않는 도구를 찾을 때 사용합니다.

점검 대상은 설정 파일의 서버 항목에 환경 변수 재정의(`MEMTOMEM_STM_PROXY` / `MEMTOMEM_STM_PROXY__UPSTREAM_SERVERS…`)를 반영한 목록이며, `mms doctor`가 확인하는 목록과 같습니다. 환경 변수로만 정의한 서버도 점검하고 `--json`의 `servers`에 포함합니다. `command`처럼 환경 변수로 재정의한 필드는 환경 변수 값으로 점검합니다. 실행 설정이나 재정의를 반영한 목록이 검증에 실패하면 설정 파일에 선언된 서버를 점검합니다. 설정 파일의 `upstream_servers`는 객체여야 하며, `null`이나 목록이면 점검 전에 종료 코드 1로 끝납니다. `"bad": 7`처럼 객체가 아닌 서버 항목 하나는 건너뛰고 잘못된 설정으로 보고하며, 이때 종료 코드는 0입니다.

`health`는 서버별 **회로 차단기** 상태도 표시합니다. v0.1.32부터 기본으로 활성화됩니다. 연속 3회 호출에 실패하면 해당 서버의 도구는 약 60초 동안 `circuit_open`을 바로 반환하므로 호출할 때마다 재시도와 제한 시간을 모두 소진하지 않습니다. 캐시된 응답은 계속 제공하고 다른 서버에는 영향을 주지 않습니다. `stm_proxy.json`에서 해당 서버에 `circuit_max_failures: 0`을 지정하면 매번 다시 시도하는 이전 동작으로 돌아갑니다.

`health`와 `doctor`는 서버 시작 시와 같은 기준으로 설정을 검증합니다. 예를 들어 `MEMTOMEM_STM_PROXY='[1]'`처럼 시작 시 거부되는 환경 변수가 있으면 `health`는 `config_valid: false`를 보고합니다. 오류 표시에는 거부된 값과 예외 메시지를 포함하지 않으며, 일부 항목은 다음과 같이 가립니다.

- 설정 오류는 오류 위치와 유형만 표시합니다.
- 서버 확인에 실패하면 예외 메시지 대신 `ConnectError`, `HTTP 401 (HTTPStatusError)`, `MCPError -32602 (Invalid params)`처럼 예외 유형만 표시합니다. `mms add --validate`와 가져오기 검증도 같습니다. 원래 메시지가 필요하면 서버 명령을 직접 실행하거나 엔드포인트에 직접 접속해 확인합니다.
- URL에서는 쿼리 문자열과 프래그먼트를 지웁니다.
- 피드백·지표 DB의 SQLite 오류는 `DatabaseError (SQLITE_CORRUPT)`처럼 표시합니다.
- stdio LTM 서버의 실행 인자는 `<command> [args hidden]`으로 가립니다. `--json`의 `surfacing.ltm_server.args`는 인자마다 `<REDACTED>` 하나로 표시하므로 개수는 확인할 수 있습니다. 실제 값은 `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` 설정에서 직접 확인합니다.

`--json`에는 `doctor`가 출력하는 점검 행과 같은 `surfacing.runtime_profile_checks`가 포함됩니다.

### `mms doctor`

상태, 연결, 설정 검사를 하나의 PASS/WARN/FAIL 보고서로 실행합니다. 기본 실행은 상태를 바꾸지 않으며 LTM도 검색하지 않습니다. FAIL이 있으면 종료 코드 1, WARN만 있으면 종료 코드 0을 반환합니다.

```bash
mms doctor
mms doctor --json --timeout 5
mms doctor --measure-ltm             # 이미 실행 중인 데몬으로 읽기 전용 검색 5회
```

옵션은 `--config`, `--json`, `--timeout`, `--measure-ltm`입니다. 측정 모드는 데몬이 없을 때 새로 시작하지 않습니다.

시작 시 거부되는 환경 변수가 있으면 `config schema` 검사가 FAIL이 되어 종료 코드 1을 반환합니다. 관련 기억 제시 기회 기록에 집계할 내용이 있으면 참고용 `surfacing opportunities` 검사를 표시합니다. 업그레이드한 프로세스가 `stm_feedback.db`를 처음 열기 전까지는 새 테이블이 없다고 보고합니다. 오류 표시 방식은 [`mms health`](#mms-health)와 같습니다. WARN 항목에는 STM 밖의 Codex MCP 등록(`codex_extra_servers`)과 STM을 거치지 않는 Claude Code 플러그인 서버(`plugin_bypass`)도 표시되며, `MMS_NO_HOST_PROBE=1`이면 이 조회를 건너뜁니다.

### `mms config validate`

환경 변수로 값을 덮어쓰지 않고 JSON 파일 자체를 엄격하게 검사합니다. 파일이 없거나 JSON 해석·스키마 오류 또는 알 수 없는 키가 있으면 0이 아닌 종료 코드를 반환합니다.

```bash
mms config validate
mms config validate --config ./stm_proxy.json --json
```

### `mms stats`

저장소를 새로 만들거나 이전하지 않고, 디스크에 기록된 압축·관련 기억 제시 통계를 읽습니다. 집계 대상은 전체 기간이 아니라 아직 보존된 행입니다. 압축 행은 소스별로 `proxy.metrics.max_history`개까지 남고, progressive 읽기와 관련 기억 제시 행은 각 보존 기간이 지나면 삭제됩니다.

```bash
mms stats [--config PATH] [--tool TOOL] [--source mcp|hook] [--all-time] [--json]
```

CLI는 디스크에 저장된 지표만 보여 줍니다. 현재 프로세스의 실시간 횟수는 관찰·관리 MCP 도구에서 확인하세요.

- **압축 통계 측정 기준:** 관련 기억을 덧붙이기 전의 첫 응답 텍스트를 측정하며, 이후 `stm_proxy_read_more` 읽기는 포함하지 않습니다.
  - 명시적 `progressive` 응답이 여러 조각으로 나뉘면 첫 조각과 footer만 기록합니다. 따라서 해당 도구의 절감률이 이전보다 높게 표시됩니다.
  - 측정 기준이 기록되지 않은 이전 성공 MCP 행이 있으면 경고합니다.
  - `--json` 요약에는 `initial_response_calls`, `unclassified_mcp_calls`, `measurement`가 추가됩니다.
  - 실험 기능인 [구조화 전달](/ko/stm/compression/#structured-chunk-delivery)을 사용한 호출은 별도의 `Structured delivery:` 줄(호출 수, 직렬화된 기본 문자 수, 측정한 MCP 바이트 수, `--json`: `compression.structured_delivery`)로 집계하며 절감률 계산에는 넣지 않습니다.
- **`--all-time`:** 압축 통계만 전체 기간 합계로 바꿉니다. progressive 통계와 관련 기억 제시 통계는 보존 기간 기준을 유지합니다. 전체 기간 합계는 보존된 행에, 삭제된 행을 날짜·소스·서버·도구별로 집계해 두는 `proxy_metrics_daily` 테이블의 값을 더한 것입니다. 이 테이블은 0.7.7 이상의 지표 기록 프로세스(MCP 서버, `mms hook`, `mms tune`)가 지표 DB를 처음 열 때 만들어지며, 그 전에 삭제된 행은 복구할 수 없습니다. 이 경우 **Incomplete before** 줄에 집계 누락 기준 시점과 유실된 행 수를 표시합니다. `--json`은 `compression_scope`(`retained` 또는 `all_time`)로 범위를 알려 줍니다.
- **기록 초기화:** `DELETE FROM proxy_metrics`를 먼저 실행한 다음 `DELETE FROM proxy_metrics_daily`를 실행합니다. 순서를 바꾸면 삭제되는 행이 일별 테이블에 다시 집계됩니다. 트리거가 남아 있는 동안 일별 테이블을 `DROP`하지 마세요. 이후 정리 작업이 모두 `no such table`로 실패하면서 그 정리를 일으킨 쓰기까지 롤백되고, 시작 시 정합성 확인도 실패합니다.
- **소스별 줄:** 프록시한 MCP 도구와 `mms hook`의 행이 모두 있으면, 압축 통계의 전체 합계 아래에 `mcp` 줄과 `hook` 줄을 각각의 절감률과 함께 표시합니다. 모든 행이 구조화 전달인 경우처럼 텍스트 문자 수가 없는 소스는 절감률 대신 `no text ratio`를 표시합니다. `--json`에서는 `compression_by_source`에 담기며, `--source`를 지정하면 `null`입니다.
- **Progressive delivery:** 페이지로 나눈 응답에서 만든 문자 수와 에이전트에 실제로 전달한 문자 수를 비교합니다. 기록된 읽기를 모두 세므로 같은 내용을 다시 읽으면 비율이 100%를 넘을 수 있습니다. `--tool`로는 필터링되지만 `--source`로는 필터링되지 않고, 마지막 줄에 보존된 가장 오래된 행의 시점을 표시합니다. `--json`에서는 `progressive`에 담깁니다.
- **설정 파일이 잘못된 경우:** `mms stats`는 기본값 대신 서버가 환경 변수로 만든 설정을 읽습니다. 따라서 환경 변수로 옮긴 DB를 읽고, `Enabled` / `Servers` 줄(`--json`의 `enabled` / `servers`)도 환경 변수 값을 표시합니다.
- **오류 집계:** 프록시 자체 호출 경로에서 기록한 `lock_timeout`과 `internal_error` 행도 오류로 집계합니다. 업그레이드 전에 기록된 행은 다시 쓰지 않습니다.
- **관련 기억 제시 통계:**
  - 실제로 표시한 이벤트만 제시 횟수로 집계합니다.
  - 보류(holdout)된 호출은 `withheld (holdout)` 줄에, 제시 기회 기록은 `opportunities` 줄에 따로 표시합니다. 두 줄 모두 집계할 내용이 있을 때만 나타납니다.
- **도구별 `tuner_calls`:** 보존된 행 기준 `--json`에서 도구별 `calls`는 해당하는 모든 행을 세고, `tuner_calls`는 자동 튜너가 사용하는 행만 셉니다. metadata bypass로 표시된 행은 튜너 프로필에서 제외되므로 `tuner_calls`에서도 빠집니다. `compression_strategy` 열이 없는 이전 DB에서는 모든 행을 셉니다. `--all-time`의 도구별 항목에는 `tuner_calls`가 없습니다.
- **알 수 없는 값:** STM이 기록하지 않는 평가나 제시 결정 값은 `other`로 집계합니다.
- **`--json` 오류 필드:** `compression.error`와 `surfacing.error`의 SQLite 오류는 `DatabaseError (SQLITE_CORRUPT)`처럼 유형만 표시합니다.

### `mms tune`

기존 지표·피드백 저장소를 바탕으로 도구별 압축 권장 설정을 미리 보거나 적용합니다.

```bash
mms tune [--config PATH] [--since-hours 24] [--tool TOOL] [--json]
mms tune --apply [--yes]
```

기본값은 미리보기입니다. `--apply`는 시각을 붙인 백업을 만든 뒤 설정 잠금을 획득해 선택한 `tool_overrides`를 저장합니다. 실행 중인 프록시에도 재시작 없이 반영됩니다. `mms stats`와 달리 `tune`은 기존 저장소에 여러 번 실행해도 결과가 같은 스키마 이전을 수행할 수 있습니다.

`--tool ""`처럼 빈 필터는 어떤 도구와도 일치하지 않습니다. 모든 도구를 분석하려면 `--tool`을 생략하세요. 따라서 `mms tune --apply --yes --tool ""`는 아무 도구의 재정의도 쓰지 않습니다.

현재 설정에서 해석한 전략이 `none`인 도구에는 `max_result_chars` 권장을 제시하지 않습니다. 이 경로는 예산을 읽지 않기 때문입니다. 명시적 `progressive` 도구는 예산이 직렬화된 각 프레임의 상한이 되는 실험 기능 [구조화 전달](/ko/stm/compression/#structured-chunk-delivery)(`delivery_format: "structured"`)에서만, `missing_example` 피드백에 따른 상향 권장을 받습니다. 이 상향 권장은 현재 예산보다 클 때만 제시하며 현재 값을 `current`로 보여 줍니다. 피드백이 3건 이상이고 그중 `missing_example` 비중이 가장 높은 도구에는 예산 축소를 권장하지 않습니다. `token_estimation_mode: "unicode"`에서 서버의 토큰 예산을 물려받는 도구는 예산 권장을 받지 않습니다. 압축률 기반 권장은 새 측정 기준으로 기록된 행만 사용하므로, 이전 행만 있는 도구는 새 호출이 쌓일 때까지 이 권장을 받지 않습니다.

### `mms selection replay`

민감 정보를 정리한 도구 선택 기록을 재생해, 같은 입력에서 같은 결과가 나오는 위험 감점 규칙을 평가합니다. 권장 사항만 보여 줄 뿐 프록시 설정은 바꾸지 않습니다. 디코딩한 내용이 STM의 민감 정보 패턴과 일치하는 `--dataset`은 거부됩니다(`dataset matched sensitive-content patterns`, 종료 코드 1).

```bash
mms selection replay [--config PATH] [--log FILE] [--dataset FILE]
                     [--active-only] [--no-telemetry]
                     [--output-dir DIR] [--json]
```

### `mms selection feedback`

선택 텔레메트리에 운영자의 정정을 기록합니다. 피드백을 기록하며 프록시 설정은 변경하지 않습니다.

```bash
mms selection feedback --selection-id SELECTION_ID --operator-override --yes
mms selection feedback --last --user-corrected --yes
```

필터·출력 옵션은 `--config`, `--log`, `--active-only`, `--server`, `--tool`, `--json`입니다. 명시적 해제 플래그는 `--no-operator-override`, `--no-user-corrected`입니다.

<a id="프로젝트-관리"></a>

## 프로젝트·호스트

`.mms/project.toml` 표시 파일로 프로젝트별 활성 MCP 목록을 관리합니다. 디렉터리마다 다른 MCP 구성을 쓰고 싶을 때 유용합니다. 예를 들어 회사 코드에서는 GitHub MCP를 켜고 개인 프로젝트에서는 filesystem만 켤 수 있습니다. 프로젝트 목록은 `~/.mms/projects.toml`에 기록하므로 어느 위치에서 명령을 실행해도 같은 설정을 찾을 수 있습니다.

### `mms project init [PATH]`

대상 디렉터리에 `.mms/project.toml`을 만들고 프로젝트 목록에 등록합니다. 경로를 생략하면 현재 작업 디렉터리를 사용합니다.

```bash
mms project init                     # 현재 디렉터리에 .mms/project.toml 생성
mms project init ~/work/billing      # 다른 디렉터리에 생성
mms project init --name acme         # 디렉터리 이름 대신 지정한 이름 사용
mms project init --force             # 기존 마커 덮어쓰기
```

### `mms project show [NAME]`

현재 디렉터리에서 감지한 프로젝트나 이름으로 지정한 프로젝트의 활성 MCP 목록과 표시 파일 경로를 출력합니다.

```bash
mms project show
mms project show acme
mms project show --json
```

### `mms project list`

등록된 모든 프로젝트를 보여 줍니다. 현재 디렉터리에 해당하는 프로젝트는 `*`로 표시합니다.

```bash
mms project list
mms project list --json
mms project list --prune             # marker가 없거나 디렉터리가 아닌 루트의 항목 정리
```

색인된 프로젝트 중 하나라도 설정이 손상되어 있으면 `--prune`은 중단되고 색인은 바뀌지 않습니다.

### `mms project enable / disable <mcps...>`

프로젝트의 `mcp.enabled` 목록에 MCP 이름을 추가하거나 제거합니다. 대상 프로젝트는 현재 디렉터리에서 자동으로 찾으며 `--project <name>`으로 직접 지정할 수도 있습니다.

```bash
mms project enable filesystem github
mms project disable github
mms project enable filesystem --project acme
```

`enable`은 레지스트리에 등록된 MCP만 허용합니다. 레지스트리가 비어 있으면 오류 메시지를 표시하고 중단합니다. `disable`은 레지스트리에 해당 MCP가 없어도 동작합니다.

### `mms project route`

감지한 프로젝트에서 활성화한 레지스트리 MCP를 STM 설정에 추가할 계획을 보여 주거나 실제로 적용합니다.

```bash
mms project route
mms project route --project acme --config ~/.memtomem/stm_proxy.json --apply
mms project route --json
```

옵션은 `--project`, `--config`, `--apply`, `--json`입니다. 기존 항목은 유지한 채 새 항목만 추가합니다. 충돌은 보고한 뒤 건너뛰며 원본 클라이언트 설정은 정리하지 않습니다.

<a id="호스트-설정-일괄-가져오기"></a>

<a id="클라이언트-설정-일괄-가져오기"></a>

### `mms import`

Claude Code, Claude Desktop, Cursor 같은 MCP 클라이언트 설정에서 서버 정의를 찾아 `~/.mms/registry.toml`로 가져옵니다. 프로젝트 관리용 레지스트리를 채우는 명령이며, 서버를 프록시 설정으로 가져오는 [`mms add --from-clients`](#mcp-클라이언트에서-일괄-가져오기)와 대상 파일과 용도가 다릅니다. **미리보기가 기본값**이며 `--apply`를 지정해야 실제로 저장합니다.

```bash
mms import --plan                    # 기본: 가져올 항목만 표시(비밀값은 가림)
mms import --apply                   # 레지스트리에 실제로 저장
mms import --from claude-code --plan # 클라이언트 한정(claude-code / cursor / codex / claude-desktop / all)
mms import --plan --show-imported    # 계획에서 비밀값을 가리지 않음(주의)
mms import --apply --allow-project-configs  # 프로젝트 설정 파일의 항목도 등록
```

현재 디렉터리의 프로젝트 설정 파일(`<cwd>/.mcp.json`, `<cwd>/.cursor/mcp.json`)에서 찾은 항목은 저장소 체크아웃에 포함되어 배포될 수 있으므로, `--allow-project-configs`를 지정하지 않으면 `--apply`가 등록을 거부합니다. `--plan`은 `--apply`에 이 옵션이 필요하다는 경고만 출력합니다. `mms import --help`는 끝에 예시와 함께 두 가지를 안내합니다. 이 명령은 `mms add`가 쓰는 프록시 설정이 아니라 `~/.mms/registry.toml`에 쓰며, 프로젝트 설정 파일의 항목을 `--apply`로 등록하려면 `--allow-project-configs`가 필요합니다.

먼저 가져온 항목이 우선합니다. 레지스트리에 같은 이름으로 다른 내용이 등록되어 있으면 충돌로 처리해 건너뛰고, 내용까지 같으면 바꾸지 않습니다.

### `mms gateway`

선택형 Toolgraph 정책의 출처를 확인하고 설정합니다.

```bash
mms gateway status [--config PATH] [--json]
mms gateway mode strict|review|explore [--config PATH] [--bundle PATH] [--apply|--dry-run]
mms gateway explain server::tool [--config PATH] [--json]
```

`mode`는 기본적으로 변경 계획만 보여 줍니다. `--apply`를 지정하면 번들 정책을 켜고 Toolgraph 조회 프로필과 STM 노출 정책을 한 번에 맞춥니다. `explain`은 번들에 기록된 특정 판단의 이유를 보여 줍니다.

### `mms host`

프로젝트 레지스트리의 원본이 되는 MCP 클라이언트 설정을 검사하고 조정합니다.

```bash
mms host scan [--from claude-code|cursor|codex|claude-desktop|all] [--json]
mms host status [--json]
mms host sync [--plan|--apply] [--json] [--yes] [--force] [--allow-project-configs]
```

`scan`은 클라이언트 설정을 읽기만 하며 등록 항목을 조사합니다. `status`는 레지스트리와 실제 설정의 차이를 비교합니다. `sync`는 기본적으로 변경 계획만 보여 주며, 새 항목 추가, 모든 클라이언트에서 사라진 항목 제거, 별도 기준 파일 보강을 수행할 수 있습니다. STM이 확인하지 못한 출처는 비어 있는 것으로 보지 않습니다. 어느 Claude Code 설정이나 프로젝트 항목을 쓰는지 판단할 수 없거나, 해당 파일 또는 `<cwd>/.mcp.json`이 존재하지만 유효한 JSON 객체로 읽을 수 없는 경우, 해당 출처에서 가져왔으나 이번 탐색에서 확인되지 않은 레지스트리 항목은 삭제하지 않고 `not_inspected`로 표시해 유지합니다. `status --json`은 이런 행에 `reason`을 붙이고 `summary.not_inspected`로 개수를 세며, `scan --json`은 건너뛴 출처를 `not_inspected`에 나열하고, `sync --json`은 `plan.not_inspected`와 `summary.not_inspected`에 담습니다. 클라이언트 항목의 구조가 달라졌다면 `--force`, JSON 파일을 실제로 바꾸려면 `--yes`가 필요합니다. `--allow-project-configs`는 프로젝트 내부 설정 탐색을 명시적으로 허용합니다.

## 운영 통계

실행 중인 프록시의 관련 기억 제시, 도구 선택, 압축 동작을 점검할 수 있도록 STM은 `stm_admin` 도구 하나에 담긴 관찰·관리 액션 8개(`proxy_stats`, `proxy_cache_clear`, `proxy_health`, `surfacing_stats`, `selection_stats`, `compression_stats`, `progressive_stats`, `tuning_recommendations`)를 제공합니다. `stm_admin`은 기본적으로 숨겨져 있으며 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`로 표시합니다. 자세한 입력과 출력은 [MCP 도구](/ko/stm/mcp-tools/)를 참고하세요.

## 프록시 서버 실행

프록시 서버는 표준 입출력이 파이프로 연결된 환경에서 `memtomem-stm`, `memtomem-stm-proxy`, 인자 없는 `mms` 명령으로 시작할 수 있습니다. 보통은 사용자가 직접 실행하지 않고 등록된 MCP 클라이언트가 시작합니다. 대화형 터미널에서 인자 없이 `mms`를 실행하면 서버 대신 CLI 도움말을 표시합니다.

## `--json` 실패 문서

`add`, `remove`, `prune`, `eject`, `list`, `status`, `health`, `tune`, `gateway`, `project route` 등 여러 `--json` 명령은 운영 중 실패를 stdout에 JSON 문서 하나로 출력하고, 사람이 읽는 오류는 그대로 stderr에 출력합니다. 이 형식을 사용하는 명령과 실패 경로는 upstream CLI 문서에 정확히 정리되어 있습니다.

```json
{"action": "add", "ok": false, "error": "<code>", "message": "...", "path": "..."}
```

`error`에 안정적인 식별자가 들어가며, 명령에 따라 `path`, `stores` 같은 필드가 추가됩니다. 운영 중 실패는 종료 코드 1이고, 동의가 필요한 작업을 거부한 경우(`confirmation_required`, `project_config_ack_required`)는 종료 코드 2입니다.

| 계열 | 코드 | 발생 상황 |
|---|---|---|
| 설정 파일 읽기 | `config_unreadable`, `config_invalid` | 파일을 읽을 수 없을 때 / UTF-8·JSON·JSON 객체가 아니거나 검증에 실패할 때 |
| 설정 쓰기 | `config_lock_timeout`, `config_lock_unavailable`, `config_write_failed` | 쓰기 잠금 대기 시간 초과 / 잠금 파일을 만들거나 열 수 없을 때 / 적용 전 백업이나 원자적 교체가 실패할 때(실패한 쓰기는 파일을 바꾸지 않지만, 여러 번 저장하는 명령은 앞선 저장이 이미 반영되었을 수 있음) |
| `~/.mms` 상태(`mms host`, `mms project`, `mms import`) | `mms_lock_timeout`, `mms_lock_unavailable`, `mms_state_write_failed`, `mms_schema_mismatch`, `mms_state_invalid` | 상태 파일 잠금 시간 초과·사용 불가 / 쓰기 실패 / 스키마 버전 불일치 / 손상된 상태 파일 |
| 지표 저장소(`mms tune`) | `store_invalid` | SQLite가 지표나 피드백 DB 파일을 열거나 읽을 수 없을 때(`stores`에 해당 파일) |

`add`, `gateway explain`, `project route`, `selection feedback` 등 명령별 코드는 upstream [CLI 문서](https://github.com/memtomem/memtomem-stm/blob/v0.7.8/docs/cli.md)에서 확인하세요.

다음 경우는 이 형식을 따르지 않습니다.

- 잘못된 호출(알 수 없는 플래그, 누락된 인자 등)은 Click의 사용법 오류를 stderr에 출력하고 종료 코드 2로 끝나며 stdout은 비어 있습니다. 설정 쓰기 잠금은 명령 실행 전에 잡으므로, 잠금 경합 중에는 설정을 바꾸는 명령이 종료 코드 1의 잠금 오류를 먼저 보고할 수 있습니다.
- `mms doctor --json`과 `mms config validate --json`은 실패할 때도 각자의 결과 문서(`status`와 `checks`, `status`와 `errors`)를 출력합니다.
- `mms list`, `mms status`, `mms health`는 설정 파일이 없으면 `{"error": "config_not_found", "path": ...}`만 출력하고 종료 코드 0으로 끝납니다.
- `mms tune --json`은 미리보기 전용이므로 설정 잠금 실패를 일반 텍스트로 출력합니다.
- `mms init`과 `mms register`는 `config_path`, `servers`, `client`를 담은 결과 문서를 출력하며, 설정 작업 자체가 실패하면 `error`에 `setup_failed`나 쓰기 실패 코드를 넣습니다. `mms init`은 설정 작업 전에 설정 쓰기 잠금을 잡으므로, 이 단계의 잠금 실패(`config_lock_timeout`, `config_lock_unavailable`)는 표준 형식으로 출력합니다.
- `mms stats --json`의 저장소 오류는 [`mms stats`](#mms-stats)에서 설명한 `compression.error`, `surfacing.error` 필드에 들어갑니다.

<a id="예제-워크플로우"></a>

## 예제 워크플로

```bash
# 1. 첫 설치 — 서버 한 개 구성과 MCP 클라이언트 등록을 한 번에
mms init --demo --client auto

# 2. 서버 추가(직접 등록하거나 클라이언트 설정에서 한꺼번에 가져오기)
mms add filesystem --command filesystem-server --prefix fs --validate
mms add --from-clients

# 3. 연결 상태 확인
mms status
mms health

# 4. (선택) 특정 서버의 관련 기억 자동 제시만 끄기
mms surfacing filesystem off

# 5. (선택) 프록시 사용을 중단하고 원본 클라이언트 설정에 복원
mms eject filesystem

# 6. (선택) 클라이언트 재설치 후 Claude Code에 재등록
mms register --client claude
```

이제 MCP 클라이언트는 개별 서버 대신 `memtomem-stm`에 연결됩니다. 등록한 서버의 도구는 프록시를 통해 제공되며 관련 기억 자동 제시, 응답 압축, 점진적 전달이 적용됩니다.

> 설정 방법은 [설치 가이드](/ko/guides/installation/), 관련 기억을 붙이는 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.

## 명령별 전체 옵션 인덱스

고정 소스의 공개 긴 옵션 목록입니다. 짧은 별칭과 공통 `--help`는 생략합니다. 인수·기본값·제약은 해당 명령의 `--help`로 확인하세요.

| 명령 | 옵션 |
|---|---|
| `mms` | `--version` |
| `mms add` | `--all`, `--allow-project-configs`, `--args`, `--command`, `--compression`, `--config`, `--env`, `--from-clients`, `--header`, `--import`, `--json`, `--max-chars`, `--prefix`, `--prune`, `--save-unverified`, `--select`, `--timeout`, `--transport`, `--url`, `--validate` |
| `mms config` | — |
| `mms config validate` | `--config`, `--json` |
| `mms daemon` | — |
| `mms daemon restart` | — |
| `mms daemon run` | `--detached`, `--foreground` |
| `mms daemon start` | — |
| `mms daemon status` | `--json` |
| `mms daemon stop` | `--all` |
| `mms doctor` | `--config`, `--json`, `--measure-ltm`, `--timeout` |
| `mms eject` | `--accept-schema-loss`, `--allow-argv-secrets`, `--config`, `--dry-run`, `--force`, `--json`, `--keep`, `--to`, `--yes` |
| `mms gateway` | — |
| `mms gateway explain` | `--config`, `--json` |
| `mms gateway mode` | `--apply`, `--bundle`, `--config`, `--dry-run` |
| `mms gateway status` | `--config`, `--json` |
| `mms health` | `--config`, `--json`, `--names`, `--timeout` |
| `mms hook` | `--daemon-timeout-seconds`, `--host`, `--no-daemon`, `--no-persist-query-text`, `--persist-query-text`, `--surfacing-timeout-seconds`, `--use-daemon` |
| `mms hook install` | `--apply`, `--daemon`, `--host`, `--inherit-runtime-env`, `--no-daemon`, `--surfacing-timeout` |
| `mms hook uninstall` | `--apply`, `--host` |
| `mms host` | — |
| `mms host scan` | `--from`, `--json` |
| `mms host status` | `--json` |
| `mms host sync` | `--allow-project-configs`, `--apply`, `--force`, `--json`, `--plan`, `--yes` |
| `mms import` | `--allow-project-configs`, `--apply`, `--from`, `--plan`, `--show-imported` |
| `mms init` | `--allow-project-configs`, `--client`, `--config`, `--demo`, `--freshness`, `--json`, `--lang`, `--mcp`, `--no-validate`, `--prune-originals`, `--replace-registration`, `--resume`, `--save-unverified` |
| `mms list` | `--config`, `--json` |
| `mms project` | — |
| `mms project disable` | `--project` |
| `mms project enable` | `--project` |
| `mms project init` | `--force`, `--name` |
| `mms project list` | `--json`, `--prune` |
| `mms project route` | `--apply`, `--config`, `--json`, `--project` |
| `mms project show` | `--json` |
| `mms prune` | `--all`, `--config`, `--dry-run`, `--json`, `--yes` |
| `mms register` | `--client`, `--config`, `--json`, `--mcp`, `--replace-registration` |
| `mms remove` | `--config`, `--json`, `--yes` |
| `mms selection` | — |
| `mms selection feedback` | `--active-only`, `--config`, `--json`, `--last`, `--log`, `--no-operator-override`, `--no-user-corrected`, `--operator-override`, `--selection-id`, `--server`, `--tool`, `--user-corrected`, `--yes` |
| `mms selection replay` | `--active-only`, `--config`, `--dataset`, `--json`, `--log`, `--no-telemetry`, `--output-dir` |
| `mms stats` | `--all-time`, `--config`, `--json`, `--source`, `--tool` |
| `mms status` | `--config`, `--json` |
| `mms surfacing` | `--config` |
| `mms tune` | `--apply`, `--config`, `--json`, `--since-hours`, `--tool`, `--yes` |
| `mms version` | — |
