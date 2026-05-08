---
title: MCP Tools
description: Reference for memtomem LTM MCP tools — ~80 tools in full mode, 9 in core.
---

memtomem registers **~80 MCP tools** in `full` mode. In `core` mode (default) only 9 tools are advertised — one of them is the meta tool `mem_do`, which routes non-core actions — minimizing the number of tools the agent has to scan over.

Set the mode via `MEMTOMEM_TOOL_MODE` in your MCP client's `env`:

| Mode | Tools advertised | Notes |
|---|---|---|
| `core` (default) | **9** (incl. `mem_do`) | Smallest context footprint. Non-core actions go through `mem_do(action=...)` |
| `standard` | ~30 | core + frequently-used groups (CRUD, namespace, tags, sessions, scratch, relations) |
| `full` | ~80 | Every tool individually registered |

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "env": { "MEMTOMEM_TOOL_MODE": "standard" }
    }
  }
}
```

## Core Tools

### `mem_status`

Server connection status and statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

### `mem_add`

Store a memory with content, tags, namespace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | string | Yes | Memory content to store |
| `tags` | string[] | No | Tags for categorization |
| `namespace` | string | No | Target namespace (default: `default`) |
| `ttl` | integer | No | Time-to-live in seconds |

### `mem_search`

Hybrid search using BM25 keyword + dense vector + RRF fusion.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `namespace` | string | No | Namespace to search |
| `limit` | integer | No | Max results (default: 10) |
| `min_score` | float | No | Minimum relevance score |

### `mem_recall`

Recall recent memory chunks by date range — newest first. Use this to scan by time / source / namespace without a keyword; for keyword search use `mem_search`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `since` | string | No | Inclusive start. `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, or ISO datetime |
| `until` | string | No | Exclusive end (same formats as `since`) |
| `source_filter` | string | No | Source file path substring or glob (`*`, `?`, `[]`) |
| `namespace` | string | No | Namespace — single, comma-separated, or glob (e.g. `project:*`) |
| `limit` | integer | No | Chunks to return (default 20, max 500) |
| `output_format` | string | No | `compact` (default) or `structured` (JSON) |

### `mem_list`

List memories with filtering and pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `namespace` | string | No | Filter by namespace |
| `tags` | string[] | No | Filter by tags |
| `limit` | integer | No | Max results |
| `offset` | integer | No | Pagination offset |

### `mem_read`

Read a source file that was previously indexed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File path to read |

### `mem_index`

Index a path or file into the knowledge base.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | File or directory path |
| `recursive` | boolean | No | Index subdirectories (default: true) |

### `mem_stats`

Get index and search statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

### `mem_do`

Meta tool that routes non-core actions in `core` mode. Single entry point to ~80 tools, keeping the advertised tool count small.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Tool name or alias (e.g. `orphans` → `cleanup_orphans`) |
| `params` | object | No | Parameters for the target tool |

## Multi-Agent Tools

### `mem_agent_register`

Register an agent and create the `agent-runtime:{agent_id}` namespace. Re-calling with an existing ID updates metadata.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Unique agent identifier (`[A-Za-z0-9._-]` only) |
| `description` | string | No | Optional role description |
| `color` | string | No | Optional UI color hex code |

### `mem_agent_search`

Search the agent's private namespace and (optionally) the shared namespace. With `agent_id` omitted, falls back to the active session's agent or the legacy `current_namespace`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `agent_id` | string | No | Calling agent's ID (omit to use session context) |
| `include_shared` | boolean | No | Also search the shared namespace (default `true`) |
| `top_k` | integer | No | Max results (default 10) |
| `output_format` | string | No | `compact` (default) / `verbose` / `structured` |

### `mem_agent_share`

**Copy** a chunk into another namespace. This is a copy, not a reference link — the new chunk gets a fresh UUID, and updates to the source do not propagate. Provenance is recorded only via a `shared-from=<source-uuid>` tag on the copy.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chunk_id` | string | Yes | UUID of the chunk to copy |
| `target` | string | No | Target namespace (default `shared`. `agent-runtime:{agent_id}` also valid) |

## Tag Management

Tag operations route through `services.tag_management` so MCP, the Web UI, and the search-cache invalidation stay in sync.

| Tool | Description |
|---|---|
| `mem_tag_list` | List tags with usage counts (descending frequency) |
| `mem_tag_rename(old_tag, new_tag, dry_run=false)` | Rename a tag across all chunks |
| `mem_tag_delete(tag, dry_run=false)` | Strip a tag from every chunk (the chunks themselves are preserved) |
| `mem_tag_merge(sources, target, dry_run=false)` | Fold multiple source tags into a single target tag |

Pass `dry_run=true` to see counts and a sample of affected chunks without writing.

## Namespace Management

| Tool | Description |
|---|---|
| `mem_ns_list` | List namespaces with chunk counts |
| `mem_ns_get` | Show the current session namespace |
| `mem_ns_set(namespace)` | Set the session-default namespace; subsequent search/add/recall use it unless overridden |
| `mem_ns_rename(old, new)` | Rename a namespace (SQL UPDATE — no re-indexing) |
| `mem_ns_assign(namespace, source_filter?, old_namespace?)` | Move existing chunks into a namespace (at least one filter required) |
| `mem_ns_update(namespace, description?, color?)` | Update namespace metadata |
| `mem_ns_delete(namespace)` | Delete every chunk in a namespace from the index (source files are not touched) |

Every namespace argument runs through `validate_namespace()`; hostile shapes (`shared:foo:bar` etc.) are rejected.

## Cleanup, Dedup, Decay

| Tool | Description |
|---|---|
| `mem_cleanup_orphans` | Remove chunks whose source files are gone |
| `mem_dedup_scan` / `mem_dedup_merge` | Detect and merge duplicate chunks |
| `mem_decay_scan` / `mem_decay_expire` | Score time-based decay / apply TTL expiry |

---

> The full list of ~80 tools and their signatures is in the [memtomem repository docs](https://github.com/memtomem/memtomem/tree/main/docs).
