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

## 5-Step Workflow

### Step 1: Register an Agent

```
mem_agent_register(agent_id="analyzer", description="Code analysis agent")
```

### Step 2: Start a Session

```
mem_session_start(agent_id="analyzer")
```

The session record's namespace auto-derives to `agent-runtime:analyzer`. Subsequent calls in this session inherit the agent scope without re-passing `agent_id`:

- **Writes** — `mem_add(content="...")` and `mem_batch_add(...)` write to `agent-runtime:analyzer` automatically. Pass `namespace="shared"` explicitly to publish cross-agent on a single call.
- **Reads** — `mem_agent_search` / `mem_agent_share` resolve to the agent scope without `agent_id=`. (`mem_search` itself stays single-agent — use `mem_agent_search` to read inside the agent scope.)

### Step 3: Search Knowledge

```
mem_agent_search(query="auth module structure", include_shared=true)
```

With `include_shared=true`, searches both the agent's own namespace and the shared namespace.

### Step 4: Share Knowledge

```
mem_agent_share(chunk_id="...", target="shared")
```

Before the copy is written into a wider namespace, share re-scans the content with the trust-boundary redaction guard. Secret-looking content is blocked at share time (the block is recorded in the audit counters), so a sensitive chunk does not silently propagate into a wider namespace.

### Step 5: End the Session

```
mem_session_end(summary="...")
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
await store.start_agent_session(agent_id="analyzer")
# Subsequent store.search / store.add calls are isolated to the analyzer namespace
```

In multi-agent graphs, each node starts its own session with its own `agent_id`. Use `mem_agent_share` to publish outputs that need to cross agents to the `shared` namespace.

### CLI (`mm session`)

Use this to pre-register a session outside the server process.

```bash
mm session start --agent-id planner
```

See [`mm session`](/ltm/cli/#mm-session) for the full subcommand surface (`start`, `end`, `list`, `events`, `wrap`).

### CLI (`mm agent`)

Use this to register or list agents and share chunks from a shell without an MCP client. Each command mirrors the `mem_agent_register` / `mem_agent_share` MCP tools above.

```bash
mm agent register analyzer --description "Code analysis agent" --color "#534AB7"
mm agent list                 # lists registered agent-runtime: namespaces + shared (--json supported)
mm agent share <chunk_id> --target shared
```

`mm agent share` also re-runs the redaction guard before copying; secret-looking content is blocked unless re-confirmed with `--force-unsafe`. See the [CLI reference](/ltm/cli/) for the full flag surface.

### Difference from `mm ingest`

`mm ingest claude-memory`, `mm ingest gemini-memory`, and `mm ingest codex-memory` **do not** assign an `agent_id`. They load memories into fixed namespaces — `claude-memory:<slug>`, `gemini-memory:<slug>`, and `codex-memory:<slug>` — to consolidate per-editor memories into one searchable index. For per-agent isolation, use the MCP/adapter/CLI paths above to set `agent_id` explicitly.

## Interaction Patterns

### Human → Agent

When a developer works in Claude Code or Cursor, architecture decisions, coding patterns, and debugging history from previous sessions are automatically surfaced.

### Agent → Agent

In LangGraph/CrewAI workflows, when an agent chain runs, the "test generation agent" reads the codebase structure that the "code analysis agent" published to the shared namespace via `mem_agent_share`. The shared LTM store is the cross-agent handoff point; intermediate outputs and decision history cross agents through that explicit share step.

### Agent → Human

Knowledge accumulated by agents can be searched and browsed through the Web UI dashboard. When onboarding new team members, they can review architecture decisions, bug resolution patterns, and coding conventions at a glance.

## Related — AI Tool Memory Ingestion

`mm ingest {claude,gemini,codex}-memory` is a separate feature from per-agent isolation: it consolidates each AI editor's memory directory into fixed namespaces (`*-memory:<slug>`) for unified indexing (see [Difference from `mm ingest`](#difference-from-mm-ingest) above). For the full options — source paths and slug behavior — see the [installation guide](/guides/installation/).
