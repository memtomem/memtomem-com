---
title: Troubleshooting
description: Diagnose setup problems in journey order, from Python and init through search, MCP clients, Web UI, and STM.
---

Start at the failed step. Each fix ends with the command or guide section to retry.

## 1. Environment and Installation

### Python is too old or missing

```bash
python --version
```

memtomem requires Python 3.12 or later. On Windows, try `py --version`. Install or select a supported Python before retrying [Quick Start → Install and Initialize](/guides/quickstart/#2-run-setup).

### `uv: command not found`

Install `uv` from its [official installation guide](https://docs.astral.sh/uv/getting-started/installation/), reopen the terminal, and verify:

```bash
uv --version
```

### `mm: command not found` / `mms: command not found`

The executable directory may not be on `PATH`. Run the command for your installer and reopen the terminal:

```bash
uv tool update-shell
```

For pipx, use `pipx ensurepath`. Then retry `mm --version` or `mms --version`.

### `mm --version` prints an old version

```bash
uv tool install 'memtomem[all]' --refresh
mm --version
```

## 2. Initialization

### The setup wizard is unclear or a model download fails

Return to a deterministic no-download baseline:

```bash
mm init --preset minimal --non-interactive --mcp skip
mm status
```

Minimal is BM25-only and does not download an embedding model. Add English (Recommended) or Korean-optimized semantic search only after this path works.

### Configuration or database is not created

Run `mm status` and read the configuration and database paths it reports. Confirm the current user can write to the parent directory and that `~/.memtomem/` is not owned by another account. Retry initialization; do not delete the directory or database as a first recovery step.

## 3. LTM Write and Search

### What `mm status` should show

Healthy output includes storage and database paths, an embedding provider, and index counts. Zero chunks are normal before the first add or index.

```bash
mm status
mm status --json
```

### `mm add` cannot write

1. Read the database and memory paths from `mm status`.
2. Confirm the current user owns and can write to those directories.
3. Retry with a short, non-sensitive sentence.
4. If a project-local tier is involved, run from the intended Git project root.

Return to [Quick Start → Verify a Memory Round Trip](/guides/quickstart/#3-verify-a-memory-round-trip).

### `mm search` returns no results

- Confirm `mm status` shows at least one chunk after add or index.
- With Minimal preset, search words that appear exactly in the saved source.
- If a namespace was used, pass the same namespace or use the agent-specific search flow.
- For external files, confirm the returned source count changed after `mm index` or import.

```bash
mm search "EXACT_WORDS_FROM_THE_SOURCE"
```

See [Index and Import Existing Content](/guides/index-and-import/) for source and repeat-run checks.

## 4. Plugin and MCP Connection

### The client does not support plugin commands

Claude Code and Codex have the official plugin paths documented on this site. Other clients may not recognize `/plugin` or `codex plugin`; use their MCP-only configuration from [Connect an AI Client](/guides/connect-ai-client/) instead.

### The agent cannot see memtomem tools

- The MCP command must be `memtomem-server`; `memtomem` and `mm` are CLIs.
- Restart the client or open a new session after changing configuration.
- In Claude Code, run `claude mcp list`; in Codex, run `codex mcp list`.
- Ask the client to call `mem_status` explicitly.

### A GUI client cannot find `memtomem-server`

GUI apps may start with a different `PATH` from the terminal. Find the installed executable:

```bash
command -v memtomem-server
```

Use that absolute path as the configured `command`, then fully restart the app. On Windows, use `where memtomem-server`.

### Plugin commands or tools appear twice

The plugin may already provide the MCP server. Remove the duplicate manual entry, start a new session, and check the client list again. Do not register both paths merely to make discovery more reliable.

### Two clients return different memories

Call `mem_status` in both clients and compare database paths. Project-local memory also requires the same project root and scope. Matching package versions alone does not make different databases share content.

## 5. Web UI

### The browser does not open or the page is unavailable

```bash
mm web --open
mm web status
```

The default server binds to loopback. Background Web UI logs are in `~/.memtomem/logs/web.log`. Do not bind it to a public interface without the controls described in [Operations & API](/ltm/operations/).

## 6. STM Proxy

### The proxy does nothing

```bash
mms status
mms health
mms doctor
```

`mms add` or `mms init` must have enabled the proxy and added an upstream. `mms doctor` exits 0 when there are no FAIL checks; WARNs are allowed.

### Proxied tools go missing (64-character limit)

The final client name may be `mcp__<server>__<prefix>__<tool>`. If it exceeds 64 characters, the tool can be withheld. Use a shorter STM server name and upstream `--prefix`, then run `mms health --names` and confirm it no longer reports the composed name.

### `mms stats --source mcp` stays empty

The client probably used a built-in tool instead of an STM MCP alias. Ask it to call the visible `<prefix>__<tool>` name explicitly and check stats again.

### Surfacing is not firing

`mms health` must report the optional LTM link as connected and the LTM server must expose `mem_search`. If only LTM is unavailable, proxying, compression, and caching can still work.

### Restore the original MCP registration

Preview first:

```bash
mms eject SERVER_NAME --dry-run
mms eject SERVER_NAME
```

See [Add STM to an MCP Server](/guides/stm-first-proxy/) for verification before and after restoration.

## 7. Logs and Files

- LTM and STM MCP logs go to stderr by default and are captured or discarded by the launching client.
- Set `MEMTOMEM_LOG_LEVEL` to adjust LTM verbosity.
- Set `MEMTOMEM_STM_LOG_FILE` to opt into an STM rotating file log.
- Background Web UI logs live at `~/.memtomem/logs/web.log`.

| Path | What |
|---|---|
| `~/.memtomem/memtomem.db` | LTM SQLite store |
| `~/.memtomem/config.json` | LTM configuration |
| `~/.memtomem/stm_proxy.json` | STM proxy configuration |
| `~/.memtomem/logs/web.log` | background Web UI log |

For every released setting, see [Environment Variables](/reference/configuration/).
