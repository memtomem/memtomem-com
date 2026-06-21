---
title: CLI 레퍼런스
description: memtomem-stm 프록시 관리를 위한 mms CLI 명령어.
---

`mms` 명령어는 `memtomem-stm` v0.1.29 패키지와 함께 설치됩니다. 업스트림 서버 등록, MCP 클라이언트 등록, 프록시 설정 라이프사이클을 관리합니다. 전체 명령 목록은 `mms --help`, 설치된 버전은 `mms --version`(또는 `mms version` 서브명령)으로 확인할 수 있습니다.

STM의 가져오기는 되돌릴 수 있습니다. 업스트림을 STM 프록시 뒤로 들여와도 원래 등록 정보가 보존되므로, 결과가 마음에 들지 않으면 `mms eject` 로 원래 host MCP 클라이언트 설정으로 복원할 수 있습니다.

## 명령어

### `mms init`

플래그 없이 `mms init` 을 실행하면 마법사가 업스트림 서버 한 개를 질의하고, 선택적으로 연결을 점검한 뒤 `~/.memtomem/stm_proxy.json` 을 작성하고, 이어서 MCP 클라이언트 등록용 3지선다 프롬프트를 띄웁니다:

1. **Claude Code 에 추가** — `claude mcp add` 를 자동 실행합니다.
2. **`.mcp.json` 생성** — 현재 디렉터리에 프로젝트 스코프 설정 파일을 작성합니다.
3. **건너뛰기** — 수동 등록에 필요한 설정 스니펫을 출력합니다.

스크립트/CI 실행에서 프롬프트를 미리 답하려면 `--mcp` 플래그를 사용합니다:

```bash
mms init --mcp claude                # Claude Code 에 자동 등록
mms init --mcp json                  # 현재 디렉터리에 .mcp.json 생성
mms init --mcp skip                  # 설정만 쓰고 등록 스니펫 출력 후 종료
mms init --no-validate               # 업스트림 연결 점검 생략
mms init --lang ko                   # 한국어 토큰-aware 예산 프리셋 (CJK 대응)
mms init --prune-originals           # 가져온 업스트림을 source 클라이언트에서 함께 제거
```

`--lang ko` 는 `chars_per_token=1.85`, `default_max_result_chars=8500`, 그리고 서버별 `max_result_tokens=2000` 같은 한국어 / CJK 워크로드용 토큰 환산 기본값을 함께 씁니다. 비-TTY 환경에서 `--lang` 을 생략하면 `en` 으로 떨어집니다.

설정 파일이 이미 있으면 `mms init` 는 중단됩니다 — 업스트림을 추가하려면 `mms add`, 등록 프롬프트만 재실행하려면 `mms register` 를 사용하세요.

### `mms register`

`mms init` 이후에 MCP 클라이언트 등록 절차만 다시 실행합니다. 처음 `skip`을 골랐거나 클라이언트를 재설치한 뒤 다시 등록할 때 유용합니다.

```bash
mms register                         # 대화형 프롬프트
mms register --mcp claude            # `claude mcp add` 실행
mms register --mcp json              # 현재 디렉터리에 .mcp.json 작성
mms register --mcp skip              # 수동 등록 안내 출력
```

반복 실행해도 안전합니다. Claude Code에 이미 등록되어 있으면 기존 등록을 유지하는 쪽이 기본값입니다.

### `mms add <name>`

STM을 통해 프록시할 업스트림 MCP 서버를 등록합니다.

```bash
mms add filesystem --command filesystem-server --prefix fs
mms add github --command github-mcp --args "--token $GH_TOKEN" --prefix gh
mms add remote-api --transport streamable_http --url https://example/mcp --prefix api
mms add filesystem --command filesystem-server --prefix fs --validate
```

