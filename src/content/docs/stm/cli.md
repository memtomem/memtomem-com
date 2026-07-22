---
title: CLI Reference
description: mms CLI commands for memtomem-stm proxy management.
---

The `mms` command is installed with the `memtomem-stm` v0.1.41 package. This page mirrors the complete top-level command surface; run `mms <command> --help` for the installed option spelling and `mms --version` (or `mms version`) for the runtime version.

STM's import is reversible. Pulling an upstream behind the STM proxy preserves its original registration, so if the result isn't what you want, `mms eject` restores it to the original host MCP-client config.

## Commands

### `mms init`

For a deterministic first success, create the bundled read-only demo, register a detected client, and run the end-to-end diagnostic:

```bash
mms init --demo --client auto
mms doctor
```

With no selection flags, the wizard asks for one upstream, optionally probes it, writes the proxy config, and offers client registration. Current client choices are `auto`, `claude`, `codex`, `json`, and `skip`; `--mcp claude|json|skip` remains a compatibility spelling.

| Option | Description |
|---|---|
| `--config PATH` | Proxy config path (default `~/.memtomem/stm_proxy.json`) |
| `--no-validate` | Skip the optional connectivity probe |
| `--client auto\|claude\|codex\|json\|skip` | Select current client registration flow |
| `--mcp claude\|json\|skip` | Compatibility spelling for the older registration flow |
| `--resume` | Continue client registration when the proxy config already exists |
| `--demo` | Configure the bundled deterministic read-only server |
| `--freshness live\|balanced\|reuse` | Response-cache freshness preset (default `balanced`) |
| `--allow-project-configs` | Acknowledge discovery of project-local MCP configs |
| `--replace-registration` | Replace an existing selected-client registration |
| `--save-unverified` | Save when an optional connection probe fails |
| `--json` | Emit one JSON result document |
| `--prune-originals` | Remove imported direct host registrations after successful setup |
| `--lang en\|ko` | Token-budget language preset; `ko` writes CJK-specific ratios and limits |

`--lang ko` writes Korean / CJK token-equivalent defaults: `chars_per_token=1.85`, `default_max_result_chars=8500`, and a per-server `max_result_tokens=2000`. Non-TTY callers default to `en` when `--lang` is omitted.

`mms init` normally aborts if the config exists. Use `--resume` for the interrupted registration stage, `mms add` for more upstreams, or `mms register` to register another host without changing the proxy config.

### `mms register`

Re-run the MCP-client registration flow after `mms init`. Useful if you picked `skip` the first time or want to re-register after reinstalling the client.

```bash
mms register --client auto           # detected supported client
mms register --client claude         # Claude Code
mms register --client codex          # Codex
mms register --client json           # write .mcp.json in cwd
mms register --client skip           # print manual registration hints
```

The complete options are `--config`, `--client auto|claude|codex|json|skip`, compatibility `--mcp claude|json|skip`, `--replace-registration`, and `--json`. It is safe to re-run; an existing selected-client registration is kept unless replacement is requested.

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
| `--header KEY=VALUE` | Plaintext header for `sse` / `streamable_http` (repeatable; config file is mode `0600`) |
| `--compression` | `auto` (default), `none`, `truncate`, `selective`, `hybrid` |
| `--max-chars` | Output-size budget (default `8000`) |
| `--validate` | Probe the server (MCP initialize + list-tools) before saving |
| `--timeout` | Probe timeout in seconds when `--validate` is set (default `10`) |
| `--json` | Emit one JSON result document |

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

List all registered upstream servers — the per-server view.

```bash
mms list                             # human-readable
mms list --json                      # scriptable JSON
```

The table includes an **ORIGIN** column reporting each upstream's import source. The value is the source-client kind (`mcp-json`, `claude-user`, `claude-project`, `claude-desktop`); manually `mms add`-ed entries show `-`. A trailing `*` marks an entry whose host original was pruned, so it now exists only behind STM — `mms eject <name>` restores it. As of v0.1.32 the table also carries a **SURFACING** column — the visible home of the per-server `mms surfacing` toggle.

### `mms status`

Answer "is the proxy set up and pointed at the right config?" — a config summary, not the per-server view.

```bash
mms status
mms status --json                    # scriptable JSON
```

As of v0.1.32 `status` is a summary: config path, the `enabled` flag, any schema-validation warning, and `Servers: N (P host-pruned)`. Per-server detail (compression, output budget, surfacing state) moved to `mms list`. `status --json` keeps its full redacted `servers` map and adds `server_count` / `pruned_count`.

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

`health` also renders a per-upstream **circuit breaker** line. As of v0.1.32 the breaker is on by default: after 3 consecutive failed calls an upstream's tools fast-fail with `circuit_open` for ~60s instead of each call burning the full retry/deadline budget; cached responses keep serving and other upstreams are unaffected. Set `circuit_max_failures: 0` on an upstream in `stm_proxy.json` to restore the old always-retry behavior.

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

| Option | Description |
|---|---|
| `--host claude` | Host payload/response contract (currently Claude Code) |
| `--use-daemon` / `--no-daemon` | Override daemon routing for this invocation |
| `--surfacing-timeout-seconds N` | Override the cold-path surfacing timeout |
| `--daemon-timeout-seconds N` | Override hook-to-daemon round-trip timeout |
| `--persist-query-text` / `--no-persist-query-text` | Override query-text retention for this portable hook invocation |

