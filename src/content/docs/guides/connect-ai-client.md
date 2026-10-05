---
title: Connect an AI Client
description: Connect Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi CLI, OpenCode, Hermes Agent, or Antigravity to memtomem.
---

**Estimated time:** 5–10 minutes

**Goal:** connect one client, call `mem_status`, and confirm it uses the same database as the CLI.

## Before You Connect

Complete [Quick Start](/guides/quickstart/), then run:

```bash
mm status
```

Keep the displayed database path. You will compare it with the client result.

Manual MCP-only entries use the `memtomem-server` command. `memtomem` and `mm` are terminal CLIs and must not be used as MCP server commands. Official plugins may supply their own pinned launch command.

Pick **one** client below. If that client already has both a plugin and a manual MCP entry, use its matching rule instead of assuming that one copy is always removed:

| Client | How entries are matched | Result |
|---|---|---|
| Claude Code | exact command and arguments | the same signature runs one server; a different signature runs both |
| Codex CLI | server name | manual `memtomem` wins; a different name runs both |
| OpenCode | `mcp` key | manual `mcp.memtomem` wins; a different key runs both |
| Hermes Agent | server name | manual `mcp_servers.memtomem` wins; a different name runs both |

## Claude Code

The official plugin is the recommended path. The current marketplace plugin is version 0.5.9 and bundles Core 0.6.7:

```text
/plugin marketplace add memtomem/memtomem
/plugin install memtomem@memtomem
/reload-plugins
```

If `/reload-plugins` is unavailable, start a new Claude Code session. Then run:

```text
/memtomem:status
/memtomem:remember Remember this confirmed decision: release smoke tests run before cutover.
/memtomem:search release smoke tests
```

The status should show the same database path as `mm status`, and search should return the saved sentence with a source path.

If you previously registered a manual server, run `/mcp` before continuing. Claude Code 2.1.218 matches the exact command and arguments; environment variables are not compared. The plugin signature is:

```text
uvx --from memtomem[onnx]==0.6.7 memtomem-server
```

With that same signature, the manual registration wins and only one server runs under `mcp__memtomem__mem_*`. The bare `memtomem-server` entries below have a different signature, so both servers run and tools appear under both `mcp__memtomem__mem_*` and `mcp__plugin_memtomem_memtomem__mem_*`.

`/memtomem:setup` reports this doubled namespace and shows the available remedies, but it never removes a registration automatically. Choose the setup you want:

- **Keep the plugin (recommended):** remove the manual entry with `claude mcp remove memtomem`. Add `-s user` when removing a user-scope entry; remove the project entry from `.mcp.json`.
- **Keep only the manual server:** run `/plugin uninstall memtomem@memtomem`.
- **Keep the plugin commands with the manual server:** keep the plugin installed and register the manual entry with the exact plugin signature. For example:

  ```bash
  claude mcp add memtomem -- uvx --from "memtomem[onnx]==0.6.7" memtomem-server
  ```

For MCP-only setup without the plugin's commands and skills, choose one Claude Code registration scope:

| Scope | Command | Visibility |
|---|---|---|
| Local | `claude mcp add memtomem -- memtomem-server` | current project and user |
| User | `claude mcp add memtomem -s user -- memtomem-server` | every project for this user |
| Project | commit a project-root `.mcp.json` | teammates after trust approval |

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

Install the official plugin:

```bash
codex plugin marketplace add memtomem/memtomem
codex plugin add memtomem@memtomem
```

Start a new Codex thread, then ask:

```text
Use $memtomem-status to show the current memory database path.
Use $memtomem-remember to save this confirmed decision: release smoke tests run before cutover.
Use $memtomem-search to find "release smoke tests" and show the source.
```

For MCP-only setup, add this to `~/.codex/config.toml`:

```toml
[mcp_servers.memtomem]
command = "memtomem-server"
args = []
supports_parallel_tool_calls = true
```

Restart Codex after changing the file.

Codex resolves MCP servers by name. If the plugin is also installed, the manual `[mcp_servers.memtomem]` section wins and only one server runs. Remove that section to switch to the plugin's pinned server. Do not rename the manual section to `[mcp_servers.memtomem-local]`: a different name is not deduplicated, so both servers run. Confirm the resolved entry with `codex mcp list`.

## JSON-Based MCP Clients

Use this server entry unless a client-specific section below says otherwise:

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

