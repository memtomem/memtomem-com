---
title: Multi-Agent Collaboration
description: Namespace-based isolation and sharing for cross-agent knowledge exchange.
---

memtomem supports knowledge sharing between agents through namespace-based isolation and sharing. As a runtime-agnostic memory layer, it enables Human→Agent, Agent→Agent, and Agent→Human knowledge flows.

## Namespace Structure

```
agent/{agent-id}     # Agent-private — only that agent can access
shared               # Shared — accessible by all agents
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

## Interaction Patterns

### Human → Agent

When a developer works in Claude Code or Cursor, architecture decisions, coding patterns, and debugging history from previous sessions are automatically surfaced.

### Agent → Agent

In LangGraph/CrewAI workflows, when an agent chain runs, the "code analysis agent" discovers codebase structure and the "test generation agent" references it. Intermediate outputs and decision history are automatically passed through the shared LTM store.

### Agent → Human

Knowledge accumulated by agents can be searched and browsed through the Web UI dashboard. When onboarding new team members, they can review architecture decisions, bug resolution patterns, and coding conventions at a glance.

## AI Tool Memory Ingestion

Automatically discover and index memory directories from each AI editor:

```bash
mm ingest claude-memory     # ~/.claude/projects
mm ingest gemini-memory     # ~/.gemini
mm ingest codex-memory      # ~/.codex/memories
```

Consolidates scattered agent memories into a single searchable knowledge base.

## LangGraph Adapter

Use the `MemtomemStore` class for direct memory access from LangGraph/CrewAI:

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
# Search/store/manage sessions in LangGraph workflows
```
