---
title: Connect an AI Client
description: Connect Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi CLI, OpenCode, or Antigravity to memtomem.
---

**Estimated time:** 5–10 minutes

**Goal:** connect one client, call `mem_status`, and confirm it uses the same database as the CLI.

## Before You Connect

Complete [Quick Start](/guides/quickstart/), then run:

```bash
mm status
```

Keep the displayed database path. You will compare it with the client result.

The MCP server command is `memtomem-server`. `memtomem` and `mm` are terminal CLIs and must not be used as the MCP server command.

Pick **one** client below. Registering the same server through both a plugin and a manual MCP entry can expose duplicate tools.

## Claude Code

The official plugin is the recommended path:

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

For MCP-only setup, choose one Claude Code registration scope:

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
  "plugin": ["opencode-memtomem@0.1.2"]
}
```

For MCP tools only:

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

- the client exposes the nine default Core tools or the plugin's guided workflows;
- `mem_status` succeeds;
- its database path matches `mm status`;
- a saved memory can be found with its source path in a new session.

## If It Does Not Work

1. Run `mm status` to separate an installation problem from a client problem.
2. Confirm the configured command is `memtomem-server`.
3. Restart the client or open a new session after plugin installation.
4. If a GUI-launched client cannot resolve the command, run `command -v memtomem-server` and use that absolute executable path in its configuration.
5. Remove a duplicate manual MCP entry when the same server is already supplied by a plugin.
6. Continue with [Troubleshooting](/guides/troubleshooting/) if the database path or namespace differs.

Installing a client plugin does not index the project, import built-in memory, watch files, or save entire conversations. Use [Index and Import Existing Content](/guides/index-and-import/) for those explicit operations.

## Next

- [Memory Across Sessions](/guides/memory-persistence/)
- [Index and Import Existing Content](/guides/index-and-import/)
- [LTM MCP Tools](/ltm/mcp-tools/)
- [LTM Operations & API](/ltm/operations/)
