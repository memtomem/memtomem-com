---
title: Overview
description: What memtomem-stm is — an MCP proxy that adds proactive surfacing and compression for AI agents.
---

## What is memtomem-stm?

**memtomem-stm** is an MCP proxy that sits between AI agents and upstream MCP servers. It adds two capabilities that agents lack on their own:

1. **Proactive Surfacing** — Automatically injects relevant long-term memories into every tool call, without the agent explicitly searching.
2. **Response Compression** — Compresses large MCP responses to fit within context windows, using 10 content-aware strategies.

No agent code changes required — STM works as a transparent proxy.

## How It Works

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM intercepts every MCP tool call. For each call, it:

1. **Cleans** the request (removes noise, normalizes format)
2. **Compresses** the response (auto-selects from 10 strategies)
3. **Surfaces** relevant memories from LTM (5-level relevance gating)
4. **Indexes** the interaction for future recall

## Key Capabilities

- **5-Level Relevance Gating** — Context extraction prioritized by specificity
- **10 Compression Strategies** — Auto-selected by content type (`auto`, `hybrid`, `selective`, `progressive`, `extract_fields`, `schema_pruning`, `skeleton`, `llm_summary`, `truncate`, `none`)
- **Progressive Surfacing (F6, unreleased)** — `append` / `section` injection modes now trigger Stage 3 SURFACE on progressive continuations
- **Background Auto-Indexing (F4, unreleased)** — Opt in via `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND=true`; Stage 4 runs off the request path
- **Progressive Footer Token** — Canonical `\n---\n[progressive: chars=` split token exported as `PROGRESSIVE_FOOTER_TOKEN` (avoids collisions with Markdown HR / YAML fences)
- **Model-Aware Defaults** — Automatically adjusts behavior for small (≤32K), medium (32K–200K), and large (>200K) context windows
- **Feedback Loop** — `stm_surfacing_feedback` + `stm_compression_feedback` feed a per-tool auto-tuner
- **Horizontal Scaling** — `PendingStore` protocol with in-memory (default) or SQLite-shared backend
- **Langfuse Observability** — Spans for every pipeline stage plus upstream `_trace_id` propagation
- **Circuit Breaker** — 3-state safety mechanism prevents runaway memory injection
- **Context Gateway** — Auto-syncs agent definitions across 6 runtimes

## Relationship to LTM

STM and LTM are **independent packages** — no Python dependency between them. They communicate via MCP protocol, and each can be deployed, upgraded, and configured separately.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **Role** | Persistent storage & search | Real-time proxy & compression |
| **Required?** | Yes (core) | Optional (enhances experience) |
| **Communication** | Direct MCP server | MCP proxy → queries LTM |

## Package Info

| | |
|---|---|
| **PyPI** | [`memtomem-stm`](https://pypi.org/project/memtomem-stm/) |
| **CLI** | `mms` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## Next Steps

- [Proactive Surfacing](/stm/surfacing/) — 5-level gating and feedback auto-tuning
- [Compression Strategies](/stm/compression/) — 10 strategies and auto-selection logic
- [Context Gateway](/stm/context-gateway/) — Cross-runtime sync
- [MCP Tools](/stm/mcp-tools/) — STM management tools
- [CLI Reference](/stm/cli/) — `mms` command reference
