---
title: CLI Reference
description: mm CLI commands for memtomem LTM server management.
---

The `mm` command is installed with the `memtomem` package. It provides server management, search, indexing, and cross-runtime context sync.

## Commands

### `mm init`

Run the interactive 8-step setup wizard. Configures embedding provider, database path, and default namespace.

```bash
mm init              # interactive setup
mm init -y           # auto-accept defaults (for CI)
```

### `mm serve`

Start the memtomem MCP server.

```bash
mm serve             # default: stdio transport
mm serve --transport sse --port 8765
mm serve --transport http --port 8765
```

### `mm web`

Launch the Web UI dashboard for browser-based search and memory management.

```bash
mm web               # default: http://localhost:8766
mm web --port 9000
mm web --open        # also open the URL in your default browser
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
mm index .                    # index current directory
mm index ~/docs/architecture  # index a specific directory
mm index README.md            # index a single file
```

### `mm ingest`

Consolidate memories from other AI tools into memtomem.

```bash
mm ingest claude-memory    # import Claude Code memories
mm ingest codex-memory     # import Codex CLI memories
```

### `mm context sync`

Sync agent definitions, skills, and commands across runtimes via the Context Gateway.

```bash
mm context sync      # push canonical config → all runtimes
```

### `mm context import`

Reverse-extract runtime-specific files back to the canonical source.

```bash
mm context import    # pull runtime files → canonical source
```

### `mm config unset <key>`

Remove a single override from `~/.memtomem/config.json`, reverting the field to its built-in default (or to whatever a `config.d/*.json` fragment resolves to). Useful for clearing stale cross-machine paths in `memory_dirs`, or a single field that's shadowing a fragment.

```bash
mm config unset memory_dirs
mm config unset rerank.model
```

### `mm init --fresh`

Re-run the setup wizard after dropping every wizard-untouched config key whose value differs from the built-in default. A safe cleanup option when the config has accumulated leftovers from older versions. The previous `config.json` is backed up to `config.json.bak-<unix-ts>` before rewriting.

```bash
mm init --fresh      # opt-in bulk cleanup + wizard
```

### `mm purge --matching-excluded`

Remove already-indexed chunks whose source paths match the built-in credential denylist or your `indexing.exclude_patterns`. Runs as a dry-run by default — pass `--apply` to actually delete. Part of the v0.1.10 security-fix cleanup workflow.

```bash
mm purge --matching-excluded              # dry-run — shows what would be removed
mm purge --matching-excluded --apply      # perform the deletion
```

## Example Workflow

```bash
# 1. Initial setup
mm init

# 2. Index your project
mm index ~/projects/my-app

# 3. Import existing AI tool memories
mm ingest claude-memory

# 4. Search from CLI
mm search "database migration patterns"

# 5. Start the MCP server for agent access
mm serve
```

> See [Quick Start](/guides/quickstart/) for the full getting-started walkthrough.
