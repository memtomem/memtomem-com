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
| `standard` | 38, including `mem_do` | You want common management tools directly visible |
| `full` | 99 current tools + 1 deprecated alias | You are debugging, documenting, or using a client that handles large tool lists well |

The following example is for a manual MCP-only connection. If a client plugin
already supplies memtomem, check that client's coexistence rule in
[Connect an AI Client](/guides/connect-ai-client/) before adding it.

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

`mem_do` provides access to every remaining action. It takes an `action` and optional `params`.

```text
mem_do(action="help")
mem_do(action="help", params={"category": "context"})
mem_do(action="schedule_list")
mem_do(action="context_diff", params={"scope": "project_shared"})
mem_do(action="context_artifact_transfer", params={"asset_type": "skill", "name": "my-skill", "mode": "copy", "to_scope": "project_shared"})
mem_do(action="version")
```

Use `mem_do(action="help")` from your MCP client to see the action catalog for the installed version.

The full v0.3.12 registry contains 99 current tools. Full mode also keeps the
deprecated `mem_context_migrate` alias (100 registered names total) until its
v0.5.0 removal. Pinned Context adds `mem_pinned_list/get/set/delete` and
`mem_context_compose`; review-first formation adds
`mem_formation_scan` and `mem_candidate_propose/list/review/recover`. The new
full-mode surface also includes `mem_context_pull` for preview-first runtime
imports and `mem_quality_replay` for deterministic Quality Lab replays.

`mem_do(action="version")` returns the server version, capability map, and a
secret-free `runtime_profile` describing the effective embedding/rerank runtime
and missing optional dependencies.

`mem_candidate_propose` creates a privacy-scanned pending review item rather
than durable memory. It requires `content`, `source`, `source_ref`, and an
`idempotency_key`; approved candidates alone pass through the normal write
path. Reusing a key with identical content returns the original pending
candidate; reusing it with different content is rejected.

## OpenCode

The published `opencode-memtomem@0.1.2` plugin bundles Core 0.3.12. OpenCode
uses the singular `plugin` key; there is no `opencode plugin add` command:

```json
{"plugin": ["opencode-memtomem@0.1.2"]}
```

For MCP tools without the plugin's slash commands and skills, configure a local
server in `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "memtomem": {
      "type": "local",
      "command": ["uvx", "--isolated", "--from", "memtomem[all]==0.3.12", "memtomem-server"],
      "enabled": true,
      "timeout": 60000,
      "environment": {"MEMTOMEM_TOOL_MODE": "core"}
    }
  }
}
```

An existing manual `mcp.memtomem` entry takes precedence over the plugin's
default, so only one server runs. Keep that exact key for a manual server, or
remove the entry to use the plugin server. A different key such as
`mcp."memtomem-local"` is not deduplicated and runs both. See the
[OpenCode connection guide](/guides/connect-ai-client/#opencode) for the full
set of choices.

## Common Actions

| Category | Examples |
|---|---|
| Namespace | `ns_list`, `ns_set`, `ns_assign`, `ns_update`, `ns_rename`, `ns_delete` |
| Tags | `tag_list`, `tag_rename`, `tag_merge`, `tag_delete` |
| Sessions | `session_start`, `session_end`, `session_list` |
| Scratch | `scratch_set`, `scratch_get`, `scratch_promote` |
| Context Gateway | `context_detect`, `context_init`, `context_generate`, `context_diff`, `context_sync`, `context_pull`, `context_artifact_transfer` (move/copy skills, agents, commands across projects and tiers), `context_version`, `context_promote` |
| Maintenance | `dedup_scan`, `dedup_merge`, `decay_scan`, `decay_expire`, `cleanup_orphans`, `auto_tag` |
| Import / export | `export`, `import`, `import_obsidian`, `import_notion`, `ingest` |
| Quality / analytics | `quality_replay`, `activity`, `timeline`, `eval`, `reflect` |

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
