---
title: AI 클라이언트 연결
description: Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi CLI, OpenCode, Hermes Agent, Antigravity를 memtomem에 연결합니다.
---

**예상 시간:** 5~10분

**목표:** 클라이언트 하나를 연결하고 `mem_status`를 호출해 CLI와 같은 데이터베이스를 사용하는지 확인합니다.

## 연결 전 확인

[빠른 시작](/ko/guides/quickstart/)을 완료한 뒤 다음 명령을 실행합니다.

```bash
mm status
```

출력에 표시된 데이터베이스 경로를 기억해 두세요. 클라이언트 연결 결과와 비교할 때 사용합니다.

MCP 서버만 수동으로 등록할 때는 `memtomem-server` 명령을 사용합니다. `memtomem`과 `mm`은 터미널용 CLI이므로 MCP 서버 명령으로 사용하면 안 됩니다. 공식 플러그인은 자체적으로 고정한 실행 명령을 사용할 수 있습니다.

아래에서 사용할 클라이언트 **하나만** 고르세요. 플러그인과 수동 MCP 항목이 이미 함께 있다면, 한쪽이 자동으로 제거된다고 가정하지 말고 클라이언트별 판정 기준을 확인합니다.

| 클라이언트 | 항목을 구분하는 기준 | 결과 |
|---|---|---|
| Claude Code | 명령과 인수의 정확한 조합 | 조합이 같으면 서버 하나만 실행하고, 다르면 서버 두 개가 실행 |
| Codex CLI | 서버 이름 | 수동 `memtomem`이 우선하고, 이름이 다르면 서버 두 개가 실행 |
| OpenCode | `mcp` 키 | 수동 `mcp.memtomem`이 우선하고, 키가 다르면 서버 두 개가 실행 |
| Hermes Agent | 서버 이름 | 수동 `mcp_servers.memtomem`이 우선하고, 이름이 다르면 서버 두 개가 실행 |

## Claude Code

공식 플러그인 설치를 권장합니다. 현재 마켓플레이스 플러그인 버전은 0.5.9이며 Core 0.6.7을 포함합니다.

```text
/plugin marketplace add memtomem/memtomem
/plugin install memtomem@memtomem
/reload-plugins
```

`/reload-plugins`를 사용할 수 없으면 Claude Code를 새로 시작합니다. 이어서 다음 명령을 실행하세요.

```text
/memtomem:status
/memtomem:remember 확인된 결정으로 기억해줘: 전환 전에 릴리스 스모크 테스트를 실행한다.
/memtomem:search 릴리스 스모크 테스트
```

상태에 `mm status`와 같은 데이터베이스 경로가 표시되고, 검색 결과에 저장한 문장과 출처 경로가 나오면 성공입니다.

이전에 서버를 수동으로 등록했다면 먼저 `/mcp`를 실행하세요. Claude Code 2.1.218은 명령과 인수가 정확히 같은지 비교하며 환경변수는 비교하지 않습니다. 플러그인이 사용하는 실행 조합은 다음과 같습니다.

```text
uvx --from memtomem[onnx]==0.6.7 memtomem-server
```

이 조합이 같으면 수동 등록이 우선하고 `mcp__memtomem__mem_*` 이름으로 서버 하나만 실행합니다. 아래의 단독 `memtomem-server` 등록은 조합이 다르므로 서버 두 개가 실행되고, 도구가 `mcp__memtomem__mem_*`와 `mcp__plugin_memtomem_memtomem__mem_*`에 모두 나타납니다.

`/memtomem:setup`은 이렇게 두 네임스페이스가 생긴 상태와 해결 방법을 알려주지만 등록을 자동으로 제거하지는 않습니다. 원하는 구성을 선택하세요.

