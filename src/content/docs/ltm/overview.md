---
title: Overview
description: What memtomem is — an MCP-native long-term memory server for AI agents.
---

## What is memtomem?

memtomem gives your AI agent **memory that persists across sessions and across agents**. It runs as a local MCP server — your agent uses the same tool-calling it already does, and past information becomes searchable.

## Use It When

- **You keep re-explaining yesterday's decisions in today's session** — memtomem solves the "every new session is a blank slate" problem. Walk through the flow in [Memory Persistence Across Sessions](/guides/memory-persistence/).
- **You want notes or docs to be searchable by your agent** — point `mm index ~/notes` at a folder of Markdown / structured files and every MCP-connected agent can query it.
- **Multiple agents need to share the same knowledge** — Claude Code, Cursor, Codex CLI, and any other MCP client share one memory store.

## Start with a Verified Round Trip

```bash
uv tool install 'memtomem[all]'
mm init --preset minimal --non-interactive --mcp skip
mm status
mm add "Release smoke tests run before cutover" --tags release,decision
mm search "release smoke tests"
```

This proves storage and search before a client is involved. Continue with [Quick Start](/guides/quickstart/) and then [Connect an AI Client](/guides/connect-ai-client/).

## Core Concepts

- **Hybrid Search** — BM25 keyword + dense vector search merged via RRF, so exact identifiers and meaning-based queries both land. See [Hybrid Search](/ltm/hybrid-search/).
- **Namespaces** — Per-agent routing scopes (`agent-runtime:{id}`) plus a `shared` scope for cross-agent knowledge. They organize retrieval and are not access-control boundaries. See [Multi-Agent Collaboration](/ltm/multi-agent/).
- **Lifecycle Policies** — `auto_archive` / `auto_expire` / `auto_promote` / `auto_tag` run on a background scheduler, so memories are aged and promoted automatically.

## Architecture

```
AI Agent (Claude Code, Cursor, Antigravity CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

memtomem runs as a local-first MCP server. SQLite storage and ONNX embeddings stay on your machine and need no GPU or account. Optional remote embedding, rerank, LLM, and observability providers contact the endpoints you configure.

## Relationship to STM

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **Role** | Persistent storage & search | Real-time proxy & compression |
| **Required?** | Yes (core) | Optional |
| **How it works** | Agent calls `mem_search` when needed | Relevant memories can be injected into calls routed through the STM proxy or supported hooks |

The default setup is LTM alone. If you want token-optimized responses with proactive memory injection, add [memtomem-stm](/stm/overview/) as a proxy in front.

## Package Info

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **Latest release** | `0.3.12` |
| **CLI** | `mm` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## Next Steps

- [Quick Start](/guides/quickstart/) — Install and verify your first memory in 10 minutes
- [Memory Persistence Across Sessions](/guides/memory-persistence/) — Save in session A, recall in session B
- [Hybrid Search](/ltm/hybrid-search/) — How the search engine works
- [Multi-Agent Collaboration](/ltm/multi-agent/) — Namespace design and sharing workflows
- [Context Gateway](/ltm/context-gateway/) — Define agents / skills / commands once, then sync, move, or copy them across projects and runtimes
- [MCP Tools](/ltm/mcp-tools/) — Full tool reference
- [CLI Reference](/ltm/cli/) — `mm` command reference
