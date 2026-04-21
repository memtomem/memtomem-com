---
title: CLI 레퍼런스
description: memtomem-stm 프록시 관리를 위한 mms CLI 명령어.
---

`mms` 명령어는 `memtomem-stm` 패키지와 함께 설치됩니다. 업스트림 서버 등록, MCP 클라이언트 등록, 프록시 설정 라이프사이클을 관리합니다. 전체 명령 목록은 `mms --help`, 설치된 버전은 `mms --version`(또는 `mms version` 서브명령)으로 확인할 수 있습니다.

## 명령어

### `mms init`

플래그 없이 `mms init` 을 실행하면 마법사가 업스트림 서버 한 개를 질의하고, 선택적으로 연결을 점검한 뒤 `~/.memtomem/stm_proxy.json` 을 작성하고, 이어서 MCP 클라이언트 등록용 3지선다 프롬프트를 띄웁니다:

1. **Claude Code 에 추가** — `claude mcp add` 를 자동 실행합니다.
2. **`.mcp.json` 생성** — 현재 디렉터리에 프로젝트 스코프 설정 파일을 작성합니다.
3. **건너뛰기** — 수동 등록용 paste hint 를 출력합니다.

스크립트/CI 실행에서 프롬프트를 미리 답하려면 `--mcp` 플래그를 사용합니다:

```bash
mms init --mcp claude                # Claude Code 에 자동 등록
mms init --mcp json                  # 현재 디렉터리에 .mcp.json 생성
mms init --mcp skip                  # 설정만 쓰고 paste hint 출력 후 종료
mms init --no-validate               # 업스트림 연결 점검 생략
```

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

`mms add --from-clients` (별칭 `--import`)는 Claude Desktop, Claude Code, 프로젝트 `.mcp.json`에서 등록된 서버를 탐색해 일괄 가져옵니다 — `mms init`의 탐색 + TUI 흐름을 재사용합니다. 이미 등록된 서버는 건너뜁니다.

```bash
mms add --from-clients               # 대화형 일괄 가져오기
mms add --import                     # 별칭
mms add --from-clients --prune       # 가져온 뒤 source 클라이언트에서 직접 등록 제거
```

가져오기가 성공하면 같은 서버가 STM 프록시 경로와 source 클라이언트 경로 양쪽에 노출되어 압축·캐싱·LTM 서피싱이 우회됩니다. `--prune` 플래그(또는 TTY 환경에서 뜨는 대화형 확인 프롬프트, 기본 **No**)는 Claude Code 스코프별 `claude mcp remove`와 Claude Desktop JSON 파일의 원자적 재작성을 수행해 이중 등록을 바로 정리합니다. 비대화 환경에서 `--prune` 없이 실행하면 이전처럼 안내 경고만 출력하며, 수동 복구 명령도 함께 표시됩니다.

`NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`와 함께 쓸 수 없습니다. `--prune`은 반드시 `--from-clients` / `--import`와 함께 써야 합니다.

### `mms list`

등록된 모든 업스트림 서버를 조회합니다.

```bash
mms list                             # 사람이 읽기 좋은 표
mms list --json                      # 스크립트용 JSON
```

### `mms status`

프록시 게이트웨이 설정과 전체 서버 목록을 표시합니다.

```bash
mms status
mms status --json                    # 스크립트용 JSON
```

### `mms remove <name>`

등록된 업스트림 서버를 제거합니다.

```bash
mms remove filesystem                # 확인 프롬프트
mms remove filesystem -y             # 확인 생략
```

### `mms health`

등록된 모든 업스트림 서버에 대해 MCP 연결 상태를 점검합니다. `status` / `list`와 일관된 형식으로 출력됩니다.

```bash
mms health                           # 사람이 읽기 좋은 출력
mms health --json                    # 스크립트용 JSON
mms health --timeout 5               # 서버별 연결 타임아웃(초)
```

### 운영 통계

프록시/서피싱/압축 통계는 CLI 서브명령이 아닌 **MCP 도구**로 노출됩니다 — `stm_proxy_stats`, `stm_surfacing_stats`, `stm_progressive_stats`, `stm_compression_stats`, `stm_proxy_health`, `stm_tuning_recommendations`. MCP 클라이언트에서 호출하거나, `advertise_observability_tools=false`로 에이전트 노출에서 숨길 수 있습니다. 자세한 도구 목록은 [MCP 도구](/ko/stm/mcp-tools/) 페이지를 참조하세요.

### 프록시 서버 실행

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

# 4. (선택) 클라이언트 재설치 후 Claude Code에 재등록
mms register --mcp claude
```

이제 MCP 클라이언트는 개별 업스트림 대신 `memtomem-stm`에 연결됩니다. 모든 업스트림 도구가 프록시를 통해 제공되며, 자동 기억 서피싱·응답 압축·점진적 전달이 적용됩니다.

> 설정 방법은 [설치 가이드](/ko/guides/installation/), 서피싱 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참조하세요.
