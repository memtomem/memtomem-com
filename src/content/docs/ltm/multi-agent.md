---
title: Multi-Agent Collaboration
description: Use namespaces, sessions, and explicit sharing to pass reviewed memory between agents.
---

memtomem can route each agent's writes to a named namespace and copy selected memories into `shared`. This is useful when several AI clients or agent roles use the same local store but should not publish every intermediate result to one common space.

## Namespace Structure

```text
agent-runtime:{agent-id}     # per-agent routing scope
shared                       # cross-agent shared scope
```

Namespaces organize retrieval and write routing. They are **not an authentication or access-control boundary**. Processes that can open the same database should be treated as trusted local participants.

## Default Core-Mode Workflow

The default MCP surface exposes nine Core tools. Multi-agent operations run through `mem_do`; direct `mem_agent_*` tools are not visible in this mode.

### Step 1: Inspect the Available Actions

```text
mem_do(action="help", params={"category": "multi_agent"})
```

This returns the released action names and parameters before any state changes.

### Step 2: Start an Agent Session

```text
mem_do(action="session_start", params={"agent_id": "analyzer"})
```

The session namespace derives to `agent-runtime:analyzer`. Writes through `mem_add` or `mem_batch_add` inherit that scope while the session is bound. An unbound session does not redirect writes automatically.

### Step 3: Save and Search Agent Memory

```text
mem_add(content="The auth module uses short-lived access tokens.")
mem_do(
  action="agent_search",
  params={"query": "auth module tokens", "include_shared": true}
)
```

`include_shared=true` searches the agent namespace and `shared`. General `mem_search` keeps its normal behavior and is not silently redirected.

### Step 4: Share a Reviewed Memory

Use the chunk id returned by add or search:

```text
mem_do(
  action="agent_share",
  params={"chunk_id": "CHUNK_ID", "target": "shared"}
)
```

Before copying into the wider namespace, memtomem scans the content again for secret-like values. A blocked share is recorded and does not publish the chunk.

### Step 5: End the Session

```text
mem_do(action="session_end", params={"summary": "Auth analysis complete"})
```

Success means Agent A can find the item in its own scope, the item is not cross-agent by default, and Agent B can retrieve it only after the explicit share to `shared`.

## Tool-Mode Differences

| `MEMTOMEM_TOOL_MODE` | Session operations | Agent search and share |
|---|---|---|
| `core` (default) | `mem_do(action="session_start")` / `mem_do(action="session_end")` | `mem_do(action="agent_search")` / `mem_do(action="agent_share")` |
| `standard` | direct `mem_session_start` / `mem_session_end` | `mem_do(action="agent_search")` / `mem_do(action="agent_share")` |
| `full` | direct session tools | direct `mem_agent_search` / `mem_agent_share` |

Use `core` unless a client genuinely benefits from a larger exposed tool list. The dispatcher preserves the full released action surface without forcing the model to choose among 99 direct tools.

## Setting `agent_id`

`agent_id` is not inferred from the MCP client. Pass it explicitly when the session begins. Later session-aware calls inherit it.

### Claude Code · Codex

Put a rule like this in `CLAUDE.md`, `AGENTS.md`, or the relevant system instructions:

> When I ask for per-agent memory isolation, first call `mem_do(action="help", params={"category":"multi_agent"})`, then start the named session through `mem_do(action="session_start", ...)`. Share only reviewed outputs.

Do not start an agent session for every normal search. Use this flow only when the task needs per-agent routing or explicit cross-agent sharing.

### LangGraph · CrewAI

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
await store.start_agent_session(agent_id="analyzer")
# Subsequent store.search / store.add calls use the analyzer session scope.
```

Each graph node can start a session with its own `agent_id`. Publish only the output that another node needs.

### CLI Sessions

```bash
mm session start --agent-id planner
mm session list
mm session end --summary "Planning complete"
```

See [`mm session`](/ltm/cli/#mm-session) for `start`, `end`, `list`, `events`, and `wrap` options.

### CLI Agent Management

```bash
mm agent register analyzer --description "Code analysis agent" --color "#534AB7"
mm agent list
mm agent share CHUNK_ID --target shared
```

`mm agent share` also runs the secret scan. The [CLI Reference](/ltm/cli/) retains every registration, listing, migration, and sharing option.

## Difference from Built-In Memory Import

`mm ingest claude-memory`, `mm ingest codex-memory`, and `mm ingest gemini-memory` load external files into fixed source namespaces. They do not assign an `agent_id` or start a session. See [Index and Import Existing Content](/guides/index-and-import/).

## Interaction Patterns

<a id="human--agent"></a>
### Human → Agent

Ask an MCP-connected client to search confirmed decisions or explicitly save a durable result. Automatic surfacing requires STM proxy routing or a supported host hook.

<a id="agent--agent"></a>
### Agent → Agent

Agent A works in its routed namespace, reviews a useful result, and shares that chunk to `shared`. Agent B searches its own scope plus `shared`. Intermediate reasoning stays unshared unless explicitly published.

<a id="agent--human"></a>
### Agent → Human

Use the Web UI or CLI search to inspect shared decisions, their sources, and their namespaces. Treat the source as the verification point rather than trusting a model summary alone.

## Next

- [Memory Across Sessions](/guides/memory-persistence/)
- [Index and Import Existing Content](/guides/index-and-import/)
- [Context Gateway](/ltm/context-gateway/)
- [LTM MCP Tools](/ltm/mcp-tools/)