- **플러그인 유지(권장):** `claude mcp remove memtomem`으로 수동 항목을 제거합니다. 사용자 범위 항목은 `-s user`를 추가하고, 프로젝트 범위 항목은 `.mcp.json`에서 제거합니다.
- **수동 서버만 유지:** `/plugin uninstall memtomem@memtomem`을 실행합니다.
- **플러그인 명령과 수동 서버를 함께 유지:** 플러그인은 설치된 상태로 두고 수동 항목을 플러그인과 정확히 같은 조합으로 등록합니다. 예:

  ```bash
  claude mcp add memtomem -- uvx --from "memtomem[onnx]==0.6.7" memtomem-server
  ```

플러그인의 명령과 스킬 없이 MCP 서버만 연결하려면 Claude Code 등록 범위를 하나 선택합니다.

| 범위 | 명령 | 적용 대상 |
|---|---|---|
| Local | `claude mcp add memtomem -- memtomem-server` | 현재 프로젝트와 사용자 |
| User | `claude mcp add memtomem -s user -- memtomem-server` | 이 사용자의 모든 프로젝트 |
| Project | 프로젝트 루트의 `.mcp.json` 커밋 | 신뢰 승인 후 팀원과 공유 |

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "args": []
    }
  }
}
```

## Codex CLI

공식 플러그인을 설치합니다.

```bash
codex plugin marketplace add memtomem/memtomem
codex plugin add memtomem@memtomem
```

새 Codex 스레드를 시작한 뒤 다음처럼 요청하세요.

```text
$memtomem-status로 현재 기억 데이터베이스 경로를 보여줘.
$memtomem-remember로 이 확인된 결정을 저장해줘: 전환 전에 릴리스 스모크 테스트를 실행한다.
$memtomem-search로 "릴리스 스모크 테스트"를 찾고 출처도 보여줘.
```

MCP 서버만 연결하려면 `~/.codex/config.toml`에 다음 내용을 추가합니다.

```toml
[mcp_servers.memtomem]
command = "memtomem-server"
args = []
supports_parallel_tool_calls = true
```

파일을 바꾼 뒤 Codex를 다시 시작합니다.

Codex는 MCP 서버 이름을 기준으로 판정합니다. 플러그인이 함께 설치되어 있어도 수동 `[mcp_servers.memtomem]` 항목이 우선하므로 서버 하나만 실행합니다. 플러그인에 포함된 고정 버전 서버로 전환하려면 수동 항목을 제거하세요. 수동 항목의 이름을 `[mcp_servers.memtomem-local]`로 바꾸면 중복 제거되지 않아 서버 두 개가 실행되므로 정확히 `memtomem`이라는 이름을 사용합니다. 최종 적용 결과는 `codex mcp list`로 확인합니다.

## JSON 방식 MCP 클라이언트

아래에서 별도 형식을 안내하지 않는 클라이언트에는 다음 서버 항목을 사용합니다.

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "args": []
    }
  }
}
```

| 클라이언트 | 설정 파일 | 변경 후 할 일 |
|---|---|---|
| Cursor | `~/.cursor/mcp.json` | Cursor 재시작 |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | Windsurf 재시작 |
| macOS Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | 앱 완전 종료 후 다시 열기 |
| Windows Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` | 앱 완전 종료 후 다시 열기 |
| Gemini CLI | `~/.gemini/settings.json` | CLI 재시작. 새 설정은 Antigravity CLI 권장 |
| Kimi CLI | `~/.kimi/mcp.json` 또는 `$KIMI_SHARE_DIR/mcp.json` | Kimi CLI 재시작 |

Kimi CLI는 설정 마법사로 등록할 수도 있습니다.

```bash
mm init --mcp kimi
```

## OpenCode

공개 플러그인은 고정 버전 MCP 서버와 명령·스킬을 함께 제공합니다. `opencode.json`에 추가하세요.

```json
{
  "plugin": ["opencode-memtomem@0.3.9"]
}
```

MCP 도구만 필요한 경우:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.6.7", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core"}
    }
  }
}
```

OpenCode는 `mcp` 키의 정확한 이름으로 판정합니다. 기존 `mcp.memtomem` 항목이 플러그인의 기본 서버보다 우선하므로 서버 하나만 실행합니다. 플러그인 서버를 사용하려면 이 수동 항목을 제거하세요. `mcp."memtomem-local"`처럼 다른 키를 쓰면 중복 제거되지 않아 서버 두 개가 실행됩니다.

