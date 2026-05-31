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
mms init --lang ko                   # token-aware budget preset for CJK workloads
mms init --prune-originals           # also remove imported upstreams from source clients
```

`--lang ko` writes Korean / CJK token-equivalent defaults: `chars_per_token=1.85`, `default_max_result_chars=8500`, `min_response_chars=230`. Non-TTY callers default to `en` when `--lang` is omitted.

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
mms health --names                   # also flag tools whose proxied name overflows the 64-char MCP limit
```

`--names` is the way to find an upstream tool that silently disappeared after registration because the composed `mcp__<server>__<prefix>__<tool>` name exceeded the MCP 64-char limit (#261).

### `mms prune`

After registering upstreams via `mms init` or `mms add --import`, this collapses the dual-registration: it removes the direct entries from source MCP clients (Claude Code, Claude Desktop, project `.mcp.json`) so tool calls only route through STM — picking up compression, caching, and LTM surfacing. STM's own config is left alone.

```bash
mms prune --all                      # every dual-registered upstream
mms prune filesystem github          # specific names
mms prune --all --dry-run            # show what would be pruned, no writes
mms prune --all -y                   # skip the confirm prompt (CI)
```

### `mms version`

Print the installed version (same as `mms --version`).

```bash
mms version
```

### `mms hook`

Bridge supported host built-in tool calls into STM surfacing. Claude Code and compatible hosts call it as a `PostToolUse` hook: the JSON payload arrives on stdin, and `mms hook` prints hook output that can include `additionalContext` with surfaced memories. Bash output compression is separate and opt-in via `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED=1`.

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read|Grep|Glob|WebFetch|Bash",
        "hooks": [{ "type": "command", "command": "mms hook" }]
      }
    ]
  }
}
```

The hook always exits 0. If surfacing, the daemon, or compression fails, the host tool output passes through unchanged.

### `mms daemon`

Manage the local surfacing daemon used by `mms hook`. Daemon mode is on by default (`MEMTOMEM_STM_HOOK__USE_DAEMON=1`) and auto-spawns on the first eligible hook call, so manual startup is usually unnecessary.

```bash
mms daemon status                    # show whether the warm daemon is running
mms daemon start                     # start it explicitly
mms daemon stop                      # stop the daemon for this config
```

The daemon holds one warm LTM MCP session for the active config. Set `MEMTOMEM_STM_HOOK__USE_DAEMON=0` to force the legacy cold in-process hook path, or `MEMTOMEM_STM_HOOK__FALLBACK=cold` if you prefer a cold fallback when the daemon is unavailable.

## Project Management (W1)

`.mms/project.toml` markers let you scope which MCPs are active per directory — for example, GitHub MCP only when working in your work repo, filesystem only in side projects. Project markers are indexed at `~/.mms/projects.toml` so the active set is consistent regardless of where you invoke `mms` from.

### `mms project init [PATH]`

Create `<path>/.mms/project.toml` and add it to the projects index. Defaults to cwd.

```bash
mms project init                     # create .mms/project.toml in cwd
mms project init ~/work/billing      # create in another directory
mms project init --name acme         # override directory-basename name
mms project init --force             # overwrite an existing marker
```

### `mms project show [NAME]`

Show the detected (or named) project's enabled MCP list and marker path.

```bash
mms project show
mms project show acme
mms project show --json
```

### `mms project list`

List indexed projects. The current cwd's project is marked with `*`.

```bash
mms project list
mms project list --json
mms project list --prune             # drop entries whose path is gone
```

### `mms project enable / disable <mcps...>`

Add or remove MCP names from a project's `mcp.enabled` list. Target is auto-detected from cwd; pass `--project <name>` to override.

```bash
mms project enable filesystem github
mms project disable github
mms project enable filesystem --project acme
```

`enable` only accepts MCPs that are already in the registry — it errors clearly when the registry is empty. `disable` works regardless of registry state.

## Importing host configs (W1)

### `mms import`

Discover MCP definitions in host MCP clients (Claude Code, Claude Desktop, Cursor, …) and copy them into `~/.mms/registry.toml`. **`--plan` is the default** — pass `--apply` to actually write.

```bash
mms import --plan                    # default: show what would be imported (secrets REDACTED)
mms import --apply                   # write to the registry
mms import --from claude --plan      # restrict source (claude / cursor / desktop / all)
mms import --plan --show-imported    # reveal secret values in the plan output (use carefully)
```

First-import-wins: identical names with different definitions are flagged as conflicts and skipped. Identical definitions are reported as idempotent.

### Operational statistics

Proxy, surfacing, index, and compression statistics are exposed as **MCP tools** rather than CLI subcommands — `stm_proxy_stats`, `stm_surfacing_stats`, `stm_progressive_stats`, `stm_index_stats`, `stm_compression_stats`, `stm_proxy_health`, and `stm_tuning_recommendations`. They are hidden from MCP `tools/list` by default; set `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true` to expose them to the agent. See the [MCP Tools](/stm/mcp-tools/) page for the full tool catalog.

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
