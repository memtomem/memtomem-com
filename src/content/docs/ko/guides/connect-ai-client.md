---
title: AI 클라이언트 연결
description: Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi Code, OpenCode, Hermes Agent, Antigravity를 memtomem에 연결합니다.
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

memtomem의 [`update` 워크플로](/ko/ltm/project-workflows/#update)를 실행하는 클라이언트(Claude Code, Codex CLI, OpenCode, Kimi Code, Antigravity CLI)의 수동 항목에는 `MEMTOMEM_EXTRA_TOOLS=mem_update_coverage`도 함께 설정합니다. 이 변수는 일반 설정 파일 항목이 아닙니다. 워크플로가 `topic` 이외의 모드에서 필요로 하는 도구를 추가로 노출하는 환경 변수이며, 서버가 설정 파일을 로드하기 전에 읽으므로 `~/.memtomem/config.json`에서는 지정할 수 없습니다(나머지 일반 설정은 기존처럼 해당 파일에서 읽습니다). 이 워크플로를 사용하지 않는 다른 클라이언트의 항목에는 설정하지 않습니다. [Cursor 플러그인](#cursor-플러그인)도 이 워크플로를 실행하며, 플러그인에 포함된 서버가 이 변수를 이미 설정합니다.

아래에서 사용할 클라이언트 **하나만** 선택하세요. 플러그인과 수동 MCP 항목이 이미 함께 등록되어 있다면, 한쪽이 자동으로 제거된다고 가정하지 말고 클라이언트별 판정 기준을 확인합니다.

| 클라이언트 | 중복 판정 기준 | 결과 |
|---|---|---|
| Claude Code | 명령과 인수의 정확한 조합 | 조합이 같으면 서버 하나만 실행하고, 다르면 서버 두 개가 실행됨 |
| Codex CLI | 서버 이름 | 수동 `memtomem`이 우선하고, 이름이 다르면 서버 두 개가 실행됨 |
| OpenCode | `mcp` 키 | 수동 `mcp.memtomem`이 우선하고, 키가 다르면 서버 두 개가 실행됨 |
| Hermes Agent | 서버 이름 | 수동 `mcp_servers.memtomem`이 우선하고, 이름이 다르면 서버 두 개가 실행됨 |
| Antigravity CLI | 서버 이름 | 플러그인 서버의 이름이 `memtomem_memtomem`이므로 수동 `memtomem` 항목과 일치하지 않아 서버 두 개가 실행됨 |
| Cursor | 중복 판정 안 함 | 플러그인이 수동 `memtomem` 항목과 별도로 자체 서버를 추가하므로 서버 두 개가 실행됨 |

## Claude Code

공식 플러그인 설치를 권장합니다. Core 0.7.9와 함께 배포된 플러그인 버전은 0.5.36이며 Core 0.7.9를 포함합니다.

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

상태 출력의 데이터베이스 경로가 `mm status`와 같고, 검색 결과에 저장한 문장과 출처 경로가 표시되면 성공입니다.

이전에 서버를 수동으로 등록했다면 먼저 `/mcp`를 실행하세요. Claude Code 2.1.218은 명령과 인수가 정확히 같은지 비교하며 환경 변수는 비교하지 않습니다. 플러그인이 사용하는 실행 조합은 다음과 같습니다.

```text
uvx --from memtomem[onnx]==0.7.9 memtomem-server
```

이 조합이 같으면 수동 등록이 우선하고 `mcp__memtomem__mem_*` 이름으로 서버 하나만 실행합니다. 아래의 단독 `memtomem-server` 등록은 조합이 다르므로 서버 두 개가 실행되고, 도구가 `mcp__memtomem__mem_*`와 `mcp__plugin_memtomem_memtomem__mem_*`에 모두 표시됩니다.

`/memtomem:setup`은 두 네임스페이스가 생긴 상태와 해결 방법을 안내하지만, 등록을 자동으로 제거하지는 않습니다. 원하는 구성을 선택하세요.

- **플러그인 유지(권장):** `claude mcp remove memtomem`으로 수동 항목을 제거합니다. 사용자 범위 항목은 `-s user`를 추가하고, 프로젝트 범위 항목은 `.mcp.json`에서 제거합니다.
- **수동 서버만 유지:** `/plugin uninstall memtomem@memtomem`을 실행합니다.
- **플러그인 명령과 수동 서버를 함께 유지:** 플러그인은 설치된 상태로 두고 수동 항목을 플러그인과 정확히 같은 조합으로 등록합니다. 예:

  ```bash
  claude mcp add memtomem -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- uvx --from "memtomem[onnx]==0.7.9" memtomem-server
  ```

  수동 항목은 환경 변수까지 포함해 우선하므로, 플러그인의 `update` 워크플로를 `topic` 이외의 모드로 실행하려면 이 변수가 필요합니다.

  기존 수동 항목을 그대로 두고 플러그인에 포함된 서버를 비활성화하는 방법도 있습니다. `mm doctor --mcp-client claude --reconcile keep-manual`로 미리 확인하고, 모든 Claude 세션을 종료한 뒤 `--apply`를 붙여 다시 실행합니다. 플러그인을 업데이트하거나 다시 설치하면 포함된 서버가 복원될 수 있으므로, 그 뒤에 `mm doctor --mcp-client claude`를 다시 실행합니다. 백업과 종료 코드는 [`mm doctor`](/ko/ltm/cli/#추가-진단검토-명령)를 참고하세요.

플러그인의 명령과 스킬 없이 MCP 서버만 연결하려면 Claude Code 등록 범위를 하나 선택합니다.

| 범위 | 명령 | 적용 대상 |
|---|---|---|
| Local | `claude mcp add memtomem -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- memtomem-server` | 현재 프로젝트와 사용자 |
| User | `claude mcp add memtomem -s user -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- memtomem-server` | 이 사용자의 모든 프로젝트 |
| Project | 프로젝트 루트의 `.mcp.json` 커밋 | 신뢰 승인 후 팀원과 공유 |

`-e`는 `--`보다 앞에 두어야 합니다. `--` 뒤의 내용은 모두 서버 실행 명령으로 처리됩니다.

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "args": [],
      "env": {"MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}
    }
  }
}
```

### 선택형 자동화 플러그인

`memtomem-automation`은 별도 요청 없이 기억을 검색하고 변경된 파일을 자동으로 색인하려는 사용자를 위한 선택형 Claude Code 플러그인입니다. 기본 플러그인을 먼저 설치한 뒤 추가로 설치합니다. Core 0.7.9와 함께 배포된 버전은 0.3.23입니다.

```text
/plugin install memtomem-automation@memtomem
```

이 플러그인의 hook은 `uv`로 실행되어 `mm` CLI를 호출하므로, Claude Code의 hook 실행 환경 `PATH`에 `uv`와 `mm`이 모두 포함되어 있어야 합니다.

- 앞뒤 공백을 제외하고 20자를 초과하는 프롬프트는 앞부분 500자로 검색하고(`mm search`, 상위 3개), 결과를 대화 맥락에 추가합니다.
- Write나 Edit로 수정된 파일이 지원 형식이고 빌드·캐시·의존성 디렉터리 외부에 있으면 색인 대기열에 추가합니다.
- 응답이 끝나면 대기열을 처리합니다.

에피소드 세션을 시작하거나 종료하지는 않습니다. 비활성화하려면 `/plugin uninstall memtomem-automation@memtomem`으로 제거하세요. 기본 플러그인은 계속 동작합니다.

hook은 `mm --version` 출력이 플러그인 검증 기준 릴리스인 0.7.9와 정확히 일치할 때만 실행되며, 플러그인을 업데이트해도 이 CLI는 자동으로 업그레이드되지 않습니다. 플러그인을 업데이트할 때마다 `mm`도 함께 업그레이드하고 버전을 확인한 뒤 새 Claude Code 세션을 시작합니다.

```bash
mm upgrade --version 0.7.9
mm --version
```

`mm upgrade`는 기존 `uv tool` 설치에서 찾은 선택 기능(extras)을 유지합니다. 먼저 `mm upgrade --dry-run`의 `Extras:` 줄을 확인하세요([`mm upgrade`](/ko/ltm/cli/#mm-upgrade) 참고). 기존 `uv tool` 설치가 없다면 `uv tool install 'memtomem[all]==0.7.9'`로 설치합니다. 선택 기능 없이 `memtomem==0.7.9`만 설치하면 `mm init`의 영어·한국어 프리셋이 사용하는 ONNX 의존성이 포함되지 않아, 색인을 수행하는 대신 의존성 누락을 보고합니다. 다른 버전이거나 `mm`이 없으면 hook은 모든 프롬프트와 편집을 건너뜁니다. 세션 시작 시 플러그인이 감지한 버전을 Claude에 알리고, 건너뛸 때마다 `~/.claude/memtomem-automation/hook.log`(Claude Code가 `$CLAUDE_PLUGIN_DATA`를 설정하면 `$CLAUDE_PLUGIN_DATA/hook.log`)에 기록합니다.

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
env = { MEMTOMEM_EXTRA_TOOLS = "mem_update_coverage" }
supports_parallel_tool_calls = true
```