## Hermes Agent

공식 플러그인 패키지는 memtomem MCP 서버와 기억 스킬 6개(index, recall, remember, search, setup, status)를 함께 제공합니다. 다음 조건이 필요합니다.

- Hermes Agent 0.21.5 이상
- Hermes 환경의 MCP 지원(`hermes-agent[mcp]`). 없으면 스킬만 로드되고 MCP 서버는 시작되지 않으며, 원인은 디버그 로그에만 남습니다.
- `PATH`에 있는 `uv`. 플러그인은 서버를 `uvx --python 3.12 --from 'memtomem[onnx]==0.6.7' memtomem-server`로 시작합니다.
- Python 3.12. uv가 3.12를 찾지 못하면 첫 시작 때 내려받습니다. 오프라인이거나 uv의 Python 다운로드가 꺼져 있어 내려받을 수 없으면 서버가 시작되지 않으므로, 이때는 `uv python install 3.12`를 한 번 실행합니다.

Hermes 플러그인 카탈로그에서 설치합니다.

```bash
hermes plugins install memtomem --enable
```

카탈로그는 검토를 거친 commit을 고정하며, 현재 고정된 commit은 memtomem 0.6.7입니다. 카탈로그 항목이 갱신되기 전에는 최신 릴리스보다 뒤처질 수 있습니다. 특정 릴리스를 직접 고정하려면 Git 저장소에서 설치합니다. Hermes의 `--ref`는 태그 이름을 받지 않고 40자 commit SHA만 받습니다. 0.6.7의 commit으로 설치하는 명령은 다음과 같습니다.

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-plugin" --ref 5b7034126574a2956b6a328622006a46b2a0e367 --enable
```

다른 릴리스의 commit은 `git ls-remote --exit-code https://github.com/memtomem/memtomem "refs/tags/v<버전>" "refs/tags/v<버전>^{}"`로 확인합니다. 출력이 두 줄이면 `^{}`로 끝나는 줄의 SHA를 사용합니다. 이미 설치되어 있다면 `--force --ref <새 commit SHA>`로 다시 설치합니다.

새 Hermes 세션을 시작한 뒤 memtomem 상태를 보여 달라고 요청하고, 표시된 데이터베이스 경로가 `mm status`와 같은지 확인합니다.

이 패키지는 memtomem을 **사용자 범위**로 실행합니다. 서버가 플러그인 디렉터리에서 시작하므로 프로젝트별 기억은 사용할 수 없고, 색인할 경로는 절대 경로로 지정해야 합니다. 프로젝트가 필요한 handoff 워크플로도 포함되지 않습니다. `~/.memtomem/config.json`의 저장소 경로는 절대 경로이거나 `~`로 시작해야 합니다. 상대 경로는 플러그인 디렉터리를 기준으로 해석되어 다른 저장소를 엽니다.

MCP 서버만 연결하려면 `~/.hermes/config.yaml`에 다음 항목을 추가한 뒤 새 세션을 시작합니다.

```yaml
mcp_servers:
  memtomem:
    command: memtomem-server
    args: []
```

두 방식 모두 Hermes는 허용된 일부 환경 변수와 Hermes에 설정한 외부 비밀 저장소의 변수만 MCP 서버에 전달합니다. 셸에서 export한 `MEMTOMEM_*` 설정은 서버에 적용되지 않습니다. 반면 memtomem은 시작할 때 `.env` 파일을 직접 읽습니다. 이 파일은 플러그인이나 실행 디렉터리가 아니라 설치된 패키지 위치에서 위쪽으로 찾으며, 플러그인의 `uvx` 실행에서는 보통 `~/.env`이므로 그 설정은 적용될 수 있습니다. 데이터베이스 경로가 `mm status`와 다르면 이 차이부터 확인합니다. 수동 항목에서는 필요한 값을 `env:` 아래에 직접 지정할 수 있습니다.

