---
title: CLI Reference
description: mm CLI commands for memtomem LTM server management.
---

The `mm` command is installed with the `memtomem` package. It provides setup, search, indexing, session tracking, and cross-runtime context sync. Run `mm --help` for the full command list or `mm --version` to print the installed version (the `mm version` subcommand also works).

## Commands

### `mm init`

Run the interactive setup wizard. Configures embedding provider, database path, tokenizer, reranker, and default namespace.

At startup, the wizard offers a **preset picker** (Minimal / English / Korean) that applies a curated bundle of embedding, reranker, tokenizer, and namespace defaults. Pass `--preset <name>` to pick one non-interactively, or `--advanced` to force the full 10-step wizard.

```bash
mm init                              # interactive setup with preset picker
mm init -y                           # auto-accept; behaves as `--preset minimal -y`
mm init --preset korean              # apply Korean preset non-interactively
mm init --preset english -y          # English preset, no prompts
mm init --advanced                   # skip picker, run full 10-step wizard
```

On a reinstall path, `mm init` compares the embedding provider / model / dimension stored in the existing `~/.memtomem/memtomem.db` against the new preset. On mismatch, the interactive wizard offers an in-place rebuild of the vector index (`chunks_vec`); under `-y`, it prints a recovery hint pointing at `mm embedding-reset --mode apply-current`. The chunks table itself is preserved, so re-running `mm index <path>` afterwards restores the working set.

### Running the MCP server

memtomem's MCP server ships as the `memtomem-server` console script. You normally don't launch it by hand — your MCP client (Claude Desktop, Claude Code, Cursor, etc.) starts it automatically from its config file. See [Quick Start](/guides/quickstart/) for the config snippets.

To filter which tools the server advertises, set `MEMTOMEM_TOOL_MODE` in the client's MCP config. See the [MCP Tools](/ltm/mcp-tools/) page for modes and tool catalogs.

### `mm web`

Launch the Web UI dashboard for browser-based search and memory management.

On launch, `mm web` opens the dashboard at `http://127.0.0.1:8080` with these tabs: **Home · Search · Sources · Index · Tags · Timeline · More**. The **More** tab holds Settings, Dedup, Age-out, Export/Import, and Reset Database.

Pass `--dev` (or set `MEMTOMEM_WEB__MODE=dev`) to unlock maintainer pages: **Namespaces, Sessions, Working Memory, Health Report**. Most users won't need these.

```bash
mm web                               # default: http://localhost:8080 (prod tier)
mm web --port 9000
mm web --open                        # also open the URL in your default browser
mm web --dev                         # shortcut for --mode dev
mm web --mode dev                    # expose opt-in maintainer pages
```

### `mm search <query>`

Search the knowledge base from the command line.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --limit 5
```

### `mm index <path>`

Index files or directories into the knowledge base. Uses hash-based change detection for incremental indexing.

```bash
mm index .                           # index current directory
mm index ~/docs/architecture         # index a specific directory
mm index README.md                   # index a single file
```

### `mm ingest`

Consolidate memories from other AI tools into memtomem. The `--source` path is required; re-runs are incremental via content-hash matching.

```bash
mm ingest claude-memory --source ~/.claude/projects/    # import Claude Code memories
mm ingest codex-memory --source ~/.codex/memories/      # import Codex CLI memories
```

### `mm session`

Manage agent sessions — start, end, list, and wrap commands. Sessions group activity events and tie them to an agent runtime.

```bash
mm session start --agent-id claude-code --title "refactor auth"
mm session list --json                           # scriptable list output
mm session events <session-id> --json            # event timeline as JSON
mm session wrap -- <command...>                  # auto start/end around a command
mm session end
```

The current session ID is stored in `~/.memtomem/.current_session`, so `mm activity log` and other commands pick it up automatically.

### `mm activity log`

Log an activity event (tool call, decision, error, subagent lifecycle) to the current session. Silent by default so hook callers never fail; `--json` emits an ack shape for scripting.

```bash
mm activity log --type tool_call --content "ran tests"
mm activity log --type decision --content "picked strategy X" --meta '{"k":"v"}' --json
```

With `--json`, a successful write returns `{"ok": true, ...}` on stdout; no active session or a write failure returns `{"ok": false, "reason": ...}`. Exit code is always 0.

### `mm context sync`

Sync agent definitions, skills, and commands across runtimes via the Context Gateway.

```bash
mm context sync                      # push canonical config → all runtimes
```

### `mm context import`

Reverse-extract runtime-specific files back to the canonical source.

```bash
mm context import                    # pull runtime files → canonical source
```

### `mm config show`

Show current configuration (API keys masked). `--json` (or `--format json`) emits the full config as machine-readable JSON for scripting.

```bash
mm config show                       # human-readable table
mm config show --json                # JSON for scripting
```

### `mm config unset <key>`

Remove a single override from `~/.memtomem/config.json`, reverting the field to its built-in default (or to whatever a `config.d/*.json` fragment resolves to). Useful for clearing stale cross-machine paths in `memory_dirs`, or a single field that's shadowing a fragment.

```bash
mm config unset memory_dirs
mm config unset rerank.model
```

### `mm agent migrate`

Rename legacy `agent/{id}` namespaces to the current `agent-runtime:{id}` format. Safe to re-run — rows already in the new format are left untouched. Use `--dry-run` to preview the planned renames.

```bash
mm agent migrate --dry-run           # preview planned renames
mm agent migrate                     # apply
```

### `mm init --fresh`

Re-run the setup wizard after dropping every wizard-untouched config key whose value differs from the built-in default. A safe cleanup option when the config has accumulated leftovers from older versions. The previous `config.json` is backed up to `config.json.bak-<unix-ts>` before rewriting.

```bash
mm init --fresh                      # opt-in bulk cleanup + wizard
```

### `mm embedding-reset`

Check or resolve mismatches between the embedding model/dimension stored in the DB and the current config (typically after swapping providers or following a reinstall). `--mode` selects the action.

```bash
mm embedding-reset                            # --mode status (default): compare DB vs. config
mm embedding-reset --mode apply-current       # reset DB to current config (destructive — re-index required)
mm embedding-reset --mode revert-to-stored    # switch runtime embedder to DB stored values (non-destructive)
```

`apply-current` rebuilds `chunks_vec` at the current config's dimension. The chunks table itself is preserved, but all vectors are deleted — run `mm index <path>` afterwards to re-index. `revert-to-stored` only flips runtime state; to make it permanent, update the embedding fields in `~/.memtomem/config.json` accordingly.

### `mm purge --matching-excluded`

Remove already-indexed chunks whose source paths match the built-in credential denylist or your `indexing.exclude_patterns`. Runs as a dry-run by default — pass `--apply` to actually delete.

```bash
mm purge --matching-excluded          # dry-run — shows what would be removed
mm purge --matching-excluded --apply  # perform the deletion
```

## Example Workflow

```bash
# 1. Initial setup (preset picker runs interactively)
mm init

# 2. Index your project
mm index ~/projects/my-app

# 3. Import existing AI tool memories
mm ingest claude-memory --source ~/.claude/projects/

# 4. Search from CLI
mm search "database migration patterns"

# 5. Open the Web UI to browse and manage memories
mm web --open
```

The MCP server runs automatically under your AI client once `memtomem` is registered in its MCP config.

> See [Quick Start](/guides/quickstart/) for the full getting-started walkthrough.