파일을 수정한 뒤 Codex를 다시 시작합니다.

Codex는 MCP 서버 이름을 기준으로 판정합니다. 플러그인이 함께 설치되어 있어도 수동 `[mcp_servers.memtomem]` 항목이 우선하므로 서버 하나만 실행합니다. 따라서 플러그인의 `memtomem-update` 스킬을 `topic` 이외의 모드로 실행하려면 이 항목에 위의 `env` 줄이 필요합니다. 플러그인에 포함된 고정 버전 서버로 전환하려면 수동 항목을 제거하세요. 수동 항목의 이름을 `[mcp_servers.memtomem-local]`로 바꾸면 중복 제거되지 않아 서버 두 개가 실행되므로 정확히 `memtomem`이라는 이름을 사용합니다. 최종 적용 결과는 `codex mcp list`로 확인합니다.

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
| Kimi Code | `~/.kimi-code/mcp.json` 또는 `$KIMI_CODE_HOME` 아래의 `mcp.json` | Kimi Code 재시작 |

Kimi Code는 `update` 워크플로를 실행하므로, 설정 항목의 `"args"` 옆에 `"env": {"MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}`도 함께 추가합니다. 설정 마법사는 이 값을 포함해 항목을 작성하며, 다시 실행하면 기존 Kimi 항목도 갱신합니다.

