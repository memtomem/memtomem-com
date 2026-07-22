---
title: CLI 레퍼런스
description: memtomem-stm 프록시를 관리하는 mms CLI 명령.
---

`mms` 명령은 `memtomem-stm` v0.1.41 패키지와 함께 설치됩니다. 이 페이지에는 최상위 명령을 빠짐없이 정리했습니다. 설치된 버전이 지원하는 정확한 옵션은 `mms <command> --help`, 버전은 `mms --version` 또는 `mms version`으로 확인하세요.

STM으로 서버 설정을 가져와도 원래 등록 정보는 보존됩니다. 결과가 마음에 들지 않으면 `mms eject`로 원래 MCP 클라이언트 설정에 복원할 수 있습니다.

<a id="명령어"></a>

## 명령

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

`mms init` 이후에 MCP 클라이언트 등록 절차만 다시 실행합니다. 처음 `skip`을 골랐거나 클라이언트를 재설치한 뒤 다시 등록할 때 유용합니다.

```bash
mms register --client auto           # 감지된 지원 클라이언트
mms register --client claude         # Claude Code
mms register --client codex          # Codex
mms register --client json           # 현재 디렉터리에 .mcp.json 작성
mms register --client skip           # 수동 등록 안내 출력
```

전체 옵션은 `--config`, `--client auto|claude|codex|json|skip`, 호환 `--mcp claude|json|skip`, `--replace-registration`, `--json`입니다. 반복 실행해도 안전하며 교체를 요청하지 않으면 기존 등록을 유지합니다.

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
| `--max-chars` | 출력 크기 예산 (기본 `8000`) |
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

