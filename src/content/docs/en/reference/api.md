---
title: API Reference
description: memtomem MCP tools and CLI commands.
---

## LTM MCP Tools (memtomem — 74 tools)

### Core Tools

| Tool | Description |
|------|-------------|
| `mem_status` | Check server connection status and stats |
| `mem_add` | Store a memory (content, tags, namespace) |
| `mem_search` | Hybrid search (BM25 + vector + RRF) |
| `mem_recall` | Retrieve a single memory by ID |
| `mem_list` | List memories (filter, pagination) |
| `mem_read` | Read a source file |
| `mem_index` | Index a path or file |
| `mem_stats` | Index/search statistics |
| `mem_do` | Meta-tool — routes non-core actions in `core` mode for minimal context usage |

### Multi-Agent Tools

| Tool | Description |
|------|-------------|
| `mem_agent_register` | Register an agent (id, description) |
| `mem_agent_search` | Search agent namespace + shared |
| `mem_agent_share` | Export a memory to the shared namespace |

### Maintenance Tools

| Tool | Description |
|------|-------------|
| `mem_tag` | Tag management (add, remove, list) |
| `mem_namespace` | Namespace management |
| `mem_health` | Index health diagnostics |
| `mem_cleanup` | Clean up expired/duplicate memories |

> See the [memtomem repository docs](https://github.com/memtomem/memtomem/tree/main/docs) for the full list of 74 tools.

## STM MCP Tools (memtomem-stm — 10 tools)

In addition to proxied upstream tools, STM provides its own management tools:

| Tool | Description |
|------|-------------|
| `stm_status` | STM proxy status |
| `stm_cache_stats` | Response cache statistics |
| `stm_cache_clear` | Clear cache |
| `stm_compression_stats` | Per-strategy compression statistics |
| `stm_surfacing_stats` | Surfacing statistics (hit rate, feedback) |
| `stm_feedback` | Submit surfacing/compression quality feedback |

## CLI Commands

### `mm` (LTM)

```bash
mm init              # interactive setup wizard
mm serve             # start MCP server
mm web               # launch Web UI dashboard
mm search <query>    # search from CLI
mm index <path>      # index from CLI
mm ingest claude-memory   # ingest Claude Code memories
mm ingest gemini-memory   # ingest Gemini CLI memories
mm ingest codex-memory    # ingest Codex CLI memories
mm context sync      # Context Gateway sync
mm context import    # runtime files → canonical source
```

### `mms` (STM)

```bash
mms add <name> --command <cmd> --args <args> --prefix <prefix>
                     # register upstream MCP server
mms list             # list registered servers
mms remove <name>    # remove a server
mms serve            # start STM proxy
mms stats            # proxy statistics
```

## Environment Variables

Key settings are controlled via environment variables. See the Configuration docs in each repository for the full list.

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMTOMEM_EMBEDDING_PROVIDER` | Embedding provider (onnx/ollama/openai) | `onnx` |
| `MEMTOMEM_DB_PATH` | SQLite DB path | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_STM_COMPRESSION` | Default compression strategy | `auto` |
| `MEMTOMEM_STM_SURFACING` | Enable surfacing | `true` |
