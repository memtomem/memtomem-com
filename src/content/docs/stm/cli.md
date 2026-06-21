---
title: CLI Reference
description: mms CLI commands for memtomem-stm proxy management.
---

The `mms` command is installed with the `memtomem-stm` v0.1.29 package. It manages upstream-server registration, MCP-client registration, and proxy-config lifecycle. Run `mms --help` for the full command list or `mms --version` to print the installed version (the `mms version` subcommand also works).

STM's import is reversible. Pulling an upstream behind the STM proxy preserves its original registration, so if the result isn't what you want, `mms eject` restores it to the original host MCP-client config.

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

`--lang ko` writes Korean / CJK token-equivalent defaults: `chars_per_token=1.85`, `default_max_result_chars=8500`, and a per-server `max_result_tokens=2000`. Non-TTY callers default to `en` when `--lang` is omitted.

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

`mms add --from-clients` (alias `--import`) discovers servers registered with Claude Desktop, Claude Code, and project `.mcp.json` files and imports them into the STM proxy config (`stm_proxy.json`) — reusing `mms init`'s discovery + TUI flow. Servers already registered in this proxy config are skipped. (This is a different command from [`mms import`](#mms-import), which copies host configs into `~/.mms/registry.toml`.)

```bash
mms add --from-clients               # interactive bulk import
mms add --import                     # alias
mms add --from-clients --prune       # also remove the direct registration from each source client
```

After a successful import, the same server is advertised on two paths — direct from the source client and via STM's proxied namespace — and the direct path bypasses compression, caching, and LTM surfacing. Each imported entry also records its provenance — the source-client kind plus a copy of the original registration — so [`mms eject`](#mms-eject-name) can restore it at any time.

`--prune` (or an interactive confirm prompt shown in TTY, defaulting to **No**) closes the dual-registration by calling `claude mcp remove` for each Claude Code scope and atomically rewriting the Claude Desktop JSON. Each pruned entry is backed up to `~/.memtomem/pruned_upstreams.json` first, so the cleanup is undoable too. Non-TTY callers without `--prune` keep the hint-only behavior — the import still succeeds, and the warning prints the exact manual removal command.

Incompatible with `NAME` / `--prefix` / `--command` / `--args` / `--url` / `--env`. `--prune` requires `--from-clients` / `--import`.

### `mms list`

List all registered upstream servers.

```bash
mms list                             # human-readable
mms list --json                      # scriptable JSON
```

The table includes an **ORIGIN** column reporting each upstream's import source. The value is the source-client kind (`mcp-json`, `claude-user`, `claude-project`, `claude-desktop`); manually `mms add`-ed entries show `-`. A trailing `*` marks an entry whose host original was pruned, so it now exists only behind STM — `mms eject <name>` restores it.

### `mms status`

Show proxy gateway configuration and the full server list.

```bash
mms status
mms status --json                    # scriptable JSON
```

`status` output shows each upstream's compression setting and output-size budget alongside its surfacing state (`surfacing=on/off`).

### `mms surfacing <server> [on|off]`

Toggle proactive memory surfacing for a single upstream server. Omit the state argument to print the current value.

```bash
mms surfacing filesystem             # show current state
mms surfacing filesystem off         # disable surfacing for this upstream
mms surfacing filesystem on          # re-enable
```

`surfacing_enabled` is written into the shared proxy config (`stm_proxy.json`). A running proxy hot-reloads it without a restart, and because the flag lives in the shared config rather than per-client env, every MCP client that proxies through this `mms` sees the same scope. See [Proactive Surfacing](/stm/surfacing/) for how surfacing works.

### `mms remove <name>`

Remove a registered upstream server.

```bash
mms remove filesystem                # confirmation prompt
mms remove filesystem -y             # skip confirmation
```

Removing an imported server emits a hint pointing at `mms eject`, so the original host registration can be restored rather than lost.

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

After registering upstreams via `mms init` or `mms add --import`, this removes the direct entries left in source MCP clients (Claude Code, Claude Desktop, project `.mcp.json`) so tool calls route through the STM proxy on a single path — picking up compression, caching, and LTM surfacing. It's an explicit opt-in command.