가져오기에 성공하면 같은 서버가 STM 프록시 경로와 원본 클라이언트의 직접 경로 양쪽에 보입니다. 직접 경로는 압축·캐시·관련 기억 검색을 거치지 않습니다. 가져온 항목에는 원본 클라이언트 종류와 기존 등록 정보 사본을 함께 기록하므로 [`mms eject`](#mms-eject-name)로 언제든 원래 상태를 복원할 수 있습니다.

`--prune` 옵션을 주거나 대화형 터미널의 확인 질문에서 동의하면(기본값 **No**), Claude Code 범위별 `claude mcp remove`와 Claude Desktop JSON 파일의 안전한 재작성을 통해 이중 등록을 정리합니다. 제거 전에는 각 항목을 `~/.memtomem/pruned_upstreams.json`에 백업하므로 이 작업도 되돌릴 수 있습니다. 비대화형 환경에서 `--prune` 없이 실행하면 안내 경고와 수동 복구 명령만 출력합니다.

`NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`와 함께 쓸 수 없습니다. `--prune`은 반드시 `--from-clients` / `--import`와 함께 써야 합니다.

### `mms list`

등록한 모든 서버의 상세 정보를 보여 줍니다.

```bash
mms list                             # 사람이 읽기 좋은 표
mms list --json                      # 스크립트용 JSON
```

표의 **ORIGIN** 열에는 각 서버를 가져온 위치가 표시됩니다. 값은 원본 클라이언트 종류(`mcp-json`, `claude-user`, `claude-project`, `claude-desktop`)이며, `mms add`로 직접 등록한 항목은 `-`로 표시합니다. 값 뒤의 `*`는 클라이언트의 원본 등록을 정리해 현재 STM을 통해서만 호출된다는 뜻입니다. `mms eject <name>`로 복원할 수 있습니다. v0.1.32부터는 **SURFACING** 열도 표시하므로 서버별 `mms surfacing` 설정을 여기서 확인할 수 있습니다.

### `mms status`

프록시가 설정되어 있고 올바른 설정 파일을 가리키는지 요약해서 보여 줍니다. 서버별 상세 정보는 포함하지 않습니다.

```bash
mms status
mms status --json                    # 스크립트용 JSON
```

v0.1.32부터 `status`는 설정 경로, `enabled` 값, 스키마 검증 경고, `Servers: N (P host-pruned)`를 요약합니다. 서버별 압축, 출력 예산, 관련 기억 제시 상태는 `mms list`에서 확인합니다. `status --json`은 민감 정보를 가린 `servers` 맵 전체와 `server_count` / `pruned_count` 키를 반환합니다.

### `mms surfacing <server> [on|off]`

특정 서버의 관련 기억 자동 제시를 켜거나 끕니다. 상태 인수를 생략하면 현재 값만 출력합니다.

```bash
mms surfacing filesystem             # 현재 상태 확인
mms surfacing filesystem off         # 이 서버의 서피싱 비활성화
mms surfacing filesystem on          # 다시 활성화
```

`surfacing_enabled` 값은 공용 프록시 설정(`stm_proxy.json`)에 기록됩니다. 실행 중인 프록시에도 재시작 없이 즉시 반영되며, 같은 `mms` 프록시를 쓰는 모든 MCP 클라이언트가 이 설정을 공유합니다. 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.

### `mms remove <name>`

등록한 서버를 제거합니다.

```bash
mms remove filesystem                # 확인 프롬프트
mms remove filesystem -y             # 확인 생략
```

가져온 서버를 제거하면 원본 클라이언트 등록을 잃지 않고 복원할 수 있도록 `mms eject` 안내도 함께 출력합니다.

### `mms health`

등록한 모든 서버의 MCP 연결 상태를 점검합니다. 출력 형식은 `status` / `list`와 일관됩니다.

```bash
mms health                           # 사람이 읽기 좋은 출력
mms health --json                    # 스크립트용 JSON
mms health --timeout 5               # 서버별 연결 타임아웃(초)
mms health --names                   # 64자 MCP 도구명 한도를 넘는 도구도 함께 보고
```

`--names`는 `mcp__<server>__<prefix>__<tool>`의 전체 길이가 MCP의 64자 제한(#261)을 넘어 등록 후 표시되지 않는 도구를 찾을 때 사용합니다.

`health`는 서버별 **회로 차단기** 상태도 표시합니다. v0.1.32부터 기본으로 활성화됩니다. 연속 3회 호출에 실패하면 해당 서버의 도구는 약 60초 동안 `circuit_open`을 바로 반환하므로 호출할 때마다 재시도와 제한 시간을 모두 소진하지 않습니다. 캐시된 응답은 계속 제공하고 다른 서버에는 영향을 주지 않습니다. `stm_proxy.json`에서 해당 서버에 `circuit_max_failures: 0`을 지정하면 매번 다시 시도하는 이전 동작으로 돌아갑니다.

### `mms prune`

`mms init` 또는 `mms add --import`로 서버를 STM에 등록한 뒤, 원본 MCP 클라이언트(Claude Code, Claude Desktop, 프로젝트 `.mcp.json`)에 남아 있는 직접 등록을 한꺼번에 제거합니다. 그러면 모든 도구 호출이 STM 프록시 한 경로로만 흐르며 압축·캐시·관련 기억 검색을 거칩니다. 사용자가 직접 실행해야 하는 명령입니다.

```bash
mms prune --all                      # 이중 등록된 서버 모두
mms prune filesystem github          # 이름 지정 (한 개 이상)
mms prune --all --dry-run            # 무엇을 지울지만 미리보기
mms prune --all -y                   # 비대화 — 확인 프롬프트 생략
```

제거하기 전에 각 항목은 `~/.memtomem/pruned_upstreams.json`에 백업되므로 작업을 되돌릴 수 있습니다 — 원본 클라이언트 등록으로 복원하려면 [`mms eject`](#mms-eject-name) 를 사용하세요. STM 자체 설정 파일(`~/.memtomem/stm_proxy.json`)은 건드리지 않습니다.

### `mms eject <name>`

`prune`과 반대로 동작합니다. 가져온 서버를 원래 MCP 클라이언트 설정에 복원하고, 복원이 확인된 뒤에만 STM 항목을 제거합니다. STM 프록시를 시험한 뒤 마음에 들지 않으면 안전하게 원래 상태로 돌아갈 수 있습니다. 여러 이름을 한꺼번에 지정할 수도 있습니다.

```bash
mms eject filesystem                 # 원본 클라이언트 설정에 복원 후 STM 항목 제거
mms eject filesystem github          # 여러 개 한 번에
mms eject filesystem --dry-run       # 무엇을 복원할지만 미리보기
mms eject filesystem --keep          # 클라이언트에 복원하되 STM 항목은 유지(이중 등록)
mms eject filesystem --yes           # 비대화 — 확인 프롬프트 생략
```

가져올 때 기록한 원본 등록 정보를 클라이언트에 다시 쓰고, 설정을 재확인한 뒤에만 STM 항목을 삭제합니다. 어느 단계에서 실패해도 서버는 적어도 한 곳에 남습니다. 최악의 경우에도 이중으로 등록될 뿐 서버가 사라지지는 않습니다.

| 플래그 | 설명 |
|------|-------------|
| `--to TARGET` | 출처가 기록되지 않은 항목의 복원 대상 지정 (`claude-user` / `claude-project[:PATH]` / `mcp-json[:PATH]` / `claude-desktop`). 출처가 있는 항목은 무시됩니다 |
| `--keep` | 클라이언트에 복원하되 STM 항목 유지(이중 등록) |
| `--force` | 같은 이름이지만 내용이 다른 클라이언트 항목 덮어쓰기 |
| `--allow-argv-secrets` | 비밀값으로 분류된 내용을 포함한 `claude mcp add-json` 실행 허용. `argv`가 프로세스 목록에 노출될 수 있음 |
| `--accept-schema-loss` | 복원한 클라이언트 항목이 원본과 구조적으로 일치하지 않아도 STM 항목 제거. 기본값은 STM 항목을 유지하고 실패 처리 |
| `--dry-run` | 계획만 출력, 쓰기 없음 |
| `--yes` / `-y` | 확인 프롬프트 생략 (스크립트 / CI / 비-TTY) |

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
mms daemon stop --all                # 오래된 설정에서 남은 데몬도 함께 중지
mms daemon restart                   # 이 설정을 중지한 뒤 한 번 새로 시작
mms daemon run                       # 포그라운드에서 서버 계속 실행
```

데몬은 현재 설정에 맞는 LTM MCP 세션 하나를 미리 연결해 둡니다. 호출할 때마다 세션을 새로 열게 하려면 `MEMTOMEM_STM_HOOK__USE_DAEMON=0`으로 설정하세요. 데몬을 사용할 수 없을 때 새 세션을 여는 방식으로 대신 처리하려면 `MEMTOMEM_STM_HOOK__FALLBACK=cold`를 설정합니다.

### `mms doctor`

상태, 연결, 설정 검사를 하나의 PASS/WARN/FAIL 보고서로 실행합니다. 기본 실행은 상태를 바꾸지 않으며 LTM도 검색하지 않습니다. FAIL이 있으면 종료 코드 1, WARN만 있으면 종료 코드 0을 반환합니다.

```bash
mms doctor
mms doctor --json --timeout 5
mms doctor --measure-ltm             # 이미 실행 중인 데몬으로 읽기 전용 검색 5회
```

옵션은 `--config`, `--json`, `--timeout`, `--measure-ltm`입니다. 측정 모드는 데몬이 없을 때 새로 시작하지 않습니다.

### `mms config validate`

환경 변수로 값을 덮어쓰지 않고 JSON 파일 자체를 엄격하게 검사합니다. 파일이 없거나 JSON 해석·스키마 오류 또는 알 수 없는 키가 있으면 0이 아닌 종료 코드를 반환합니다.

```bash
mms config validate
mms config validate --config ./stm_proxy.json --json
```

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

`scan`은 클라이언트 설정을 읽기만 하며 등록 항목을 조사합니다. `status`는 레지스트리와 실제 설정의 차이를 비교합니다. `sync`는 기본적으로 변경 계획만 보여 주며, 새 항목 추가, 모든 클라이언트에서 사라진 항목 제거, 별도 기준 파일 보강을 수행할 수 있습니다. 클라이언트 항목의 구조가 달라졌다면 `--force`, JSON 파일을 실제로 바꾸려면 `--yes`가 필요합니다. `--allow-project-configs`는 프로젝트 내부 설정 탐색을 명시적으로 허용합니다.

### `mms selection replay`

민감 정보를 정리한 도구 선택 기록을 다시 재생해, 같은 입력에서 같은 결과가 나오는 위험 감점 규칙을 평가합니다. 권장 사항만 보여 줄 뿐 프록시 설정은 바꾸지 않습니다.

```bash
mms selection replay [--config PATH] [--log FILE] [--dataset FILE]
                     [--active-only] [--no-telemetry]
                     [--output-dir DIR] [--json]
```

### `mms stats`

저장소를 새로 만들거나 이전하지 않고, 디스크에 기록된 전체 기간의 압축·관련 기억 제시 통계를 읽습니다.

```bash
mms stats [--config PATH] [--tool TOOL] [--source mcp|hook] [--json]
```

CLI는 디스크에 저장된 지표만 보여 줍니다. 현재 프로세스의 실시간 횟수는 관찰·관리 MCP 도구에서 확인하세요.

### `mms tune`

기존 지표·피드백 저장소를 바탕으로 도구별 압축 권장 설정을 미리 보거나 적용합니다.

```bash
mms tune [--config PATH] [--since-hours 24] [--tool TOOL] [--json]
mms tune --apply [--yes]
```

기본값은 미리보기입니다. `--apply`는 시각을 붙인 백업을 만든 뒤 설정 잠금을 잡고 선택한 `tool_overrides`를 저장합니다. 실행 중인 프록시에도 재시작 없이 반영됩니다. `mms stats`와 달리 `tune`은 기존 저장소에 여러 번 실행해도 결과가 같은 스키마 이전을 수행할 수 있습니다.

## 프로젝트 관리

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
mms project list --prune             # 더 이상 존재하지 않는 경로 항목 정리
```

### `mms project enable / disable <mcps...>`

프로젝트의 `mcp.enabled` 목록에 MCP 이름을 추가하거나 제거합니다. 대상 프로젝트는 현재 디렉터리에서 자동으로 찾으며 `--project <name>`으로 직접 지정할 수도 있습니다.

```bash
mms project enable filesystem github
mms project disable github
mms project enable filesystem --project acme
```

`enable`은 레지스트리에 등록된 MCP만 받습니다. 레지스트리가 비어 있으면 오류 메시지를 표시하고 중단합니다. `disable`은 레지스트리에 해당 MCP가 없어도 동작합니다.

### `mms project route`

감지한 프로젝트에서 활성화한 레지스트리 MCP를 STM 설정에 추가할 계획을 보여 주거나 실제로 적용합니다.

```bash
mms project route
mms project route --project acme --config ~/.memtomem/stm_proxy.json --apply
mms project route --json
```

옵션은 `--project`, `--config`, `--apply`, `--json`입니다. 기존 항목은 유지한 채 새 항목만 추가합니다. 충돌은 보고한 뒤 건너뛰며 원본 클라이언트 설정은 정리하지 않습니다.

<a id="호스트-설정-일괄-가져오기"></a>

## 클라이언트 설정 일괄 가져오기

### `mms import`

Claude Code, Claude Desktop, Cursor 같은 MCP 클라이언트 설정에서 서버 정의를 찾아 `~/.mms/registry.toml`로 가져옵니다. 프로젝트 관리용 레지스트리를 채우는 명령이며, 서버를 프록시 설정으로 가져오는 [`mms add --from-clients`](#mcp-클라이언트에서-일괄-가져오기)와 대상 파일과 용도가 다릅니다. **미리보기가 기본값**이며 `--apply`를 지정해야 실제로 저장합니다.

```bash
mms import --plan                    # 기본: 가져올 항목만 표시(비밀값은 가림)
mms import --apply                   # 레지스트리에 실제로 저장
mms import --from claude-code --plan # 클라이언트 한정(claude-code / cursor / codex / claude-desktop / all)
mms import --plan --show-imported    # 계획에서 비밀값을 가리지 않음(주의)
```

먼저 가져온 항목이 우선합니다. 레지스트리에 같은 이름으로 다른 내용이 등록되어 있으면 충돌로 처리해 건너뛰고, 내용까지 같으면 바꾸지 않습니다.

## 운영 통계

실행 중인 프록시의 관련 기억 제시, 도구 선택, 압축 동작을 점검할 수 있도록 STM은 관찰·관리 MCP 도구 8개(`stm_proxy_stats`, `stm_proxy_cache_clear`, `stm_proxy_health`, `stm_surfacing_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`)를 제공합니다. 기본적으로 숨겨져 있으며 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`로 표시합니다. 자세한 입력과 출력은 [MCP 도구](/ko/stm/mcp-tools/)를 참고하세요.

## 프록시 서버 실행

프록시 서버는 표준 입출력이 파이프로 연결된 환경에서 `memtomem-stm`, `memtomem-stm-proxy`, 인자 없는 `mms` 명령으로 시작할 수 있습니다. 보통은 사용자가 직접 실행하지 않고 등록된 MCP 클라이언트가 시작합니다. 대화형 터미널에서 인자 없이 `mms`를 실행하면 서버 대신 CLI 도움말을 표시합니다.

## 예제 워크플로우

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

# 5. (선택) 프록시가 마음에 들지 않으면 원본 클라이언트 설정에 복원
mms eject filesystem

# 6. (선택) 클라이언트 재설치 후 Claude Code에 재등록
mms register --client claude
```

이제 MCP 클라이언트는 개별 서버 대신 `memtomem-stm`에 연결됩니다. 등록한 서버의 도구는 프록시를 통해 제공되며 관련 기억 자동 제시, 응답 압축, 점진적 전달이 적용됩니다.

> 설정 방법은 [설치 가이드](/ko/guides/installation/), 관련 기억을 붙이는 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.
