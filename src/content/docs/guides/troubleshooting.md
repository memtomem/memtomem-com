---
title: Troubleshooting
description: Fixes for the common install, MCP-connection, and STM proxy/surfacing problems.
---

The symptoms first-time users hit most often, with the fix for each — ordered roughly by how common they are.

## Installation

### `mm: command not found` / `mms: command not found`

The install succeeded but your shell can't find the command, because `~/.local/bin` — where `uv` puts the executable shim — isn't on your `PATH`. Run this, then reopen your terminal:

```bash
uv tool update-shell
```

If you installed with `pipx`, `pipx ensurepath` does the same thing.

### `mm --version` prints an old version

Right after install, cached package metadata can pin an older release. Reinstall with refreshed metadata:

```bash
uv tool install 'memtomem[all]' --refresh
```

## LTM connection check

### What `mm status` should show

`mm status` is the first post-install check. Storage path, embedding provider, and a chunk-count summary mean it's healthy. **Zero chunks is normal before you run `mm index`** — index a folder and check again to see the count rise. For scripting, `mm status --json` returns machine-readable output.

### The agent can't see memtomem tools

If you ask the agent to "call `mem_status`" and it reports no such tool, it's almost always the command in the MCP config.

- The command must be `memtomem-server` — plain `memtomem` is the CLI and does not start the MCP server.
- On Claude Code, check registration with `claude mcp list`; on other clients, check the `mcpServers` block in the config file (see [Quick Start → Connect Your MCP Client](/guides/quickstart/#4-connect-your-mcp-client)).
- Restart the client after editing the config so the new server launches.

## STM proxy

### Proxied tools go missing (64-char name limit)

STM's proxied tools surface as `<prefix>__<tool>`, and your client composes them into `mcp__<server>__<prefix>__<tool>`. If that composed name exceeds **64 characters, the tool is silently dropped.** Two fixes:

- Give the upstream a shorter `--prefix` (e.g. `filesystem` → `fs`).
- Register STM under the short client name `mms` **and** export `MMS_CLIENT_SERVER_NAME=mms`. `mms init --mcp claude` registers under the longer name `memtomem-stm` by default, so it doesn't give you the 3-char headroom automatically.

Run `mms health` to see the discovered / advertised tool counts and diagnose what was withheld.

### The proxy does nothing

STM's `proxy.enabled` defaults to `false`; it's turned on when `mms add` or `mms init` writes the config. Check:

```bash
mms status    # is the proxy enabled and pointed at the right config file?
mms health    # does it actually reach the upstreams?
```

### Surfacing (auto memory injection) isn't firing

STM injects relevant memories in its SURFACE stage by querying LTM. That link has to be ready, and `mms health` must report LTM as `connected`.

- The LTM server must advertise `mem_search` to count as `connected` — it's the tool the surfacing adapter needs.
- The default LTM launch command is `ltm_mcp_command=memtomem-server`. If you run LTM another way, match it with `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND`.

## Where the logs are

- **MCP server logs** (LTM `memtomem-server`, STM `mms`) go to **stderr** by default, captured or dropped by the MCP client that launched them. Tune verbosity with `MEMTOMEM_LOG_LEVEL`.
- **STM file logging** is opt-in: set `MEMTOMEM_STM_LOG_FILE` for a rotating log file (hardened in 0.1.32).
- **Web UI logs** live at `~/.memtomem/logs/web.log` (when run in the background via `mm web -b`) — that's the Web UI log, not the MCP-server log.

## File locations at a glance

| Path | What |
|---|---|
| `~/.memtomem/memtomem.db` | LTM SQLite store (chunks + vectors) |
| `~/.memtomem/config.json` | LTM configuration |
| `~/.memtomem/stm_proxy.json` | STM proxy configuration |
| `~/.memtomem/logs/web.log` | Web UI log |

For the full set of configuration keys, see [Environment Variables](/reference/configuration/).
