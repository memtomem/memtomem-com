---
title: AI 클라이언트 연결
description: Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi CLI, OpenCode, Antigravity를 memtomem에 연결합니다.
---

**예상 시간:** 5~10분

**목표:** 클라이언트 하나를 연결하고 `mem_status`를 호출해 CLI와 같은 데이터베이스를 사용하는지 확인합니다.

## 연결 전 확인

[빠른 시작](/ko/guides/quickstart/)을 완료한 뒤 다음 명령을 실행합니다.

```bash
mm status
```

출력에 표시된 데이터베이스 경로를 기억해 두세요. 클라이언트 연결 결과와 비교할 때 사용합니다.

MCP 서버 명령은 `memtomem-server`입니다. `memtomem`과 `mm`은 터미널용 CLI이므로 MCP 서버 명령으로 사용하면 안 됩니다.

아래에서 사용하는 클라이언트 **하나만** 고르세요. 플러그인과 수동 MCP 등록으로 같은 서버를 두 번 연결하면 도구가 중복되어 보일 수 있습니다.

## Claude Code

공식 플러그인 설치를 권장합니다.

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

MCP 서버만 연결하려면 Claude Code 등록 범위를 하나 선택합니다.

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
  "plugin": ["opencode-memtomem@0.1.2"]
}
```

MCP 도구만 필요한 경우:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.3.12", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core"}
    }
  }
}
```

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

- 클라이언트에 기본 Core 도구 9개 또는 플러그인의 안내 워크플로가 보임
- `mem_status` 호출 성공
- 데이터베이스 경로가 `mm status`와 같음
- 새 세션에서 저장한 기억을 출처 경로와 함께 검색 가능

## 연결되지 않을 때

1. `mm status`로 설치 문제와 클라이언트 문제를 구분합니다.
2. 설정의 `command`가 `memtomem-server`인지 확인합니다.
3. 플러그인 설치 뒤 클라이언트를 다시 시작하거나 새 세션을 엽니다.
4. GUI에서 명령을 찾지 못하면 `command -v memtomem-server`로 절대 경로를 확인해 설정에 사용합니다.
5. 플러그인이 같은 서버를 제공한다면 중복된 수동 MCP 항목을 제거합니다.
6. 데이터베이스 경로나 네임스페이스가 다르면 [문제 해결](/ko/guides/troubleshooting/)을 이어서 확인합니다.

플러그인 설치만으로 프로젝트 색인, 내장 기억 가져오기, 파일 감시, 대화 전체 저장이 실행되지는 않습니다. 이런 작업은 [기존 자료 색인·가져오기](/ko/guides/index-and-import/)에서 명시적으로 실행하세요.

## 다음 단계

- [세션을 넘나드는 기억](/ko/guides/memory-persistence/)
- [기존 자료 색인·가져오기](/ko/guides/index-and-import/)
- [LTM MCP 도구](/ko/ltm/mcp-tools/)
- [LTM 운영 및 API](/ko/ltm/operations/)
