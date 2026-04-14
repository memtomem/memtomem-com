---
title: MCP Tools
description: Complete reference for memtomem LTM MCP tools — 74 tools in full mode, 9 in core mode.
---

memtomem exposes **74 MCP tools** in `full` mode. In `core` mode (default), 9 frequently used tools are exposed directly, and the meta-tool `mem_do` routes requests to the remaining tools — keeping agent context usage minimal.

## Core Tools

### `mem_status`

Check server connection status and statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

### `mem_add`

Store a memory with content, tags, and namespace.

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

Retrieve a single memory by ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Memory ID |

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

Meta-tool that routes non-core actions in `core` mode. Provides access to all 74 tools through a single entry point, minimizing the number of tools exposed to the agent.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Tool name to invoke |
| `params` | object | No | Parameters for the target tool |

## Multi-Agent Tools

### `mem_agent_register`

Register an agent with an ID and description.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent_id` | string | Yes | Unique agent identifier |
| `description` | string | No | Agent description |

### `mem_agent_search`

Search across the agent's private namespace and the shared namespace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `agent_id` | string | Yes | Calling agent's ID |
| `limit` | integer | No | Max results |

### `mem_agent_share`

Export a memory from a private namespace to the shared namespace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `memory_id` | string | Yes | Memory to share |
| `agent_id` | string | Yes | Source agent's ID |

## Maintenance Tools

### `mem_tag`

Tag management — add, remove, or list tags on memories.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | `add`, `remove`, or `list` |
| `memory_id` | string | Depends | Target memory (for add/remove) |
| `tag` | string | Depends | Tag name (for add/remove) |

### `mem_namespace`

Namespace management operations.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | Management action |
| `namespace` | string | No | Target namespace |

### `mem_health`

Run index health diagnostics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

### `mem_cleanup`

Clean up expired and duplicate memories.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dry_run` | boolean | No | Preview changes without applying (default: false) |

---

> The full list of 74 tools is available in the [memtomem repository docs](https://github.com/memtomem/memtomem/tree/main/docs).