### `mms daemon`

Manage the local surfacing daemon used by `mms hook`. Daemon mode is on by default (`MEMTOMEM_STM_HOOK__USE_DAEMON=1`) and auto-spawns on the first eligible hook call, so manual startup is usually unnecessary.

```bash
mms daemon status                    # show whether the warm daemon is running
mms daemon status --json             # scriptable status
mms daemon start                     # start it explicitly
mms daemon stop                      # stop the daemon for this config
mms daemon stop --all                # include stale-config daemon orphans
mms daemon restart                   # stop this config, then start it once
mms daemon run                       # foreground long-lived server loop
```

The daemon holds one warm LTM MCP session for the active config. Set `MEMTOMEM_STM_HOOK__USE_DAEMON=0` to force the legacy cold in-process hook path, or `MEMTOMEM_STM_HOOK__FALLBACK=cold` if you prefer a cold fallback when the daemon is unavailable.

### `mms doctor`

Run the status, health, and config checks as one PASS/WARN/FAIL report. The default is passive and never edits state or searches LTM; FAIL exits 1 and WARN-only exits 0.

```bash
mms doctor
mms doctor --json --timeout 5
mms doctor --measure-ltm             # five read-only searches through an already-running daemon
```

Options: `--config`, `--json`, `--timeout`, and `--measure-ltm`. Measurement never starts a missing daemon.

### `mms config validate`

Strictly lint the JSON file as written, without environment overlay. Missing files, parse/schema errors, and unknown keys exit non-zero.

```bash
mms config validate
mms config validate --config ./stm_proxy.json --json
```

### `mms gateway`

Inspect and configure the optional Toolgraph policy source.

```bash
mms gateway status [--config PATH] [--json]
mms gateway mode strict|review|explore [--config PATH] [--bundle PATH] [--apply|--dry-run]
mms gateway explain server::tool [--config PATH] [--json]
```

`mode` previews by default. `--apply` enables the bundle source and atomically aligns the Toolgraph query profile with STM exposure; `explain` reports one bundle decision.

### `mms host`

Inspect and reconcile the host MCP configurations that feed the project registry.

```bash
mms host scan [--from claude-code|cursor|codex|claude-desktop|all] [--json]
mms host status [--json]
mms host sync [--plan|--apply] [--json] [--yes] [--force] [--allow-project-configs]
```

`scan` is a host-anchored, read-only inventory; `status` is a registry-anchored drift comparison. `sync` previews by default, adds new entries, removes entries absent from every host, and backfills sidecar baselines. Changed host shapes require `--force`; mutating JSON runs require `--yes`. `--allow-project-configs` explicitly acknowledges project-local discoveries.

### `mms selection replay`

Replay sanitized selection telemetry and evaluate deterministic risk penalties. Recommendations are previews and never update proxy config.

```bash
mms selection replay [--config PATH] [--log FILE] [--dataset FILE]
                     [--active-only] [--no-telemetry]
                     [--output-dir DIR] [--json]
```

### `mms stats`

Read all-time persistent compression and surfacing statistics without creating or migrating stores.

```bash
mms stats [--config PATH] [--tool TOOL] [--source mcp|hook] [--json]
```

The CLI sees disk-backed metrics only; process-local live counters remain available through the observability MCP tools.

### `mms tune`

Preview or apply per-tool compression recommendations derived from the existing metrics and feedback stores.

```bash
mms tune [--config PATH] [--since-hours 24] [--tool TOOL] [--json]
mms tune --apply [--yes]
```

Preview is the default. `--apply` takes a timestamped backup and writes accepted `tool_overrides` under the config lock; the running proxy hot-reloads them. Unlike `mms stats`, tune may run idempotent schema migrations on stores that already exist.

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

### `mms project route`

Preview or add the detected project's enabled registry MCPs to the STM config.

```bash
mms project route
mms project route --project acme --config ~/.memtomem/stm_proxy.json --apply
mms project route --json
```

Options are `--project`, `--config`, `--apply`, and `--json`. Routing is additive: existing entries remain, conflicts are reported and skipped, and source host configs are never pruned.

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

To inspect proxy, surfacing, selection, and compression behavior at runtime, STM ships eight observability MCP tools (`stm_proxy_stats`, `stm_proxy_cache_clear`, `stm_proxy_health`, `stm_surfacing_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`). They are hidden from `tools/list` by default; set `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true` to expose them. See [MCP Tools](/stm/mcp-tools/).

## Running the proxy server

The proxy server accepts `memtomem-stm`, `memtomem-stm-proxy`, or a bare `mms` command over piped stdio. You normally do not launch it by hand: a registered MCP client spawns it. A bare interactive `mms` invocation displays CLI help instead.

## Example Workflow

```bash
# 1. First-time setup — registers one upstream + your MCP client in one go
mms init --demo --client auto

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
mms register --client claude
```

Your MCP client now connects to `memtomem-stm` instead of each individual upstream. All upstream tools are available through the proxy, with automatic memory surfacing, response compression, and progressive delivery.

> See [Installation](/guides/installation/) for setup details, and [Proactive Surfacing](/stm/surfacing/) for how surfacing works.