| Client | Configuration location | After editing |
|---|---|---|
| Cursor | `~/.cursor/mcp.json` | restart Cursor |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | restart Windsurf |
| Claude Desktop on macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` | quit and reopen the app |
| Claude Desktop on Windows | `%APPDATA%\Claude\claude_desktop_config.json` | quit and reopen the app |
| Gemini CLI | `~/.gemini/settings.json` | restart the CLI; new setups should prefer Antigravity CLI |
| Kimi CLI | `~/.kimi/mcp.json`, or `$KIMI_SHARE_DIR/mcp.json` | restart Kimi CLI |

Kimi CLI can also be configured by the setup wizard:

```bash
mm init --mcp kimi
```

## OpenCode

The published plugin provides an exact-pinned MCP server plus commands and skills. Add it to `opencode.json`:

```json
{
  "plugin": ["opencode-memtomem@0.3.9"]
}
```

For MCP tools only:

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

OpenCode applies the same-name rule to the `mcp` key. An existing `mcp.memtomem` entry wins over the plugin's default and only one server runs. Remove that entry to use the plugin server. A differently named key such as `mcp."memtomem-local"` is not deduplicated, so both servers run.

## Hermes Agent

The official plugin package provides the memtomem MCP server and six memory skills (index, recall, remember, search, setup, status). It requires:

- Hermes Agent 0.21.5 or later;
- MCP support in Hermes's environment (`hermes-agent[mcp]`). Without it, Hermes loads the skills but starts no MCP server, and logs the reason only at debug level;
- `uv` on `PATH`. The plugin starts the server with `uvx --python 3.12 --from 'memtomem[onnx]==0.6.7' memtomem-server`;
- Python 3.12. If uv cannot find one, it downloads one on first start. When that download is not possible (offline, or uv's Python downloads turned off), the server does not start; run `uv python install 3.12` once to fix it.

Install it from the Hermes plugin catalog:

```bash
hermes plugins install memtomem --enable
```

The catalog pins a reviewed commit, currently memtomem 0.6.7. It can trail the newest release until the catalog entry is updated. To pin a specific release yourself, install from the Git repository. Hermes's `--ref` takes a full 40-character commit SHA and refuses a tag name. For 0.6.7:

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-plugin" --ref 5b7034126574a2956b6a328622006a46b2a0e367 --enable
```

Look up another release's commit with `git ls-remote --exit-code https://github.com/memtomem/memtomem "refs/tags/v<version>" "refs/tags/v<version>^{}"`. If it prints two lines, use the SHA on the line that ends in `^{}`. If the plugin is already installed, reinstall with `--force --ref <new-commit-sha>`.

Start a new Hermes session, ask it for memtomem status, and confirm the database path matches `mm status`.

The package runs memtomem at **user scope**. The server starts in the plugin directory, so per-project memory is not available and paths given to indexing must be absolute. The handoff workflow, which needs a project, is not included. Storage paths in `~/.memtomem/config.json` must be absolute or start with `~`. A relative path resolves against the plugin directory and opens a different store.

For MCP-only setup, add this entry to `~/.hermes/config.yaml`, then start a new session:

```yaml
mcp_servers:
  memtomem:
    command: memtomem-server
    args: []
```

Either way, Hermes passes MCP servers only a small allowlist of environment variables, plus variables from an external secret source you configured in Hermes. A `MEMTOMEM_*` setting exported in your shell does not reach the server. memtomem does read a `.env` file itself at startup, searching upward from its installed location rather than the plugin or launch directory; for the plugin's `uvx` launch that is normally `~/.env`, so settings there can still apply. If the database path differs from `mm status`, check these differences first. A manual entry can set the values it needs under `env:`.

Hermes resolves MCP servers by name. If the plugin is also enabled, the `mcp_servers.memtomem` entry in `config.yaml` wins and only one server runs. Remove that entry to switch to the plugin's server. A different name such as `mcp_servers.memtomem-local` is not deduplicated, so both servers run. `hermes mcp list` shows only the `config.yaml` entries, not the plugin's server.

## Antigravity

Antigravity IDE and Antigravity CLI (`agy`) use separate files.

- IDE built-in Gemini agent: `~/.gemini/antigravity/mcp_config.json`, with the generic `mcpServers` entry above.
- IDE VS Code-side integrations: `~/Library/Application Support/Antigravity/User/mcp.json`, using that integration's `servers` schema.
- Antigravity CLI: `~/.gemini/antigravity-cli/mcp_config.json`:

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

Restart the agent session after editing. Antigravity does not inherit MCP entries from a separate VS Code installation.

## Verify the Connection

Ask the client:

```text
Call mem_status and show the database path, embedding provider, and chunk count.
```

The setup is complete when:

- exactly one memtomem server or tool namespace is active;
- the client exposes the nine default Core tools or the plugin's guided workflows;
- `mem_status` succeeds;
- its database path matches `mm status`;
- a saved memory can be found with its source path in a new session.

`mem_status` and a matching database path can succeed even when two servers are active. Use `/mcp` in Claude Code, `codex mcp list` in Codex, or the exact `mcp.memtomem` key in OpenCode to verify the first condition. In Hermes Agent, check the plugins in `hermes plugins list --enabled` together with every `mcp_servers` entry in `config.yaml`.

## If It Does Not Work

1. Run `mm status` to separate an installation problem from a client problem.
2. For a manual MCP-only entry, confirm the configured command is `memtomem-server`; an official plugin may use its own pinned command.
3. Apply the Claude Code, Codex, OpenCode, or Hermes Agent matching rule above and leave exactly one active server.
4. Restart the client or open a new session after plugin installation.
5. If a GUI-launched client cannot resolve a manual command, run `command -v memtomem-server` and use that absolute executable path in its configuration.
6. Continue with [Troubleshooting](/guides/troubleshooting/) if the database path or namespace differs.

Installing a client plugin does not index the project, import built-in memory, watch files, or save entire conversations. Use [Index and Import Existing Content](/guides/index-and-import/) for those explicit operations.

## Next

- [Memory Across Sessions](/guides/memory-persistence/)
- [Index and Import Existing Content](/guides/index-and-import/)
- [LTM MCP Tools](/ltm/mcp-tools/)
- [LTM Operations & API](/ltm/operations/)
