---
title: Overview
description: What memtomem-stm is — an MCP proxy that adds proactive surfacing and compression for AI agents.
---

## What is memtomem-stm?

memtomem-stm is a **short-term memory (STM) proxy** that sits between your AI agent and your existing MCP servers. Without any agent-side code changes, it adds **response compression** and **proactive memory injection** to every tool call — typically cutting token use by 20–80%.

## Use It When

- **MCP tool responses keep blowing your context window** — filesystem or GitHub MCP servers often return 8,000-token payloads. STM compresses them to ~2,000 with a strategy picked for the content type.
- **You want memories auto-injected without the agent having to ask** — with LTM alone, the agent has to call `mem_search`. With STM in front, relevant memories ride along with every tool response, no explicit query needed.
- **You want tool-call history to accumulate as long-term memory automatically** — STM indexes interactions into LTM off the request path, so your knowledge base grows without manual `mem_add` calls.

## Start in 3 Steps

```bash
uv tool install memtomem-stm                             # 1. install
mms init --mcp claude                                    # 2. register upstream + Claude Code (one step)
mms health                                               # 3. verify connectivity
```

`mms init` prompts for an upstream server and then registers `memtomem-stm` with your MCP client of choice (`--mcp claude`, `--mcp json`, or `--mcp skip`). Full setup walkthrough in [Quick Start](/guides/quickstart/).

## Core Capabilities

- **Proactive Surfacing** — Every tool call runs candidate memories through 5 relevance checks (context extraction → query suitability → LTM search → score threshold → dedup window) before anything is injected. See [Proactive Surfacing](/stm/surfacing/).
- **Response Compression** — 10 strategies pick themselves based on content type (JSON, Markdown, API docs, free text, …) to shrink payloads while keeping meaning. See [Compression Strategies](/stm/compression/).
- **Auto-Indexing** — Tool responses are indexed into LTM off the request path, so a searchable knowledge base builds up without extra agent calls.

## How It Works

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM runs every MCP tool call through a 4-stage pipeline:

1. **CLEAN** — normalize the request (strip noise, unify format)
2. **COMPRESS** — shrink the response (auto-select from 10 strategies)
3. **SURFACE** — pull relevant memories from LTM and inject them (5-level gating)
4. **INDEX** — accumulate the interaction into LTM for future recall

## Relationship to LTM

STM and LTM are **independent packages** — no Python dependency between them. They communicate only via MCP protocol, and each can be deployed and upgraded separately.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **Role** | Persistent storage & search | Real-time proxy & compression |
| **Required?** | Yes (core) | Optional |
| **Communication** | Direct MCP server | MCP proxy → queries LTM |

## Package Info

| | |
|---|---|
| **PyPI** | [`memtomem-stm`](https://pypi.org/project/memtomem-stm/) |
| **CLI** | `mms` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## Next Steps

- [Quick Start](/guides/quickstart/) — from install to agent connection
- [Proactive Surfacing](/stm/surfacing/) — 5-level gating and feedback auto-tuning
- [Compression Strategies](/stm/compression/) — 10 strategies and auto-selection logic
- [Context Gateway](/ltm/context-gateway/) — Cross-runtime sync (LTM feature)
- [MCP Tools](/stm/mcp-tools/) — STM management tools
- [CLI Reference](/stm/cli/) — `mms` command reference