```bash
mm init --mcp kimi
```

memtomem은 현재 Kimi Code 홈 경로에만 Kimi 항목을 작성합니다. 이전 경로인 `~/.kimi/mcp.json`(또는 `$KIMI_SHARE_DIR` 하위)에 남아 있는 memtomem 항목은 자동으로 갱신되지 않으며 `mm uninstall`도 경로만 안내하므로 직접 제거해야 합니다.

## Cursor

MCP 서버만 등록하려면 [JSON 방식 MCP 클라이언트](#json-방식-mcp-클라이언트)의 기본 항목을 `~/.cursor/mcp.json`이나 프로젝트의 `.cursor/mcp.json`에 추가하고 Cursor를 다시 시작합니다.

### Cursor 플러그인

Cursor 플러그인은 버전을 고정한 memtomem MCP 서버와, [Antigravity CLI 플러그인](#antigravity-cli-플러그인)과 동일한 기억 스킬 9개를 함께 제공합니다. 세 가지 [프로젝트 워크플로](/ko/ltm/project-workflows/)(handoff, brief, update)도 포함됩니다. Core 0.7.4부터 제공되는 **실험 기능**이므로 구성과 스킬이 지원 중단 예고 없이 바뀔 수 있습니다. 다음 환경이 필요합니다.

- Cursor 3.27.22 이상(플러그인 검증 기준 버전)
- Cursor가 MCP 서버를 시작할 때 참조하는 `PATH`에 포함된 `uv`. 플러그인은 `uvx --python 3.12 --from 'memtomem[onnx]==0.7.9' memtomem-server`로 서버를 시작합니다.
- Python 3.12. `uv`가 Python 3.12를 찾지 못하면 첫 실행 시 자동으로 내려받습니다. 내려받을 수 없는 환경에서는 서버가 시작되지 않으므로 `uv python install 3.12`를 한 번 실행하세요.

Cursor Marketplace에 등록되기 전까지는 0.7.9 릴리스에서 로컬 플러그인으로 설치합니다. Cursor는 심볼릭 링크(symlink)가 `~/.cursor/plugins/local` 내부를 가리킬 때만 로컬 플러그인으로 불러오므로 디렉터리를 직접 복사합니다.

```bash
git clone --branch v0.7.9 --depth 1 https://github.com/memtomem/memtomem.git memtomem-v0.7.9 &&
  mkdir -p ~/.cursor/plugins/local &&
  cp -R memtomem-v0.7.9/packages/memtomem-cursor-plugin ~/.cursor/plugins/local/memtomem
```

**Developer: Reload Window**를 실행한 뒤 **Customize**에서 memtomem MCP 서버와 스킬 9개가 표시되는지 확인합니다. Cursor Enterprise 팀에서는 관리자가 먼저 로컬 플러그인 가져오기를 허용해야 합니다. `main` 브랜치 대신 릴리스 태그를 clone하세요. 버전이 올라간 직후의 `main`은 아직 PyPI에 배포되지 않은 memtomem 릴리스를 가리킬 수 있으며, 이 경우 서버가 시작되지 않습니다.

위 명령은 clone이 성공했을 때만 복사를 수행합니다. `memtomem-v0.7.9` 디렉터리가 이미 존재하면 clone이 실패하고 아무것도 복사하지 않으므로, 기존 디렉터리를 먼저 삭제하거나 이름을 변경하세요. 업데이트할 때는 새 릴리스의 태그를 같은 방식으로 별도 디렉터리에 clone한 뒤 설치된 사본을 교체합니다. `~/.cursor/plugins/local/memtomem`을 삭제하고 새 clone의 `packages/memtomem-cursor-plugin`을 그 위치로 복사한 다음 창을 다시 불러옵니다. clone한 디렉터리는 복사에만 필요하므로 설치 후 삭제해도 됩니다. 기존 `~/.cursor/plugins/local/memtomem`을 지우지 않고 그 위에 복사하면 디렉터리 내부에 중첩되어 이전 버전이 계속 사용됩니다. 플러그인을 제거하려면 `~/.cursor/plugins/local/memtomem`을 삭제하세요. 기억은 `~/.memtomem`에 그대로 남습니다.

Cursor는 플러그인 서버를 열린 작업 공간이 아니라 홈 디렉터리에서 시작하므로 서버가 **사용자 범위**로 구동됩니다. 각 스킬은 Antigravity CLI 스킬과 같은 방식으로 서버를 현재 저장소에 바인딩합니다. 바인딩하려면 저장소에 등록된 계층(`mm mem init --scope project_local`)이 있어야 하며, 바인딩은 서버가 재시작될 때까지 유지됩니다. 바인딩된 뒤에는 `search`와 `recall`이 해당 저장소의 프로젝트 기억도 함께 읽고, `remember`는 프로젝트 사실을 저장소의 `project_local` 계층에 저장합니다. 등록된 계층이 없거나 Git 저장소 밖이라면 `search`와 `recall`은 사용자 범위 기억만 읽고, `remember`는 프로젝트와 무관한 선호·개인 메모만 저장하며 프로젝트 사실은 거부하고, 세 가지 프로젝트 워크플로는 중단됩니다. 바인딩 단계는 Cursor 터미널에서 `git rev-parse --show-toplevel`을 실행하므로, 셸 명령을 차단하는 Cursor 훅(Cursor가 가져온 Claude Code 훅 포함)이 있으면 바인딩 전에 스킬이 멈춥니다. `remember`, `index`, `setup`과 세 가지 프로젝트 워크플로는 `/skill-name`으로 직접 호출할 때만 실행됩니다. `~/.memtomem/config.json`의 저장소 경로는 절대 경로이거나 `~`로 시작해야 하며, 상대 경로를 적으면 홈 디렉터리 기준으로 해석되어 의도와 다른 저장소를 열게 됩니다.

플러그인은 `~/.cursor/mcp.json`이나 프로젝트의 `.cursor/mcp.json`에 직접 등록한 `memtomem` 항목을 대체하지 않으므로 서버 두 개가 실행됩니다. `mem_status`가 보고하는 DB 경로를 비교한 뒤 수동 항목을 제거해 서버 하나만 실행되게 합니다. 자세한 내용은 [플러그인 README](https://github.com/memtomem/memtomem/blob/v0.7.9/packages/memtomem-cursor-plugin/README.md)를 참고하세요.

## OpenCode

공개된 `opencode-memtomem@0.3.32` 플러그인에는 Core 0.7.9가 포함되어 있으며, 고정 버전 MCP 서버와 명령·스킬을 함께 제공합니다. OpenCode는 단수 `plugin` 키를 사용하며 `opencode plugin add` 명령은 없으므로 `opencode.json`에 직접 추가하세요.

```json
{
  "plugin": ["opencode-memtomem@0.3.32"]
}
```

MCP 도구만 필요한 경우:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.7.9", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core", "MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}
    }
  }
}
```

OpenCode는 `mcp` 키의 정확한 이름으로 판정합니다. 기존 `mcp.memtomem` 항목이 플러그인의 기본 서버보다 우선하므로 서버 하나만 실행합니다. 플러그인은 자체 항목을 추가하지 않고 이 항목을 그대로 사용하므로, 플러그인의 `update` 명령을 `topic` 이외의 모드로 실행하려면 이 항목에 위의 `MEMTOMEM_EXTRA_TOOLS` 값이 필요합니다. 플러그인 서버를 사용하려면 이 수동 항목을 제거하세요. `mcp."memtomem-local"`처럼 다른 키를 사용하면 중복 제거되지 않아 서버 두 개가 실행됩니다.

플러그인은 `permission` 설정에 memtomem 도구의 기본 권한도 추가합니다. 검색·회상·상태·통계·목록·읽기 도구는 허용하고, 저장(`mem_add`)과 색인(`mem_index`)을 포함한 나머지 도구는 매번 확인을 요청하며, `memtomem_mem_do`는 거부합니다. 플러그인 서버는 `core` 모드로 실행되므로 `mem_do`를 거치는 나머지 액션은 권한을 바꾸기 전까지 사용할 수 없습니다. 같은 키로 직접 지정한 규칙은 해당 키의 플러그인 기본값만 대체하며 나머지 기본값은 유지됩니다. `memtomem_*` 같은 와일드카드는 개별 도구 이름의 기본값을 지우지 않으므로, dispatcher를 허용하려면 정확한 키를 지정하세요.

```json
{
  "permission": {"memtomem_mem_do": "ask"}
}
```

`permission` 전체를 문자열로 지정하면 위 규칙을 추가할 수 없습니다. `"ask"`나 `"allow"`로 지정해도 플러그인은 `memtomem_mem_do`를 계속 거부합니다. OpenCode의 `--auto` 모드는 `ask` 결정을 자동으로 승인하고, 에이전트별 권한이 전역 설정보다 우선할 수 있으므로 쓰기 도구를 사용하기 전에 해당 설정을 확인하세요.

## Hermes Agent

공식 플러그인 패키지는 memtomem MCP 서버와 기억 스킬 6개(index, recall, remember, search, setup, status)를 함께 제공합니다. 다음 조건이 필요합니다.

- Hermes Agent 0.21.5 이상
- Hermes 환경의 MCP 지원(`hermes-agent[mcp]`). 없으면 스킬만 로드되고 MCP 서버는 시작되지 않으며, 원인은 디버그 로그에만 남습니다.
- `PATH`에 있는 `uv`. 아래의 0.7.9 commit으로 설치한 플러그인은 서버를 `uvx --python 3.12 --from 'memtomem[onnx]==0.7.9' memtomem-server`로 시작합니다. 카탈로그로 설치한 플러그인은 카탈로그가 고정한 commit의 릴리스로 시작하며, 이 릴리스는 더 이전일 수 있습니다.
- Python 3.12. uv가 3.12를 찾지 못하면 첫 시작 때 내려받습니다. 오프라인이거나 uv의 Python 다운로드가 비활성화되어 있어 내려받을 수 없으면 서버가 시작되지 않으므로, 이때는 `uv python install 3.12`를 한 번 실행합니다.

Hermes 플러그인 카탈로그에서 설치합니다.

```bash
hermes plugins install memtomem --enable
```

카탈로그는 검토를 거친 commit을 고정하므로, 카탈로그 항목이 갱신되기 전에는 최신 릴리스보다 뒤처질 수 있습니다. 특정 릴리스를 직접 고정하려면 Git 저장소에서 설치합니다. Hermes의 `--ref`는 태그 이름을 받지 않고 40자 commit SHA만 받습니다. 0.7.9의 commit으로 설치하는 명령은 다음과 같습니다.

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-plugin" --ref f45d2f8086de3f744f77d7ccbc6e5e9befe474e7 --enable
```

