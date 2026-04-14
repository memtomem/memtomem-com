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
mm ingest gemini-memory    # import Gemini CLI memories
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
