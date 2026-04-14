---
title: Overview
description: What memtomem is — an MCP-native long-term memory server for AI agents.
---

## What is memtomem?

**memtomem** is an MCP-native long-term memory (LTM) server for AI agents. It indexes your markdown notes, documents, and code into a searchable knowledge base that any MCP-compatible agent can access.

Memories persist across sessions and can be shared between agents — so decisions, patterns, and context are never lost.

## Key Capabilities

- **Hybrid Search** — BM25 keyword + dense vector + RRF fusion for high-precision recall
- **Semantic Chunking** — 6 strategies (Markdown, Python AST, JS/TS AST, JSON, YAML/TOML, plain text) that understand document structure
- **Incremental Indexing** — Hash-based change detection, only re-indexes what changed
- **Namespace Isolation** — `agent/{id}` private namespaces + `shared` namespace for cross-agent knowledge
- **Multi-Agent Collaboration** — Register, search, and share memories across agents
- **Web UI Dashboard** — Browser-based search and memory management via `mm web`

## Architecture

```
AI Agent (Claude Code, Cursor, Gemini CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

memtomem runs as a local MCP server. All data stays on your machine — SQLite for storage, ONNX for embeddings. No GPU, no external services.

Optionally, [memtomem-stm](/stm/overview/) sits in front as a proxy, adding real-time compression and proactive memory surfacing.

## Package Info

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **CLI** | `mm` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## Next Steps

- [Quick Start](/guides/quickstart/) — Install and store your first memory in 5 minutes
- [Hybrid Search](/ltm/hybrid-search/) — How the search engine works
- [Multi-Agent Collaboration](/ltm/multi-agent/) — Namespace design and sharing workflows
- [MCP Tools](/ltm/mcp-tools/) — Complete tool reference (74 tools)
- [CLI Reference](/ltm/cli/) — `mm` command reference