```bash
mms prune --all                      # every dual-registered upstream
mms prune filesystem github          # specific names
mms prune --all --dry-run            # show what would be pruned, no writes
mms prune --all -y                   # skip the confirm prompt (CI)
```

Each entry is backed up to `~/.memtomem/pruned_upstreams.json` before removal, so the operation is reversible — use [`mms eject`](#mms-eject-name) to restore the original client registration. STM's own config (`~/.memtomem/stm_proxy.json`) is left alone.

### `mms eject <name>`

The inverse of `prune`. It restores an imported upstream back to its original host MCP-client config and only removes the STM entry once the restore is verified. This lets you try the STM proxy and back out safely if it isn't what you want. Multiple names can be ejected at once.

```bash
mms eject filesystem                 # restore to host config, then remove the STM entry
mms eject filesystem github          # several at once
mms eject filesystem --dry-run       # preview what would be restored
mms eject filesystem --keep          # restore to host but keep the STM entry (dual registration)
mms eject filesystem --yes           # non-interactive — skip the confirm prompt
```

It writes the verbatim host entry captured at import time (the provenance) back where it came from, verifies the restore against the host config, and only then removes the STM entry. If any step fails, the server stays registered in at least one place — worst case is dual registration, never a disappeared server.

| Flag | Description |
|------|-------------|
| `--to TARGET` | Restore target for entries without a recorded origin (`claude-user` / `claude-project[:PATH]` / `mcp-json[:PATH]` / `claude-desktop`). Entries with a recorded origin ignore this |
| `--keep` | Restore to the host but keep the STM entry (dual registration) |
| `--force` | Overwrite a same-name host entry whose identity differs |
| `--allow-argv-secrets` | Permit `claude mcp add-json` shell-outs whose payload carries secret-classified values (argv is visible in the process list) |
| `--accept-schema-loss` | Proceed with STM removal even when the restored host entry does not structurally match the original (default keeps the STM entry and fails) |
| `--dry-run` | Print the plan; no writes |
| `--yes` / `-y` | Skip the confirm prompt (scripts / CI / non-TTY) |

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

Discover MCP definitions in host MCP clients (Claude Code, Claude Desktop, Cursor, …) and copy them into `~/.mms/registry.toml`. This populates the registry used by project management (W1) — a different target file and purpose from [`mms add --from-clients`](#bulk-import-from-mcp-clients), which imports upstreams into the proxy config. **`--plan` is the default** — pass `--apply` to actually write.

```bash
mms import --plan                    # default: show what would be imported (secrets redacted)
mms import --apply                   # write to the registry
mms import --from claude-code --plan # restrict source (claude-code / cursor / codex / claude-desktop / all)
mms import --plan --show-imported    # reveal secret values in the plan output (use carefully)
```

First import wins: identical names with different definitions are flagged as conflicts and skipped; identical definitions are left unchanged.

## Operational statistics

To inspect proxy, surfacing, selection, and compression behavior at runtime, STM ships observability MCP tools — these statistics are exposed as **MCP tools** rather than CLI subcommands. As of 0.1.29 there are nine (`stm_proxy_stats`, `stm_proxy_cache_clear`, `stm_proxy_health`, `stm_surfacing_stats`, `stm_index_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`), and they are hidden from MCP `tools/list` by default. Set `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true` to expose them to the agent. See the [MCP Tools](/stm/mcp-tools/) page for each tool's inputs and outputs.

## Running the proxy server

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

# 4. (Optional) turn off surfacing for one upstream
mms surfacing filesystem off

# 5. (Optional) back out — restore an upstream to its original host config
mms eject filesystem

# 6. (Optional) re-register with Claude Code after reinstalling the client
mms register --mcp claude
```

Your MCP client now connects to `memtomem-stm` instead of each individual upstream. All upstream tools are available through the proxy, with automatic memory surfacing, response compression, and progressive delivery.

> See [Installation](/guides/installation/) for setup details, and [Proactive Surfacing](/stm/surfacing/) for how surfacing works.
