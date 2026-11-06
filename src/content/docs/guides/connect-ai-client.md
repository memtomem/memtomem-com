---
title: Connect an AI Client
description: Connect Claude Code, Codex CLI, Cursor, Windsurf, Claude Desktop, Gemini CLI, Kimi Code, OpenCode, Hermes Agent, or Antigravity to memtomem.
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

For a client that runs memtomem's [`update` workflow](/ltm/project-workflows/#update) (Claude Code, Codex CLI, OpenCode, Kimi Code, Antigravity CLI), the manual entries below also set `MEMTOMEM_EXTRA_TOOLS=mem_update_coverage`. It is not a setting: it exposes the one tool the workflow needs outside `topic` mode, and the server reads it at launch, before any configuration, so `~/.memtomem/config.json` cannot provide it. Settings still come from that file. The entries for other clients leave it out. The [Cursor plugin](#cursor-plugin) runs the workflow too, and its bundled server already sets the variable.

Pick **one** client below. If that client already has both a plugin and a manual MCP entry, use its matching rule instead of assuming that one copy is always removed:

| Client | How entries are matched | Result |
|---|---|---|
| Claude Code | exact command and arguments | the same signature runs one server; a different signature runs both |
| Codex CLI | server name | manual `memtomem` wins; a different name runs both |
| OpenCode | `mcp` key | manual `mcp.memtomem` wins; a different key runs both |
| Hermes Agent | server name | manual `mcp_servers.memtomem` wins; a different name runs both |
| Antigravity CLI | server name | the plugin's server is named `memtomem_memtomem`, so a manual `memtomem` entry never matches it and both run |
| Cursor | not matched | the plugin adds its own server beside a manual `memtomem` entry, and both run |

## Claude Code

The official plugin is the recommended path. The plugin released with Core 0.7.5 is version 0.5.31 and bundles Core 0.7.5:

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
uvx --from memtomem[onnx]==0.7.5 memtomem-server
```

With that same signature, the manual registration wins and only one server runs under `mcp__memtomem__mem_*`. The bare `memtomem-server` entries below have a different signature, so both servers run and tools appear under both `mcp__memtomem__mem_*` and `mcp__plugin_memtomem_memtomem__mem_*`.

`/memtomem:setup` reports this doubled namespace and shows the available remedies, but it never removes a registration automatically. Choose the setup you want:

- **Keep the plugin (recommended):** remove the manual entry with `claude mcp remove memtomem`. Add `-s user` when removing a user-scope entry; remove the project entry from `.mcp.json`.
- **Keep only the manual server:** run `/plugin uninstall memtomem@memtomem`.
- **Keep the plugin commands with the manual server:** keep the plugin installed and register the manual entry with the exact plugin signature. For example:

  ```bash
  claude mcp add memtomem -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- uvx --from "memtomem[onnx]==0.7.5" memtomem-server
  ```

  The manual entry wins together with its environment, so it needs the variable for the plugin's `update` workflow outside `topic` mode.

  Alternatively, keep your existing manual entry and suppress the plugin's bundled server instead: preview with `mm doctor --mcp-client claude --reconcile keep-manual`, close every Claude session, then rerun it with `--apply`. Updating or reinstalling the plugin can restore its bundled server, so run `mm doctor --mcp-client claude` again afterwards. See [`mm doctor`](/ltm/cli/#additional-diagnostics-and-review) for the backup and exit codes.

For MCP-only setup without the plugin's commands and skills, choose one Claude Code registration scope:

| Scope | Command | Visibility |
|---|---|---|
| Local | `claude mcp add memtomem -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- memtomem-server` | current project and user |
| User | `claude mcp add memtomem -s user -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage -- memtomem-server` | every project for this user |
| Project | commit a project-root `.mcp.json` | teammates after trust approval |

`-e` must come before the `--`: everything after it is the server's command.

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
env = { MEMTOMEM_EXTRA_TOOLS = "mem_update_coverage" }
supports_parallel_tool_calls = true
```

Restart Codex after changing the file.

Codex resolves MCP servers by name. If the plugin is also installed, the manual `[mcp_servers.memtomem]` section wins and only one server runs, so the section needs the `env` line above for the plugin's `memtomem-update` skill outside `topic` mode. Remove that section to switch to the plugin's pinned server. Do not rename the manual section to `[mcp_servers.memtomem-local]`: a different name is not deduplicated, so both servers run. Confirm the resolved entry with `codex mcp list`.

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
| Kimi Code | `~/.kimi-code/mcp.json`, or `mcp.json` under `$KIMI_CODE_HOME` | restart Kimi Code |

