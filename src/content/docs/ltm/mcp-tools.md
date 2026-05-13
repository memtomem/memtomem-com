---
title: MCP Tools
description: How memtomem exposes memory features to MCP clients.
---

memtomem exposes its LTM features as MCP tools. New users should keep the default `core` mode: it gives agents the common tools directly and routes everything else through `mem_do`, which keeps the agent's visible tool list small.

## Tool Modes

Set the mode with `MEMTOMEM_TOOL_MODE` in your MCP client config.

| Mode | Tools exposed | Use when |
|---|---|---|
| `core` (default) | 9 total, including `mem_do` | Best default for most agents |
| `standard` | ~38 | You want common management tools directly visible |
| `full` | 80+ | You are debugging, documenting, or using a client that handles large tool lists well |

Example:

```json
{
  "mcpServers": {
    "memtomem": {
      "command": "memtomem-server",
      "env": { "MEMTOMEM_TOOL_MODE": "core" }
    }
  }
}
```

## Core Mode

In `core` mode, the agent sees the tools needed for daily memory work:

| Tool | Purpose |
|---|---|
| `mem_status` | Check server, storage, embedding, and index status |
| `mem_stats` | Return index statistics |
| `mem_add` | Store a new memory |
| `mem_search` | Hybrid search over indexed memory |
| `mem_recall` | Browse recent or date-filtered memory |
| `mem_index` | Index a file or directory |
| `mem_list` | List indexed memories / sources |
| `mem_read` | Read an indexed source file |
| `mem_do` | Route all non-core actions by name |

Tell the agent what you want in natural language. It will usually pick the right core tool.

## `mem_do`

`mem_do` is the escape hatch for the rest of the surface. It takes an `action` and optional `params`.

```text
mem_do(action="help")
mem_do(action="help", params={"category": "context"})
mem_do(action="schedule_list")
mem_do(action="context_diff", params={"scope": "project_shared"})
```

Use `mem_do(action="help")` from your MCP client to see the action catalog for the installed version.

## Common Actions

| Category | Examples |
|---|---|
| Namespace | `ns_list`, `ns_set`, `ns_assign`, `ns_update`, `ns_rename`, `ns_delete` |
| Tags | `tag_list`, `tag_rename`, `tag_merge`, `tag_delete` |
| Sessions | `session_start`, `session_end`, `session_list` |
| Scratch | `scratch_set`, `scratch_get`, `scratch_promote` |
| Context Gateway | `context_detect`, `context_init`, `context_generate`, `context_diff`, `context_sync`, `context_migrate` |
| Maintenance | `dedup_scan`, `dedup_merge`, `decay_scan`, `decay_expire`, `cleanup_orphans`, `auto_tag` |
| Import / export | `export`, `import`, `import_obsidian`, `import_notion`, `ingest` |
| Analytics | `activity`, `timeline`, `eval`, `reflect` |

## When to Change Modes

Stay in `core` when:

- You are setting up memtomem for an agent.
- You want lower prompt/tool-list overhead.
- You are not sure which mode you need.

Use `standard` when an MCP client works better with direct tools than `mem_do` routing.

Use `full` when you are testing, writing docs, or manually exercising every tool. `full` intentionally exposes a large surface.

## CLI Mirrors

Most common MCP operations have CLI equivalents:

| MCP | CLI |
|---|---|
| `mem_status` | `mm status` |
| `mem_add` | `mm add` |
| `mem_search` | `mm search` |
| `mem_index` | `mm index` |
| `mem_do(action="context_sync")` | `mm context sync` |
| `mem_do(action="schedule_list")` | `mm schedule list` |

If an agent is struggling to call the right tool, run the CLI command once yourself and then ask the agent to follow the same operation.