| 플래그 | 설명 |
|------|-------------|
| `--command` | 실행할 서버 명령어 (stdio 전송) |
| `--args` | 공백으로 구분된 인수 |
| `--prefix` | 도구 네임스페이스 (`--from-clients` 사용 시에만 생략 가능). 도구는 `{prefix}__{tool}` 형태 |
| `--transport` | `stdio` (기본), `sse`, `streamable_http` |
| `--url` | `sse` / `streamable_http` 엔드포인트 URL |
| `--env KEY=VALUE` | 업스트림 프로세스에 전달할 환경 변수 (반복 가능) |
| `--compression` | `auto` (기본), `none`, `truncate`, `selective`, `hybrid` |
| `--max-chars` | 출력 크기 예산 (기본 `8000`) |
| `--validate` | 저장 전 MCP initialize + list-tools로 서버 점검 |
| `--timeout` | `--validate` 시 서버별 타임아웃 초 (기본 `10`) |

#### MCP 클라이언트에서 일괄 가져오기

`mms add --from-clients` (별칭 `--import`)는 Claude Desktop, Claude Code, 프로젝트 `.mcp.json`에 등록된 서버를 탐색해 STM 프록시 설정(`stm_proxy.json`)으로 일괄 가져옵니다 — `mms init`의 탐색 + TUI 흐름을 재사용합니다. 이미 등록된 서버는 건너뜁니다. (이는 host 설정을 `~/.mms/registry.toml`로 옮기는 [`mms import`](#mms-import)와 다른 명령입니다.)

```bash
mms add --from-clients               # 대화형 일괄 가져오기
mms add --import                     # 별칭
mms add --from-clients --prune       # 가져온 뒤 원본 클라이언트에서 직접 등록 제거
```

가져오기가 성공하면 같은 서버가 STM 프록시 경로와 원본 클라이언트 경로 양쪽에 노출되며, 직접 경로는 압축·캐싱·LTM 서피싱을 거치지 않습니다. 가져온 항목에는 출처(provenance)가 함께 기록됩니다 — 원본 클라이언트 종류와 원래 등록 정보 사본이 보존되므로, [`mms eject`](#mms-eject-name) 로 언제든 원래 상태로 복원할 수 있습니다.

`--prune` 플래그(또는 TTY 환경에서 뜨는 대화형 확인 프롬프트, 기본 **No**)는 Claude Code 스코프별 `claude mcp remove`와 Claude Desktop JSON 파일의 원자적 재작성을 수행해 이중 등록을 정리합니다. 제거 전 각 항목은 `~/.memtomem/pruned_upstreams.json`에 백업되므로 정리 작업도 되돌릴 수 있습니다. 비대화 환경에서 `--prune` 없이 실행하면 안내 경고만 출력하며, 수동 복구 명령도 함께 표시됩니다.

`NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`와 함께 쓸 수 없습니다. `--prune`은 반드시 `--from-clients` / `--import`와 함께 써야 합니다.

### `mms list`

등록된 모든 업스트림 서버를 조회합니다.

```bash
mms list                             # 사람이 읽기 좋은 표
mms list --json                      # 스크립트용 JSON
```

표에는 각 업스트림의 가져오기 출처를 알려 주는 **ORIGIN** 열이 표시됩니다. 값은 원본 클라이언트 종류(`mcp-json`, `claude-user`, `claude-project`, `claude-desktop`)이며, 수동으로 `mms add` 한 항목은 `-` 로 나타납니다. 값 뒤의 `*` 는 원본 등록이 정리(prune)되어 현재 STM 뒤에만 존재함을 뜻하며, `mms eject <name>` 로 복원할 수 있습니다.

### `mms status`

프록시 게이트웨이 설정과 전체 서버 목록을 표시합니다.

```bash
mms status
mms status --json                    # 스크립트용 JSON
```

`status` 출력에는 업스트림별 압축 설정, 출력 크기 예산과 함께 서피싱 활성화 상태(`surfacing=on/off`)도 표시됩니다.

### `mms surfacing <server> [on|off]`

특정 업스트림 서버에 대한 능동적 기억 서피싱을 켜거나 끕니다. 상태 인수를 생략하면 현재 값만 출력합니다.

```bash
mms surfacing filesystem             # 현재 상태 확인
mms surfacing filesystem off         # 이 업스트림의 서피싱 비활성화
mms surfacing filesystem on          # 다시 활성화
```

`surfacing_enabled` 값은 공유 프록시 설정(`stm_proxy.json`)에 기록됩니다. 실행 중인 프록시는 재시작 없이 즉시 반영하며, 이 `mms` 를 통해 프록시하는 모든 MCP 클라이언트가 동일한 범위를 공유합니다. 서피싱 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/) 페이지를 참조하세요.

### `mms remove <name>`

등록된 업스트림 서버를 제거합니다.

```bash
mms remove filesystem                # 확인 프롬프트
mms remove filesystem -y             # 확인 생략
```

가져온(imported) 서버를 제거하면, 원본 host 등록을 잃지 않고 복원할 수 있도록 `mms eject` 를 안내하는 힌트가 함께 출력됩니다.

### `mms health`

등록된 모든 업스트림 서버에 대해 MCP 연결 상태를 점검합니다. `status` / `list`와 일관된 형식으로 출력됩니다.

```bash
mms health                           # 사람이 읽기 좋은 출력
mms health --json                    # 스크립트용 JSON
mms health --timeout 5               # 서버별 연결 타임아웃(초)
mms health --names                   # 64자 MCP 도구명 한도를 넘는 도구도 함께 보고
```

`--names` 는 `mcp__<server>__<prefix>__<tool>` 의 합산 길이가 MCP 64자 제한(#261)을 초과해 등록 후 조용히 사라진 업스트림 도구를 가려낼 때 씁니다.

### `mms prune`

`mms init` 또는 `mms add --import` 로 업스트림을 STM에 등록한 뒤, 원본 MCP 클라이언트(Claude Code, Claude Desktop, 프로젝트 `.mcp.json`)에 남아 있는 직접 등록을 일괄 제거합니다. 이렇게 하면 모든 도구 호출이 STM 프록시 한 경로로만 흐르면서 압축·캐싱·LTM 서피싱을 거치게 됩니다. 명시적으로 실행해야 하는 옵트인 명령입니다.

```bash
mms prune --all                      # 이중 등록된 업스트림 모두
mms prune filesystem github          # 이름 지정 (한 개 이상)
mms prune --all --dry-run            # 무엇을 지울지만 미리보기
mms prune --all -y                   # 비대화 — 확인 프롬프트 생략
```

제거하기 전에 각 항목은 `~/.memtomem/pruned_upstreams.json`에 백업되므로 작업을 되돌릴 수 있습니다 — 원본 클라이언트 등록으로 복원하려면 [`mms eject`](#mms-eject-name) 를 사용하세요. STM 자체 설정 파일(`~/.memtomem/stm_proxy.json`)은 건드리지 않습니다.

### `mms eject <name>`

`prune` 의 반대 동작입니다. 가져온 업스트림을 다시 원본 host MCP 클라이언트 설정으로 복원하고, 복원이 확인된 뒤에만 STM 항목을 제거합니다. 즉 STM 프록시를 일단 시험해 보고, 마음에 들지 않으면 원래 상태로 안전하게 되돌릴 수 있습니다. 여러 이름을 한 번에 지정할 수 있습니다.

```bash
mms eject filesystem                 # 원본 host 설정으로 복원 후 STM 항목 제거
mms eject filesystem github          # 여러 개 한 번에
mms eject filesystem --dry-run       # 무엇을 복원할지만 미리보기
mms eject filesystem --keep          # host로 복원하되 STM 항목은 유지 (이중 등록)
mms eject filesystem --yes           # 비대화 — 확인 프롬프트 생략
```

가져오기 시 기록된 원본 등록 정보(provenance)를 그대로 host로 다시 쓰고, host 설정을 재확인해 검증한 다음에야 STM 항목을 삭제합니다. 어느 단계에서 실패하더라도 서버는 최소 한 곳에는 남으므로 — 최악의 경우는 이중 등록이며, 서버가 사라지는 일은 없습니다.

| 플래그 | 설명 |
|------|-------------|
| `--to TARGET` | 출처가 기록되지 않은 항목의 복원 대상 지정 (`claude-user` / `claude-project[:PATH]` / `mcp-json[:PATH]` / `claude-desktop`). 출처가 있는 항목은 무시됩니다 |
| `--keep` | host로 복원하되 STM 항목 유지 (이중 등록) |
| `--force` | 같은 이름이지만 내용이 다른 host 항목 덮어쓰기 |
| `--allow-argv-secrets` | secret 으로 분류된 값을 담은 `claude mcp add-json` 실행 허용 (argv 가 프로세스 목록에 노출됨) |
| `--accept-schema-loss` | 복원된 host 항목이 원본과 구조적으로 일치하지 않아도 STM 제거를 진행 (기본값은 STM 항목 유지 후 실패) |
| `--dry-run` | 계획만 출력, 쓰기 없음 |
| `--yes` / `-y` | 확인 프롬프트 생략 (스크립트 / CI / 비-TTY) |

### `mms hook`

지원 host의 built-in 도구 호출을 STM 서피싱으로 연결합니다. Claude Code와 호환 host는 이를 `PostToolUse` hook으로 호출합니다. JSON payload는 stdin으로 들어오고, `mms hook`은 surfaced memory가 담긴 `additionalContext`를 포함할 수 있는 hook output을 출력합니다. Bash 출력 압축은 별도 기능이며 `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED=1`로 opt-in합니다.

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

hook은 항상 exit 0으로 종료합니다. 서피싱, daemon, 압축 중 어떤 단계가 실패해도 host 도구의 출력은 변경 없이 그대로 통과합니다.

### `mms daemon`

`mms hook`이 사용하는 로컬 서피싱 daemon을 관리합니다. daemon 모드는 기본 활성(`MEMTOMEM_STM_HOOK__USE_DAEMON=1`)이며, 첫 적격 hook 호출에서 자동으로 기동되므로 보통 수동 시작이 필요 없습니다.

```bash
mms daemon status                    # daemon 실행 여부 확인
mms daemon start                     # 명시적으로 시작
mms daemon stop                      # 현재 설정용 daemon 중지
```

daemon은 활성 설정에 대한 LTM MCP 세션 하나를 미리 연결된(warm) 상태로 유지합니다. 매 호출마다 세션을 새로 여는 기존 경로를 강제하려면 `MEMTOMEM_STM_HOOK__USE_DAEMON=0`, daemon 미가용 시 해당 경로로 대체(fallback)하려면 `MEMTOMEM_STM_HOOK__FALLBACK=cold`를 설정합니다.

## 프로젝트 관리 (W1)

`.mms/project.toml` 마커로 프로젝트별 활성 MCP 목록을 관리합니다. 디렉터리 단위로 다른 MCP 세트를 가져갈 때 — 예를 들어 회사 코드 작업 시에만 GitHub MCP, 사이드 프로젝트에서는 filesystem 만 — `~/.mms/projects.toml` 에 기록되어 어디서 호출해도 일관되게 작동합니다.

### `mms project init [PATH]`

대상 디렉터리에 `.mms/project.toml` 을 만들고 인덱스에 등록합니다. 경로 생략 시 cwd.

```bash
mms project init                     # cwd 에 .mms/project.toml 생성
mms project init ~/work/billing      # 다른 디렉터리에 생성
mms project init --name acme         # 디렉터리 basename 대신 명시적 이름
mms project init --force             # 기존 마커 덮어쓰기
```

### `mms project show [NAME]`

현재 cwd 에서 감지된(또는 이름으로 지정한) 프로젝트의 활성 MCP 목록과 마커 경로를 출력합니다.

```bash
mms project show
mms project show acme
mms project show --json
```

### `mms project list`

인덱싱된 모든 프로젝트를 보여줍니다. 현재 cwd 에 해당하는 프로젝트는 `*` 로 표시됩니다.

```bash
mms project list
mms project list --json
mms project list --prune             # 더 이상 존재하지 않는 경로 항목 정리
```

### `mms project enable / disable <mcps...>`

프로젝트의 `mcp.enabled` 목록에 MCP 이름을 추가하거나 제거합니다. 대상 프로젝트는 cwd 로 자동 감지되며, `--project <name>` 으로 명시할 수 있습니다.

```bash
mms project enable filesystem github
mms project disable github
mms project enable filesystem --project acme
```

`enable` 은 등록된 MCP 만 받아들이므로 — 비어 있는 registry 에 enable 하면 명확한 에러로 멈춥니다. `disable` 은 registry 와 무관하게 동작합니다.

## 호스트 설정 일괄 가져오기 (W1)

### `mms import`

Claude Code, Claude Desktop, Cursor 같은 host MCP 클라이언트의 설정에서 MCP 정의를 발견해 `~/.mms/registry.toml` 로 옮깁니다. 이는 프로젝트 관리(W1)용 레지스트리를 채우는 명령으로, 업스트림을 프록시 설정으로 가져오는 [`mms add --from-clients`](#mcp-클라이언트에서-일괄-가져오기)와는 대상 파일과 용도가 다릅니다. **미리보기(dry-run)가 기본값** — `--apply` 를 줘야 실제로 씁니다.

```bash
mms import --plan                    # 기본: 무엇을 가져올지 계획만 (secret 은 가림)
mms import --apply                   # 실제 registry 에 쓰기
mms import --from claude-code --plan # host 한정 (claude-code / cursor / codex / claude-desktop / all)
mms import --plan --show-imported    # plan 출력에서 secret 값을 가리지 않음 (주의)
```

먼저 가져온 항목이 우선됩니다. registry 에 동일 이름이 다르게 등록돼 있으면 충돌로 처리해 건너뛰고, 동일한 정의는 변경 없이 그대로 둡니다.

## 운영 통계

프록시·서피싱·선택·압축 동작을 런타임에 점검하려면 STM이 관측용 MCP 도구를 제공합니다 — 이 통계는 CLI 서브명령이 아니라 **MCP 도구**로 노출됩니다. 0.1.29 기준 9개(`stm_proxy_stats`, `stm_proxy_cache_clear`, `stm_proxy_health`, `stm_surfacing_stats`, `stm_index_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`)이며, 기본적으로 MCP `tools/list`에서는 숨겨져 있습니다. 에이전트에 노출하려면 `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`를 설정합니다. 각 도구의 입출력은 [MCP 도구](/ko/stm/mcp-tools/) 페이지를 참조하세요.

## 프록시 서버 실행

프록시 서버 자체는 `memtomem-stm` 콘솔 스크립트로 제공됩니다. 직접 실행하지 않습니다 — `mms init --mcp claude`, `mms register`, 또는 `.mcp.json` 항목을 통해 `memtomem-stm`이 등록되면 MCP 클라이언트가 자동으로 기동합니다.

## 예제 워크플로우

```bash
# 1. 첫 설치 — 업스트림 한 개 + MCP 클라이언트 등록을 한 번에
mms init --mcp claude

# 2. 업스트림 추가 (수동 또는 클라이언트 설정에서 일괄 가져오기)
mms add filesystem --command filesystem-server --prefix fs --validate
mms add --from-clients

# 3. 연결 상태 확인
mms status
mms health

# 4. (선택) 특정 업스트림의 서피싱만 끄기
mms surfacing filesystem off

# 5. (선택) 프록시가 마음에 들지 않으면 원본 host 설정으로 복원
mms eject filesystem

# 6. (선택) 클라이언트 재설치 후 Claude Code에 재등록
mms register --mcp claude
```

이제 MCP 클라이언트는 개별 업스트림 대신 `memtomem-stm`에 연결됩니다. 모든 업스트림 도구가 프록시를 통해 제공되며, 자동 기억 서피싱·응답 압축·점진적 전달이 적용됩니다.

> 설정 방법은 [설치 가이드](/ko/guides/installation/), 서피싱 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참조하세요.