Kimi Code runs the `update` workflow, so its entry also keeps `"env": {"MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}` next to `"args"`. The setup wizard writes the entry with it, and re-running the command rewrites an older Kimi entry:

```bash
mm init --mcp kimi
```

memtomem writes Kimi entries only to the current Kimi Code home. A memtomem entry left in the legacy `~/.kimi/mcp.json` (or under `$KIMI_SHARE_DIR`) is not updated, and `mm uninstall` only reports it, so remove it yourself.

## Cursor

For an MCP-only entry, use the generic entry in [JSON-Based MCP Clients](#json-based-mcp-clients) in `~/.cursor/mcp.json`, or a project's `.cursor/mcp.json`, and restart Cursor.

### Cursor Plugin

The Cursor plugin bundles an exact-pinned memtomem MCP server and the nine memory skills the [Antigravity CLI plugin](#antigravity-cli-plugin) ships, including the three [project workflows](/ltm/project-workflows/) (handoff, brief, update). It is **experimental** since Core 0.7.4: its layout and skills can change without a deprecation window. It requires:

- Cursor 3.27.22 or later, the version the plugin was verified against;
- `uv` on the `PATH` Cursor starts MCP servers with. The plugin starts the server with `uvx --python 3.12 --from 'memtomem[onnx]==0.7.5' memtomem-server`;
- Python 3.12. If uv cannot find one, it downloads one on first start. When that download is not possible, the server does not start; run `uv python install 3.12` once to fix it.

Until the plugin is listed in the Cursor Marketplace, install it as a local plugin from the 0.7.5 release. Cursor loads a symlinked local plugin only when the link resolves inside `~/.cursor/plugins/local`, so copy the directory:

```bash
git clone --branch v0.7.5 --depth 1 https://github.com/memtomem/memtomem.git memtomem-v0.7.5 &&
  mkdir -p ~/.cursor/plugins/local &&
  cp -R memtomem-v0.7.5/packages/memtomem-cursor-plugin ~/.cursor/plugins/local/memtomem
```

Run **Developer: Reload Window**, then check under **Customize** that the memtomem MCP server and its nine skills are listed. On a Cursor Enterprise team, an admin has to allow local plugin imports first. Clone the release tag rather than `main`: right after a version bump, `main` can pin a memtomem release that is not on PyPI yet, and the server then fails to start.

The commands copy only after the clone succeeds; if `memtomem-v0.7.5` already exists, the clone fails and nothing is copied, so remove or rename that directory first. To update, clone the new release's tag the same way into its own directory, then replace the installed copy: delete `~/.cursor/plugins/local/memtomem` and copy the new clone's `packages/memtomem-cursor-plugin` there, then reload the window. The clone is needed only for the copy; delete it once the plugin is installed if you do not want to keep it. Copying onto an existing `~/.cursor/plugins/local/memtomem` nests the new bundle inside the old one and leaves the old one active. To remove the plugin, delete `~/.cursor/plugins/local/memtomem`; your memories stay in `~/.memtomem`.

Cursor starts the plugin's server in your home directory, not in the open workspace, so the server begins at **user scope**. The skills bind it to your repository the way the Antigravity CLI skills do. Binding needs a registered tier in the repository (`mm mem init --scope project_local`) and lasts until the server restarts. Once bound, search and recall also read the repository's project memory, and remember saves a project fact to its `project_local` tier. Without a tier, or outside a Git repository, search and recall read user-scope memory only, remember saves only cross-project preferences and personal notes and refuses a project fact, and the three project workflows stop. The binding step runs `git rev-parse --show-toplevel` in Cursor's terminal, so a Cursor hook that blocks shell commands, including a Claude Code hook Cursor imports, stops the skill before it binds. Remember, index, setup and the three project workflows run only when you invoke them with `/skill-name`. Storage paths in `~/.memtomem/config.json` must be absolute or start with `~`; a relative path resolves against your home directory and opens a different store.

The plugin does not replace a hand-registered `memtomem` entry in `~/.cursor/mcp.json` or a project's `.cursor/mcp.json`: both servers run. Remove the manual entry so only one server runs, after comparing the database path `mem_status` reports. See the [plugin README](https://github.com/memtomem/memtomem/blob/v0.7.5/packages/memtomem-cursor-plugin/README.md) for details.

## OpenCode

The published `opencode-memtomem@0.3.27` plugin bundles Core 0.7.5 and provides an exact-pinned MCP server plus commands and skills. OpenCode uses the singular `plugin` key and has no `opencode plugin add` command, so add it to `opencode.json`:

```json
{
  "plugin": ["opencode-memtomem@0.3.27"]
}
```

For MCP tools only:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.7.5", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core", "MEMTOMEM_EXTRA_TOOLS": "mem_update_coverage"}
    }
  }
}
```

OpenCode applies the same-name rule to the `mcp` key. An existing `mcp.memtomem` entry wins over the plugin's default and only one server runs; the plugin keeps that entry instead of adding its own, so it needs the `MEMTOMEM_EXTRA_TOOLS` value above for the plugin's `update` command outside `topic` mode. Remove that entry to use the plugin server. A differently named key such as `mcp."memtomem-local"` is not deduplicated, so both servers run.

The plugin also merges default memtomem tool permissions into `permission`. The search, recall, status, stats, list, and read tools are allowed; the other tools, including `mem_add` and `mem_index`, ask each time; and `memtomem_mem_do` is denied. Because the plugin server runs in `core` mode, the actions routed through `mem_do` stay unavailable until you change that rule. A rule you set for the same key replaces the plugin default for that key, while the other defaults stay; a wildcard such as `memtomem_*` does not remove the exact-name defaults. To allow the dispatcher, set its exact key:

```json
{
  "permission": {"memtomem_mem_do": "ask"}
}
```

A string `permission` value cannot carry that rule: with `"ask"` or `"allow"`, the plugin still denies `memtomem_mem_do`. OpenCode's `--auto` mode approves `ask` decisions, and agent-level permissions can override global settings, so review both before using write tools.

## Hermes Agent

The official plugin package provides the memtomem MCP server and six memory skills (index, recall, remember, search, setup, status). It requires:

- Hermes Agent 0.21.5 or later;
- MCP support in Hermes's environment (`hermes-agent[mcp]`). Without it, Hermes loads the skills but starts no MCP server, and logs the reason only at debug level;
- `uv` on `PATH`. Installed at the 0.7.5 commit below, the plugin starts the server with `uvx --python 3.12 --from 'memtomem[onnx]==0.7.5' memtomem-server`. Installed from the catalog, it starts the release of the catalog's pinned commit, which can be older;
- Python 3.12. If uv cannot find one, it downloads one on first start. When that download is not possible (offline, or uv's Python downloads turned off), the server does not start; run `uv python install 3.12` once to fix it.

Install it from the Hermes plugin catalog:

```bash
hermes plugins install memtomem --enable
```

The catalog pins a reviewed commit, so it can trail the newest release until the catalog entry is updated. To pin a specific release yourself, install from the Git repository. Hermes's `--ref` takes a full 40-character commit SHA and refuses a tag name. For 0.7.5:

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-plugin" --ref 1092d604887dabfcb43a6a84e963231f4fdee2f8 --enable
```