Hermes는 MCP 서버 이름으로 판정합니다. 플러그인이 함께 활성화되어 있어도 `config.yaml`의 `mcp_servers.memtomem` 항목이 우선하므로 서버 하나만 실행합니다. 플러그인 서버로 전환하려면 이 항목을 제거하세요. `mcp_servers.memtomem-local`처럼 다른 이름을 쓰면 중복 제거되지 않아 서버 두 개가 실행됩니다. `hermes mcp list`는 `config.yaml`의 항목만 보여 주며 플러그인 서버는 표시하지 않습니다.

## Antigravity

Antigravity IDE와 Antigravity CLI(`agy`)는 서로 다른 파일을 사용합니다.

- IDE 내장 Gemini 에이전트: `~/.gemini/antigravity/mcp_config.json`에 위 `mcpServers` 항목 사용
- IDE의 VS Code 기반 연동: `~/Library/Application Support/Antigravity/User/mcp.json`에 해당 연동의 `servers` 형식 사용
- Antigravity CLI: `~/.gemini/antigravity-cli/mcp_config.json`

```json
{
  "mcpServers": {
    "memtomem": {
      "type": "stdio",
      "command": "memtomem-server",
      "args": []
    }
  }
}
```

파일을 바꾼 뒤 에이전트 세션을 다시 시작합니다. Antigravity는 별도로 설치된 VS Code의 MCP 항목을 물려받지 않습니다.

## 연결 확인

클라이언트에 다음처럼 요청합니다.

```text
mem_status를 호출해서 데이터베이스 경로, 임베딩 제공자, 청크 수를 보여줘.
```

다음 조건을 모두 만족하면 연결이 끝났습니다.

- memtomem 서버 또는 도구 네임스페이스가 정확히 하나만 활성화됨
- 클라이언트에 기본 Core 도구 9개 또는 플러그인의 안내 워크플로가 보임
- `mem_status` 호출 성공
- 데이터베이스 경로가 `mm status`와 같음
- 새 세션에서 저장한 기억을 출처 경로와 함께 검색 가능

서버가 두 개 실행 중이어도 `mem_status` 호출과 데이터베이스 경로 비교는 성공할 수 있습니다. 첫 번째 조건은 Claude Code의 `/mcp`, Codex의 `codex mcp list`, OpenCode의 정확한 `mcp.memtomem` 키로 따로 확인하세요. Hermes Agent에서는 `hermes plugins list --enabled`의 플러그인과 `config.yaml`의 모든 `mcp_servers` 항목을 함께 확인합니다.

## 연결되지 않을 때

1. `mm status`로 설치 문제와 클라이언트 문제를 구분합니다.
2. MCP 서버만 수동으로 등록했다면 `command`가 `memtomem-server`인지 확인합니다. 공식 플러그인은 자체적으로 고정한 명령을 사용할 수 있습니다.
3. 위의 Claude Code, Codex, OpenCode, Hermes Agent 판정 기준에 따라 활성 서버를 하나만 남깁니다.
4. 플러그인 설치 뒤 클라이언트를 다시 시작하거나 새 세션을 엽니다.
5. GUI에서 수동 명령을 찾지 못하면 `command -v memtomem-server`로 절대 경로를 확인해 설정에 사용합니다.
6. 데이터베이스 경로나 네임스페이스가 다르면 [문제 해결](/ko/guides/troubleshooting/)을 이어서 확인합니다.

플러그인 설치만으로 프로젝트 색인, 내장 기억 가져오기, 파일 감시, 대화 전체 저장이 실행되지는 않습니다. 이런 작업은 [기존 자료 색인·가져오기](/ko/guides/index-and-import/)에서 명시적으로 실행하세요.

## 다음 단계

- [세션을 넘나드는 기억](/ko/guides/memory-persistence/)
- [기존 자료 색인·가져오기](/ko/guides/index-and-import/)
- [LTM MCP 도구](/ko/ltm/mcp-tools/)
- [LTM 운영 및 API](/ko/ltm/operations/)
