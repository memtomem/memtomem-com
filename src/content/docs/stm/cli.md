---
title: CLI Reference
description: mms CLI commands for memtomem-stm proxy management.
---

The `mms` command is installed with the `memtomem-stm` package. It manages upstream-server registration, MCP-client registration, and proxy-config lifecycle. Run `mms --help` for the full command list or `mms --version` to print the installed version (the `mms version` subcommand also works).

## Commands

### `mms init`

Run `mms init` with no flags — the wizard asks for one upstream server, optionally probes its connectivity, writes `~/.memtomem/stm_proxy.json`, and then offers a 3-way MCP-client registration prompt:

1. **Add to Claude Code** — runs `claude mcp add` for you.
2. **Generate `.mcp.json`** — writes a project-scoped config in the current directory.
3. **Skip** — prints paste hints so you can wire it up by hand later.

Use the `--mcp` flag to pre-answer the prompt in scripted / CI runs:

```bash
mms init --mcp claude                # auto-register with Claude Code
mms init --mcp json                  # write .mcp.json in the current directory
mms init --mcp skip                  # write config, print paste hints, exit
mms init --no-validate               # skip the upstream connectivity probe
```

`mms init` aborts if the config file already exists — use `mms add` to append more upstream servers, or `mms register` to re-run the registration prompt without touching the config.

### `mms register`

Re-run the MCP-client registration flow after `mms init`. Useful if you picked `skip` the first time or want to re-register after reinstalling the client.

```bash
mms register                         # interactive prompt
mms register --mcp claude            # shell out to `claude mcp add`
mms register --mcp json              # write .mcp.json in cwd
mms register --mcp skip              # print manual registration hints
```

Safe to re-run. If `memtomem-stm` is already registered with Claude Code, the command defaults to keeping the existing entry.

### `mms add <name>`

Register an upstream MCP server to proxy through STM.

```bash
mms add filesystem --command filesystem-server --prefix fs
mms add github --command github-mcp --args "--token $GH_TOKEN" --prefix gh
mms add remote-api --transport streamable_http --url https://example/mcp --prefix api
mms add filesystem --command filesystem-server --prefix fs --validate
```

| Flag | Description |
|------|-------------|
| `--command` | Executable command (stdio transport) |
| `--args` | Space-separated arguments |
| `--prefix` | Tool namespace (required unless `--from-clients`); tools appear as `{prefix}__{tool}` |
| `--transport` | `stdio` (default), `sse`, or `streamable_http` |
| `--url` | Endpoint URL for `sse` / `streamable_http` |
| `--env KEY=VALUE` | Environment variable to forward to the upstream process (repeatable) |
| `--compression` | `auto` (default), `none`, `truncate`, `selective`, `hybrid` |
| `--max-chars` | Output-size budget (default `8000`) |
| `--validate` | Probe the server (MCP initialize + list-tools) before saving |
| `--timeout` | Probe timeout in seconds when `--validate` is set (default `10`) |

#### Bulk import from MCP clients

`mms add --from-clients` (alias `--import`) discovers servers registered with Claude Desktop, Claude Code, and project `.mcp.json` files and lets you pick which to import — reusing `mms init`'s discovery + TUI flow. Servers already registered in this proxy config are skipped.

```bash
mms add --from-clients               # interactive bulk import
mms add --import                     # alias
mms add --from-clients --prune       # also remove the direct registration from each source client
```

After a successful import, the same server is advertised on two paths — direct from the source client and via STM's proxied namespace — and the direct path bypasses compression, caching, and LTM surfacing. `--prune` (or an interactive confirm prompt shown in TTY, defaulting to **No**) closes the dual-registration by calling `claude mcp remove` for each Claude Code scope and atomically rewriting the Claude Desktop JSON. Non-TTY callers without `--prune` keep the hint-only behavior — the import still succeeds, and the warning prints the exact manual removal command.

Incompatible with `NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`. `--prune` requires `--from-clients` / `--import`.

### `mms list`

List all registered upstream servers.

```bash
mms list                             # human-readable
mms list --json                      # scriptable JSON
```

### `mms status`

Show proxy gateway configuration and the full server list.

```bash
mms status
mms status --json                    # scriptable JSON
```

### `mms remove <name>`

Remove a registered upstream server.

```bash
mms remove filesystem                # confirmation prompt
mms remove filesystem -y             # skip confirmation
```

### `mms health`

Probe every registered upstream server and report MCP connectivity status. Output is pretty-printed to match `status` / `list`.

```bash
mms health                           # human-readable
mms health --json                    # scriptable JSON
mms health --timeout 5               # per-server connect timeout (seconds)
```

### Operational statistics

Proxy, surfacing, and compression statistics are exposed as **MCP tools** rather than CLI subcommands — `stm_proxy_stats`, `stm_surfacing_stats`, `stm_progressive_stats`, `stm_compression_stats`, `stm_proxy_health`, and `stm_tuning_recommendations`. Call them from your MCP client, or hide them from the agent surface via `advertise_observability_tools=false`. See the [MCP Tools](/stm/mcp-tools/) page for the full tool catalog.

### Running the proxy server

The proxy server itself ships as the `memtomem-stm` console script. You don't launch it by hand — your MCP client spawns it automatically once `memtomem-stm` is registered (via `mms init --mcp claude`, `mms register`, or a `.mcp.json` entry).

## Example Workflow

```bash
# 1. First-time setup — registers one upstream + your MCP client in one go
mms init --mcp claude

# 2. Add more upstreams (manually, or bulk-import from existing client configs)
mms add filesystem --command filesystem-server --prefix fs --validate
mms add --from-clients

# 3. Verify connectivity
mms status
mms health

# 4. (Optional) re-register with Claude Code after reinstalling the client
mms register --mcp claude
```

Your MCP client now connects to `memtomem-stm` instead of each individual upstream. All upstream tools are available through the proxy, with automatic memory surfacing, response compression, and progressive delivery.

> See [Installation](/guides/installation/) for setup details, and [Proactive Surfacing](/stm/surfacing/) for how surfacing works.
