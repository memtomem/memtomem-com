---
title: Overview
description: What memtomem is — an MCP-native long-term memory server for AI agents.
---

## What is memtomem?

memtomem gives your AI agent **memory that persists across sessions and across agents**. It runs as a local MCP server — your agent uses the same tool-calling it already does, and past information becomes searchable.

## Use It When

- **You keep re-explaining yesterday's decisions in today's session** — memtomem solves the "every new session is a blank slate" problem. Walk through the flow in [Memory Persistence Across Sessions](/guides/memory-persistence/).
- **You want notes, docs, or code to be searchable by your agent** — point `mm index ~/notes` at a folder and every MCP-connected agent can query it.
- **Multiple agents need to share the same knowledge** — Claude Code, Cursor, Codex CLI, and any other MCP client share one memory store.

## Start in 3 Steps

```bash
uv tool install memtomem                              # 1. install
mm init                                               # 2. interactive setup
claude mcp add memtomem -s user -- memtomem-server    # 3. connect your agent
```

Full walkthrough (including other MCP clients) in [Quick Start](/guides/quickstart/).

## Core Concepts

- **Hybrid Search** — BM25 keyword + dense vector search merged via RRF, so exact identifiers and meaning-based queries both land. See [Hybrid Search](/ltm/hybrid-search/).
- **Namespaces** — Per-agent private spaces (`agent-runtime:{id}`) plus a `shared` space for cross-agent knowledge. See [Multi-Agent Collaboration](/ltm/multi-agent/).
- **Lifecycle Policies** — `auto_archive` / `auto_expire` / `auto_promote` / `auto_tag` run on a background scheduler, so memories are aged and promoted automatically.

## Architecture

```
AI Agent (Claude Code, Cursor, Gemini CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

memtomem runs as a local MCP server. All data stays on your machine — SQLite for storage, ONNX for embeddings. No GPU, no external services, no account required.

## Relationship to STM

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **Role** | Persistent storage & search | Real-time proxy & compression |
| **Required?** | Yes (core) | Optional |
| **How it works** | Agent calls `mem_search` when needed | Relevant memories auto-injected into every tool response |

The default setup is LTM alone. If you want token-optimized responses with proactive memory injection, add [memtomem-stm](/stm/overview/) as a proxy in front.

## Package Info

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **CLI** | `mm` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## Next Steps

- [Quick Start](/guides/quickstart/) — Install and store your first memory in 5 minutes
- [Memory Persistence Across Sessions](/guides/memory-persistence/) — Save in session A, recall in session B
- [Hybrid Search](/ltm/hybrid-search/) — How the search engine works
- [Multi-Agent Collaboration](/ltm/multi-agent/) — Namespace design and sharing workflows
- [Context Gateway](/ltm/context-gateway/) — Define agents / skills / commands once, sync across runtimes
- [MCP Tools](/ltm/mcp-tools/) — Full tool reference
- [CLI Reference](/ltm/cli/) — `mm` command reference
