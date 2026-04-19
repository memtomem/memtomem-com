---
title: Overview
description: What memtomem is — an MCP-native long-term memory server for AI agents.
---

## What is memtomem?

memtomem remembers everything for your AI agent. Point it at your notes, docs, and code, and any MCP-compatible agent can search them back — across sessions, across agents.

**memtomem** is a long-term memory (LTM) server that speaks the Model Context Protocol (MCP). In practice that means it runs as a local process your AI client connects to, and exposes searchable memory as a set of tools (`mem_search`, `mem_add`, ...) your agent can call directly.

## Key Capabilities

- **Hybrid Search** — Combines keyword search (BM25) with meaning-based vector search, then merges the rankings via Reciprocal Rank Fusion (RRF) so you get hits from both.
- **Semantic Chunking** — 7 strategies (Markdown, Python, JS/TS, JSON, YAML/TOML, reStructuredText, plain text) that split documents along real structural boundaries, not arbitrary token windows.
- **Local Reranking** — Optional cross-encoder rerank runs fully on-device via FastEmbed ONNX — no external API, no extra install beyond `memtomem[onnx]`.
- **Incremental Indexing** — Hash-based change detection, so re-indexing only touches what changed.
- **Opt-in AI Agent Memory** — `mm init` offers to enroll Claude Code memory (`~/.claude/projects/<project>/memory/`), Claude Code plans (`~/.claude/plans/`), and Codex CLI memory (`~/.codex/memories/`) into `memory_dirs`. Disable the prompt with `indexing.auto_discover=false`.
- **Namespace Policy Rules** — Auto-tag files by path pattern at index time instead of passing `namespace=` on every call.
- **Lifecycle Policies** — `auto_archive` / `auto_promote` / `auto_expire` / `auto_tag` run on a background scheduler.
- **Memory Ingest** — `mm ingest claude-memory` / `gemini-memory` / `codex-memory` for one-shot imports from other AI tools.
- **Namespace Isolation** — `agent/{id}` private namespaces plus a `shared` namespace for cross-agent knowledge.
- **Multi-Agent Collaboration** — Register, search, and share memories across agents.
- **Web UI Dashboard** — Browser-based search and memory management via `mm web`.
- **Database Reset** — `mm reset` / `mem_reset` / `POST /api/reset` when you want to start over.

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
- [MCP Tools](/ltm/mcp-tools/) — 74 tools total; `core` / `standard` / `full` exposure modes
- [CLI Reference](/ltm/cli/) — `mm` command reference
