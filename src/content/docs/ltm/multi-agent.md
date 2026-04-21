---
title: Multi-Agent Collaboration
description: Namespace-based isolation and sharing for cross-agent knowledge exchange.
---

memtomem supports knowledge sharing between agents through namespace-based isolation and sharing. As a runtime-agnostic memory layer, it enables Human→Agent, Agent→Agent, and Agent→Human knowledge flows.

## Namespace Structure

```
agent-runtime:{agent-id}     # Agent-private — only that agent can access
shared                       # Shared — accessible by all agents
```

Each agent works in its own private namespace but can export useful knowledge to the shared namespace.

## 3-Step Workflow

### Step 1: Register an Agent

```
mem_agent_register(agent_id="analyzer", description="Code analysis agent")
```

### Step 2: Search Knowledge

```
mem_agent_search(query="auth module structure", include_shared=true)
```

With `include_shared=true`, searches both the agent's own namespace and the shared namespace.

### Step 3: Share Knowledge

```
mem_agent_share(memory_id="...", target="shared")
```

## Setting `agent_id`

`agent_id` is not auto-detected. The principle is the same across runtimes — **pass it explicitly when a session starts**, and it is inherited by subsequent calls through session context.

### Claude Code · Codex (MCP)

The MCP server does not identify which client is calling, so **fix the session-start rule in the agent's instructions** (CLAUDE.md · AGENTS.md · system prompt).

Example instruction:

> At the start of a conversation, call `mem_session_start(agent_id="claude-code")` first to register the session. When acting as a new agent role, use `mem_agent_register(agent_id="planner", description="...")`.

Once registered, later calls to `mem_search`, `mem_add`, and so on are routed to the `agent-runtime:{agent-id}` namespace without having to pass `agent_id` again.

### LangGraph · CrewAI (Python adapter)

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
await store.start_session(agent_id="analyzer")
# Subsequent store.search / store.put calls are isolated to the analyzer namespace
```

In multi-agent graphs, each node starts its own session with its own `agent_id`. Use `mem_agent_share` to publish outputs that need to cross agents to the `shared` namespace.

### CLI (`mm`)

Use this to pre-register a session outside the server process.

```bash
mm session start --agent-id planner
```

See [`mm session`](/ltm/cli/#mm-session) for the full subcommand surface (`start`, `end`, `list`, `events`, `wrap`).

### Difference from `mm ingest`

`mm ingest claude-memory` and `mm ingest codex-memory` **do not** assign an `agent_id`. They load memories into fixed namespaces — `claude-memory:<slug>` and `codex-memory:<slug>` — to consolidate per-editor memories into one searchable index. For per-agent isolation, use the MCP/adapter/CLI paths above to set `agent_id` explicitly.

## Interaction Patterns

### Human → Agent

When a developer works in Claude Code or Cursor, architecture decisions, coding patterns, and debugging history from previous sessions are automatically surfaced.

### Agent → Agent

In LangGraph/CrewAI workflows, when an agent chain runs, the "code analysis agent" discovers codebase structure and the "test generation agent" references it. Intermediate outputs and decision history are automatically passed through the shared LTM store.

### Agent → Human

Knowledge accumulated by agents can be searched and browsed through the Web UI dashboard. When onboarding new team members, they can review architecture decisions, bug resolution patterns, and coding conventions at a glance.

## AI Tool Memory Ingestion

Consolidate each AI editor's memory directory into a single searchable knowledge base. Re-runs are incremental — content-hash matching skips unchanged files.

```bash
mm ingest claude-memory --source ~/.claude/projects/
mm ingest codex-memory --source ~/.codex/memories/
```

For Claude, pointing at `~/.claude/projects/` discovers per-project slug directories and indexes each under `claude-memory:<slug>`. Codex is loaded from a single directory into `codex-memory:<slug>`.

## LangGraph Adapter

Use the `MemtomemStore` class for direct memory access from LangGraph/CrewAI:

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
# Search/store/manage sessions in LangGraph workflows
```
