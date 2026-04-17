---
title: CLI Reference
description: mms CLI commands for memtomem-stm proxy management.
---

The `mms` command is installed with the `memtomem-stm` package. It manages upstream server registration and proxy lifecycle.

## Commands

### `mms init`

First-time setup wizard. Writes `~/.memtomem/stm_proxy.json` interactively.

```bash
mms init
```

### `mms add <name>`

Register an upstream MCP server to proxy through STM.

```bash
mms add filesystem --command filesystem-server
mms add github --command github-mcp --args "--token $GH_TOKEN" --prefix gh
mms add filesystem --command filesystem-server --validate   # probe connectivity before persisting
```

| Flag | Description |
|------|-------------|
| `--command` | Server command to execute |
| `--args` | Arguments to pass to the server |
| `--prefix` | Tool name prefix to avoid collisions (emitted as `{prefix}__{tool}`) |
| `--validate` | Launch the upstream server and verify MCP handshake before saving |

### `mms list`

List all registered upstream servers.

```bash
mms list
```

### `mms remove <name>`

Remove a registered upstream server.

```bash
mms remove filesystem
```

### `mms serve`

Start the STM proxy server. Launches all registered upstream servers and begins proxying.

```bash
mms serve            # default: stdio transport
mms serve --transport sse --port 8770
```

### `mms stats`

Display proxy statistics including cache hit rates, compression ratios, and surfacing metrics.

```bash
mms stats
```

### `mms health`

Probe every registered upstream server and report MCP connectivity status.

```bash
mms health
```

## Example Workflow

```bash
# 1. Register upstream servers
mms add memtomem --command memtomem-server
mms add filesystem --command filesystem-server --prefix fs_

# 2. Start the proxy
mms serve

# 3. Check proxy stats
mms stats
```

The agent now connects to STM instead of individual servers. All upstream tools are available through the proxy, with automatic memory surfacing and response compression.

> See [Installation](/guides/installation/) for setup details, and [Proactive Surfacing](/stm/surfacing/) for how surfacing works.