Look up another release's commit with `git ls-remote --exit-code https://github.com/memtomem/memtomem "refs/tags/v<version>" "refs/tags/v<version>^{}"`. If it prints two lines, use the SHA on the line that ends in `^{}`. If the plugin is already installed, reinstall with `--force --ref <new-commit-sha>`.

Start a new Hermes session, ask it for memtomem status, and confirm the database path matches `mm status`.

The package runs memtomem at **user scope**. The server starts in the plugin directory, so it has no project context and paths given to indexing must be absolute. The [project workflows](/ltm/project-workflows/) (handoff, brief, update), which need a project, are not included. The bundled workflows do not bind a project on their own ([`mem_project_bind`](/ltm/mcp-tools/#project-binding), new in 0.7.1), and the `remember` workflow always saves at user scope. Storage paths in `~/.memtomem/config.json` must be absolute or start with `~`. A relative path resolves against the plugin directory and opens a different store.

For MCP-only setup, add this entry to `~/.hermes/config.yaml`, then start a new session:

```yaml
mcp_servers:
  memtomem:
    command: memtomem-server
    args: []
```

Either way, Hermes passes MCP servers only a small allowlist of environment variables, plus variables from an external secret source you configured in Hermes. A `MEMTOMEM_*` setting exported in your shell does not reach the server. memtomem reads a `.env` file itself at startup, searching upward from its installed location rather than the plugin or launch directory (for a `uvx` launch that is normally `~/.env`), unless `PYTHON_DOTENV_DISABLED=1` is set. The plugin installed at the 0.7.5 commit sets it, so a `.env` file does not configure the plugin's server. A manual entry without that variable still reads the file, and only its `MEMTOMEM_*` settings apply. If the database path differs from `mm status`, check these differences first. A manual entry can set the values it needs under `env:`.

Hermes resolves MCP servers by name. If the plugin is also enabled, the `mcp_servers.memtomem` entry in `config.yaml` wins and only one server runs. Remove that entry to switch to the plugin's server. A different name such as `mcp_servers.memtomem-local` is not deduplicated, so both servers run. `hermes mcp list` shows only the `config.yaml` entries, not the plugin's server.

### Per-Turn Recall (Memory Provider)

`memtomem-memory` is a Hermes memory provider: a Hermes plugin that finds relevant memories on each conversation turn and adds them to that turn's context. Without a model tool call, on every user turn other than greetings, short acknowledgements and slash commands, it makes one `mem_search(record=False, rerank=False)` call through Hermes's own MCP connection to the MCP entry named `memtomem` and, by default, adds up to five results within 4,000 characters of result bullets, not counting the heading. A search that does not finish within 300 ms is not used for that turn. The provider only recalls: because of `record=False`, no access counts or query history are recorded, it saves no memories, and it starts no server of its own.

It requires:

- a `memtomem` entry (the plugin above or `mcp_servers.memtomem`) running memtomem **0.6.8 or later**. The provider refuses a server whose structured output does not echo `"recorded": false`, a key added in 0.6.8. While the catalog plugin pins an earlier release, recall stays off, so install the plugin at the 0.7.5 commit above or use a manual entry that runs 0.6.8 or later;
- that entry set to `trust: full`. An entry without a `trust` value is treated as `full`.

Install the provider at the same 0.7.5 commit:

```bash
hermes plugins install "https://github.com/memtomem/memtomem#packages/memtomem-hermes-memory" --ref 1092d604887dabfcb43a6a84e963231f4fdee2f8
```

It does not need `--enable`, and either answer to the install's enable prompt works: a memory provider is active once `memory.provider` names it. The exception is a provider that `hermes plugins disable` put under `plugins.disabled`; Hermes loads it only after `hermes plugins enable memtomem-memory`.

Then select the provider and grant it access to the `memtomem` MCP entry in `~/.hermes/config.yaml` (or your profile's `config.yaml`), and start a new session:

```yaml
memory:
  provider: memtomem-memory
plugins:
  entries:
    memtomem-memory:
      mcp_allowlist: [memtomem]
```

`hermes memory setup memtomem-memory` writes only the `memory.provider` line, not `mcp_allowlist`. If you set the grant with `hermes config set plugins.entries.memtomem-memory.mcp_allowlist '[memtomem]'`, keep the brackets: without them Hermes stores the string `memtomem`, which grants nothing.

The provider shares the connection, call queue and circuit breaker of the model's own memtomem tools. It therefore sends at most one recall call at a time per MCP entry name across the Hermes process, and after a failed call it waits 15 s, then 60 s, then 300 s before trying again. For the settings (`budget_ms`, `top_k` and others) and further behavior, see the [package README](https://github.com/memtomem/memtomem/blob/v0.7.5/packages/memtomem-hermes-memory/README.md).

## Antigravity

Antigravity IDE and Antigravity CLI (`agy`) use separate files.

- IDE built-in Gemini agent: `~/.gemini/antigravity/mcp_config.json`, with the generic `mcpServers` entry above.
- IDE VS Code-side integrations: `~/Library/Application Support/Antigravity/User/mcp.json`, using that integration's `servers` schema.
- Antigravity CLI: `~/.gemini/config/mcp_config.json`.

For the Antigravity CLI, the quickest way is to let `agy` write the entry:

```bash
agy mcp add -e MEMTOMEM_EXTRA_TOOLS=mem_update_coverage memtomem memtomem-server
```

Flags such as `-e` must come before the server name.

To edit the file yourself, add this entry to `~/.gemini/config/mcp_config.json`:

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

The older `~/.gemini/antigravity-cli/mcp_config.json` is no longer read. If it holds a memtomem entry, move the entry to `~/.gemini/config/mcp_config.json` or re-add it with `agy mcp add`, then run `agy mcp list` to confirm the CLI sees the server.

Restart the agent session after editing. Antigravity does not inherit MCP entries from a separate VS Code installation.

### Antigravity CLI Plugin

The Antigravity CLI plugin bundles an exact-pinned memtomem MCP server and nine memory skills: six base skills (index, recall, remember, search, setup, status) and, since 0.7.2, the three [project workflows](/ltm/project-workflows/) (handoff, brief, update). It is **experimental** since 0.7.0: its layout and skills can change without a deprecation window. It requires:

- Antigravity CLI (`agy`) 1.4.7 or later;
- `uv` on `PATH`. The plugin starts the server with `uvx --python 3.12 --from 'memtomem[onnx]==0.7.5' memtomem-server`;
- Python 3.12. If uv cannot find one, it downloads one on first start. When that download is not possible, the server does not start; run `uv python install 3.12` once to fix it.

Install the 0.7.5 release:

```bash
agy plugin install https://github.com/memtomem/memtomem/tree/v0.7.5/packages/memtomem-antigravity-plugin
```

The plugin is copied to `~/.gemini/config/plugins/memtomem`. Start a new `agy` session to load it. To update, run `agy plugin uninstall memtomem` and install again; your memories stay in `~/.memtomem`.

The plugin's server starts at **user scope**. `agy` starts it in the plugin directory, so it has no project context and paths given to indexing must be absolute. Since 0.7.4, six skills first bind the server to the repository you are working in, search, recall and remember as well as the three project workflows: they call [`mem_project_bind`](/ltm/mcp-tools/#project-binding) through `mem_do` with the root that `git rev-parse --show-toplevel` prints, and continue only when the tool names that same root. A parent directory, which the server returns when only a parent's tier is registered, stops a project workflow, and so does any other result. The repository needs a registered tier (`mm mem init --scope project_local`). A binding lasts until the server process restarts, so working in a second repository needs a restart first. Once bound, search and recall read user-scope memory together with the repository's project memory, and remember saves a project fact to the repository's `project_local` tier and a cross-project preference to user scope. Without a registered tier, or outside a Git repository, search and recall read user-scope memory only, and remember still saves cross-project preferences and personal notes at user scope but refuses a project fact rather than saving it there. Index, status and setup do not bind. Storage paths in `~/.memtomem/config.json` must be absolute or start with `~`; a relative path resolves against the plugin directory and opens a different store.

`agy` names the plugin's server `memtomem_memtomem`, so it does not replace a hand-registered `memtomem` entry: both servers run. Keep one. Remove the manual entry with `agy mcp remove memtomem` so only one server runs, or keep the manual entry and the plugin's skills with `mm doctor --mcp-client agy --reconcile keep-manual`, then `--apply` (`keep-plugin` removes the manual entry instead). A plugin update can restore the bundled server, so rerun the check after reinstalling. `agy mcp list` shows only the hand-registered entries, not the plugin's server; `agy plugin list` shows the plugin. Compare the database path `mem_status` reports before removing either. See the [plugin README](https://github.com/memtomem/memtomem/blob/v0.7.5/packages/memtomem-antigravity-plugin/README.md) for details.

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

`mem_status` and a matching database path can succeed even when two servers are active. Use `/mcp` in Claude Code, `codex mcp list` in Codex, or the exact `mcp.memtomem` key in OpenCode to verify the first condition. In the Antigravity CLI, check `agy plugin list` together with `agy mcp list`. In Hermes Agent, check the plugins in `hermes plugins list --enabled` together with every `mcp_servers` entry in `config.yaml`.

## If It Does Not Work

1. Run `mm status` to separate an installation problem from a client problem.
2. For a manual MCP-only entry, confirm the configured command is `memtomem-server`; an official plugin may use its own pinned command.
3. Apply the Claude Code, Codex, OpenCode, Hermes Agent, or Antigravity CLI matching rule above and leave exactly one active server.
4. Restart the client or open a new session after plugin installation.
5. If a GUI-launched client cannot resolve a manual command, run `command -v memtomem-server` and use that absolute executable path in its configuration.
6. Continue with [Troubleshooting](/guides/troubleshooting/) if the database path or namespace differs.

Installing a client plugin does not index the project, import built-in memory, watch files, or save entire conversations. Use [Index and Import Existing Content](/ltm/index-and-import/) for those explicit operations.

## Next

- [Memory Across Sessions](/ltm/memory-persistence/)
- [Index and Import Existing Content](/ltm/index-and-import/)
- [LTM MCP Tools](/ltm/mcp-tools/)
- [LTM Operations & API](/ltm/operations/)