다른 릴리스의 commit은 `git ls-remote --exit-code https://github.com/memtomem/memtomem "refs/tags/v<버전>" "refs/tags/v<버전>^{}"`로 확인합니다. 출력이 두 줄이면 `^{}`로 끝나는 줄의 SHA를 사용합니다. 이미 설치되어 있다면 `--force --ref <새 commit SHA>`로 다시 설치합니다.

새 Hermes 세션을 시작한 뒤 memtomem 상태를 보여 달라고 요청하고, 표시된 데이터베이스 경로가 `mm status`와 같은지 확인합니다.

이 패키지는 memtomem을 **사용자 범위**로 실행합니다. 서버가 플러그인 디렉터리에서 시작하므로 프로젝트 컨텍스트가 없고, 색인할 경로는 절대 경로로 지정해야 합니다. 프로젝트가 필요한 [프로젝트 워크플로](/ko/ltm/project-workflows/)(handoff, brief, update)도 포함되지 않습니다. 포함된 워크플로는 프로젝트를 스스로 바인딩하지 않으며([`mem_project_bind`](/ko/ltm/mcp-tools/#project-binding), 0.7.1에 추가), `remember` 워크플로는 항상 사용자 범위에 저장합니다. `~/.memtomem/config.json`의 저장소 경로는 절대 경로이거나 `~`로 시작해야 합니다. 상대 경로는 플러그인 디렉터리를 기준으로 해석되어 다른 저장소를 엽니다.

MCP 서버만 연결하려면 `~/.hermes/config.yaml`에 다음 항목을 추가한 뒤 새 세션을 시작합니다.

```yaml
mcp_servers:
  memtomem:
    command: memtomem-server
    args: []
```

두 방식 모두 Hermes는 허용된 일부 환경 변수와 Hermes에 설정한 외부 비밀 저장소의 변수만 MCP 서버에 전달합니다. 셸에서 export한 `MEMTOMEM_*` 설정은 서버에 적용되지 않습니다. memtomem은 시작할 때 `.env` 파일을 직접 읽습니다. 이 파일은 플러그인이나 실행 디렉터리가 아니라 설치된 패키지 위치에서 상위 디렉터리 방향으로 찾으며, `uvx` 실행에서는 보통 `~/.env`입니다. 다만 `PYTHON_DOTENV_DISABLED=1`이 설정되어 있으면 읽지 않습니다. 0.7.9 commit으로 설치한 플러그인은 이 값을 설정하므로 `.env` 파일이 플러그인 서버에 적용되지 않습니다. 이 값이 없는 수동 항목은 여전히 `.env`를 읽으며, 그 파일의 `MEMTOMEM_*` 설정만 적용됩니다. 데이터베이스 경로가 `mm status`와 다르면 이 차이부터 확인합니다. 수동 항목에서는 필요한 값을 `env:` 아래에 직접 지정할 수 있습니다.

Hermes는 MCP 서버 이름으로 판정합니다. 플러그인이 함께 활성화되어 있어도 `config.yaml`의 `mcp_servers.memtomem` 항목이 우선하므로 서버 하나만 실행합니다. 플러그인 서버로 전환하려면 이 항목을 제거하세요. `mcp_servers.memtomem-local`처럼 다른 이름을 사용하면 중복 제거되지 않아 서버 두 개가 실행됩니다. `hermes mcp list`는 `config.yaml`의 항목만 나열하며 플러그인 서버는 표시하지 않습니다.

### 턴마다 기억 불러오기(memory provider)

`memtomem-memory`는 Hermes의 memory provider입니다. memory provider는 대화 턴마다 관련 기억을 찾아 해당 턴의 컨텍스트에 추가하는 Hermes 플러그인입니다. 모델이 도구를 호출하지 않아도, 인사·짧은 응답·슬래시 명령을 제외한 사용자 턴마다 Hermes 자체의 MCP 연결로 `memtomem`이라는 이름의 MCP 항목에 `mem_search(record=False, rerank=False)`를 한 번 호출하고, 기본값으로 결과를 최대 5개, 제목 줄을 제외한 결과 항목 4,000자 이내로 추가합니다. memtomem 0.7.8 이상에서는 세션 네임스페이스가 열려 있을 때도 시스템 네임스페이스를 제외한 전체를 검색하도록 `namespace="!system"`을 함께 전달하고, 서버 처리 시간을 제한하는 `deadline_ms`(`rpc_timeout_seconds`에서 1초를 뺀 값)도 넘깁니다. 검색이 300 ms 안에 끝나지 않으면 그 턴에는 결과를 사용하지 않습니다. 기억 회상 자체는 쓰기를 수행하지 않으며(`record=False`이므로 접근 횟수와 검색 기록이 남지 않음), 자체 서버도 시작하지 않습니다. 단, `memory.memtomem-memory` 아래에 `mirror_writes: true`(기본 비활성, memtomem 0.7.8 이상 필요)를 켜면 Hermes 내장 `MEMORY.md` / `USER.md`에 저장·수정·삭제되는 항목을 `mem_do(action="hermes_mirror_apply")`로 memtomem에 미러링하여 첫 번째 `memory_dirs` 아래 `hermes-mirror/<profile hash>/<target>.md`로 렌더링합니다.

다음 조건이 필요합니다.

- `memtomem` 항목(위의 플러그인 또는 `mcp_servers.memtomem`)이 memtomem **0.6.8 이상**(`mirror_writes`를 사용할 때는 **0.7.8 이상**)을 실행해야 합니다. provider는 structured 출력에 `"recorded": false`를 반환하지 않는 서버를 거부하며, 이 키는 0.6.8부터 제공됩니다. 카탈로그 플러그인이 이전 릴리스에 고정되어 있으면 기억을 불러오지 않으므로, 위의 0.7.9 commit으로 플러그인을 설치하거나 0.6.8 이상을 실행하는 수동 항목을 사용합니다.
- 그 항목은 `trust: full`이어야 합니다. `trust`를 지정하지 않은 항목은 `full`로 처리됩니다.

provider도 같은 0.7.9 commit으로 설치합니다.

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-memory" --ref f45d2f8086de3f744f77d7ccbc6e5e9befe474e7
```

`--enable`은 필요하지 않으며, 설치 중 활성화 여부를 묻는 질문에는 어느 쪽으로 답해도 됩니다. memory provider는 `memory.provider`에 지정되면 활성화됩니다. 단, `hermes plugins disable`로 `plugins.disabled`에 추가된 provider는 `hermes plugins enable memtomem-memory`를 실행해야 로드됩니다.

이어서 `~/.hermes/config.yaml`(또는 프로필의 `config.yaml`)에서 provider를 선택하고 `memtomem` MCP 항목에 대한 접근을 허용한 뒤 새 세션을 시작합니다.

```yaml
memory:
  provider: memtomem-memory
plugins:
  entries:
    memtomem-memory:
      mcp_allowlist: [memtomem]
```

`hermes memory setup memtomem-memory`는 Hermes 내장 기억을 미러링할지 묻고(기본값은 아니요) `memory.provider`와 `memory.memtomem-memory.mirror_writes`만 작성하며, `mcp_allowlist`는 작성하지 않습니다. `hermes config set plugins.entries.memtomem-memory.mcp_allowlist '[memtomem]'`로 지정할 때는 대괄호를 유지해야 합니다. 대괄호가 없으면 문자열 `memtomem`으로 저장되어 아무 접근도 허용하지 않습니다.

provider는 모델의 memtomem 도구와 같은 연결, 호출 대기열, circuit breaker를 사용합니다. 따라서 Hermes 프로세스 전체에서 MCP 항목 이름마다 회상과 미러 쓰기를 합쳐 한 번에 호출 하나만 보내고, 호출이 실패하면 15초, 60초, 300초 순으로 기다린 뒤 다시 시도합니다. 설정 항목(`budget_ms`, `top_k`, `mirror_writes` 등)과 세부 동작은 [패키지 README](https://github.com/memtomem/memtomem/blob/v0.7.9/packages/memtomem-hermes-memory/README.md)를 참고하세요.

## Antigravity

Antigravity IDE와 Antigravity CLI(`agy`)는 서로 다른 파일을 사용합니다.

- IDE 내장 Gemini 에이전트: `~/.gemini/antigravity/mcp_config.json`에 위 `mcpServers` 항목 사용
- IDE의 VS Code 기반 연동: `~/Library/Application Support/Antigravity/User/mcp.json`에 해당 연동의 `servers` 형식 사용
- Antigravity CLI: `~/.gemini/config/mcp_config.json`

Antigravity CLI에서는 `agy` 명령으로 항목을 등록하는 방법이 가장 간단합니다.

```bash
agy mcp add -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage memtomem memtomem-server
```

`-e` 같은 플래그는 서버 이름보다 앞에 두어야 합니다.

파일을 직접 편집하는 경우 `~/.gemini/config/mcp_config.json`에 다음 항목을 추가합니다.

```json
{
  "mcpServers": {
    "memtomem": {
      "type": "stdio",
      "command": "memtomem-server",
      "args": [],
      "env": {"MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}
    }
  }
}
```

이전 경로인 `~/.gemini/antigravity-cli/mcp_config.json`은 더 이상 읽히지 않습니다. 이 파일에 memtomem 항목이 있다면 `~/.gemini/config/mcp_config.json`으로 옮기거나 `agy mcp add`로 다시 추가하고, `agy mcp list`로 CLI가 서버를 인식하는지 확인합니다.

파일을 수정한 뒤 에이전트 세션을 다시 시작합니다. Antigravity는 별도로 설치된 VS Code의 MCP 항목을 물려받지 않습니다.

### Antigravity CLI 플러그인

Antigravity CLI 플러그인은 버전이 고정된 memtomem MCP 서버와 기억 스킬 9개를 함께 제공합니다. 기본 스킬 6개(index, recall, remember, search, setup, status)와 0.7.2부터 추가된 [프로젝트 워크플로](/ko/ltm/project-workflows/) 3개(handoff, brief, update)입니다. 0.7.0부터 제공되는 **실험적(experimental)** 기능이므로 구성과 스킬이 사용 중단 유예 기간 없이 바뀔 수 있습니다. 필요한 조건은 다음과 같습니다.

- Antigravity CLI(`agy`) 1.4.7 이상
- `PATH`에 있는 `uv`. 플러그인은 서버를 `uvx --python 3.12 --from 'memtomem[onnx]==0.7.9' memtomem-server`로 시작합니다.
- Python 3.12. uv가 찾지 못하면 처음 시작할 때 내려받습니다. 내려받을 수 없으면 서버가 시작되지 않으므로 `uv python install 3.12`를 한 번 실행합니다.

0.7.9 릴리스를 설치합니다.

```bash
agy plugin install https://github.com/memtomem/memtomem/tree/v0.7.9/packages/memtomem-antigravity-plugin
```

플러그인은 `~/.gemini/config/plugins/memtomem`에 복사되며, 새 `agy` 세션을 시작할 때 로드됩니다. 업데이트하려면 `agy plugin uninstall memtomem`을 실행한 뒤 다시 설치합니다. 기억은 `~/.memtomem`에 그대로 남습니다.

플러그인 서버는 **사용자 범위**로 시작됩니다. `agy`가 플러그인 디렉터리에서 서버를 실행하므로 프로젝트 컨텍스트가 없으며, 색인할 경로는 절대 경로로 지정해야 합니다. 0.7.4부터는 `search`, `recall`, `remember`와 프로젝트 워크플로 3개를 합친 총 6개 스킬이 실행 전에 작업 중인 저장소에 서버를 먼저 바인딩합니다. `git rev-parse --show-toplevel`이 출력한 루트 경로로 `mem_do`를 통해 [`mem_project_bind`](/ko/ltm/mcp-tools/#project-binding)를 호출하며, 도구가 동일한 루트를 반환할 때만 계속 진행합니다(상위 디렉터리의 계층만 등록되어 상위 경로가 반환되는 경우를 포함해 루트가 일치하지 않으면 프로젝트 워크플로를 중단합니다). 저장소에는 등록된 계층(`mm mem init --scope project_local`)이 있어야 합니다. 바인딩은 서버 프로세스가 재시작될 때까지 유지되므로 다른 저장소에서 작업하려면 먼저 서버를 재시작하세요. 바인딩된 뒤에는 `search`와 `recall`이 사용자 범위 기억과 해당 저장소의 프로젝트 기억을 함께 조회하고, `remember`는 프로젝트 사실을 저장소의 `project_local` 계층에, 프로젝트와 무관한 선호를 사용자 범위에 저장합니다. 등록된 계층이 없거나 Git 저장소 밖이면 `search`와 `recall`은 사용자 범위 기억만 조회하며, `remember`는 프로젝트와 무관한 선호·개인 메모만 사용자 범위에 저장하고 프로젝트 사실은 사용자 범위에 대신 저장하지 않고 거부합니다. `index`, `status`, `setup`은 바인딩하지 않습니다. `~/.memtomem/config.json`의 저장소 경로는 절대 경로이거나 `~`로 시작해야 하며, 상대 경로는 플러그인 디렉터리 기준으로 해석되어 의도와 다른 저장소를 엽니다.

`agy`는 플러그인 서버의 이름을 `memtomem_memtomem`으로 지정하므로, 직접 등록한 `memtomem` 항목을 대체하지 않고 서버 두 개가 실행됩니다. 둘 중 하나만 남기세요. `agy mcp remove memtomem`으로 수동 항목을 제거하면 서버 하나만 실행됩니다. 수동 항목과 플러그인 스킬을 함께 유지하려면 `mm doctor --mcp-client agy --reconcile keep-manual`로 확인한 뒤 `--apply`를 붙여 실행합니다(`keep-plugin`은 반대로 수동 항목을 제거합니다). 플러그인을 업데이트하면 포함된 서버가 복원될 수 있으므로 다시 설치한 뒤 검사를 다시 실행합니다. `agy mcp list`는 직접 등록한 항목만 보여 주고 플러그인 서버는 표시하지 않으며, 플러그인은 `agy plugin list`에서 확인합니다. 어느 쪽을 제거하기 전에 `mem_status`가 보고하는 데이터베이스 경로를 비교하세요. 자세한 내용은 [플러그인 README](https://github.com/memtomem/memtomem/blob/v0.7.9/packages/memtomem-antigravity-plugin/README.md)를 참고하세요.

## 연결 확인

클라이언트에 다음처럼 요청합니다.

```text
mem_status를 호출해서 데이터베이스 경로, 임베딩 제공자, 청크 수를 보여줘.
```

다음 조건을 모두 만족하면 연결이 완료된 것입니다.

- memtomem 서버 또는 도구 네임스페이스가 정확히 하나만 활성화됨
- 클라이언트에 기본 Core 도구 9개 또는 플러그인의 안내 워크플로가 표시됨
- `mem_status` 호출 성공
- 데이터베이스 경로가 `mm status`와 같음
- 새 세션에서 저장한 기억을 출처 경로와 함께 검색 가능

서버가 두 개 실행 중이어도 `mem_status` 호출과 데이터베이스 경로 비교는 성공할 수 있습니다. 첫 번째 조건은 Claude Code의 `/mcp`, Codex의 `codex mcp list`, OpenCode의 정확한 `mcp.memtomem` 키로 따로 확인하세요. Antigravity CLI에서는 `agy plugin list`와 `agy mcp list`를 함께 확인합니다. Hermes Agent에서는 `hermes plugins list --enabled`의 플러그인과 `config.yaml`의 모든 `mcp_servers` 항목을 함께 확인합니다.

## 연결되지 않을 때

1. `mm status`로 설치 문제와 클라이언트 문제를 구분합니다.
2. MCP 서버만 수동으로 등록했다면 `command`가 `memtomem-server`인지 확인합니다. 공식 플러그인은 자체적으로 고정한 명령을 사용할 수 있습니다.
3. 위의 Claude Code, Codex, OpenCode, Hermes Agent, Antigravity CLI 판정 기준에 따라 활성 서버를 하나만 남깁니다.
4. 플러그인 설치 뒤 클라이언트를 다시 시작하거나 새 세션을 엽니다.
5. GUI에서 수동 명령을 찾지 못하면 `command -v memtomem-server`로 절대 경로를 확인해 설정에 사용합니다.
6. 데이터베이스 경로나 네임스페이스가 다르면 [문제 해결](/ko/guides/troubleshooting/)을 이어서 확인합니다.

플러그인 설치만으로 프로젝트 색인, 내장 기억 가져오기, 파일 감시, 대화 전체 저장이 실행되지는 않습니다. 이런 작업은 [기존 자료 색인·가져오기](/ko/ltm/index-and-import/)에서 명시적으로 실행하세요.

## 다음 단계

- [세션을 넘나드는 기억](/ko/ltm/memory-persistence/)
- [기존 자료 색인·가져오기](/ko/ltm/index-and-import/)
- [LTM MCP 도구](/ko/ltm/mcp-tools/)
- [LTM 운영 및 API](/ko/ltm/operations/)
