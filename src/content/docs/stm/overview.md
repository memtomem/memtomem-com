---
title: Overview
description: What memtomem-stm is — an MCP proxy that adds proactive surfacing and compression for AI agents.
---

## What is memtomem-stm?

memtomem-stm is a **short-term memory (STM) proxy** that sits between your AI agent and your existing MCP servers. Without any agent-side code changes, it adds **response compression** and **proactive memory injection** to every tool call — typically cutting token use by 20–80%.

The current PyPI release is **memtomem-stm v0.1.24**. It adds `mms hook` for Claude Code native-tool surfacing, a warm local daemon for hook calls, network LTM MCP transport, query-aware compression, relevance buckets, richer feedback, and query-text privacy controls.

## Use It When

- **MCP tool responses keep blowing your context window** — filesystem or GitHub MCP servers often return 8,000-token payloads. STM compresses them to ~2,000 with a strategy picked for the content type.
- **You want memories auto-injected without the agent having to ask** — with LTM alone, the agent has to call `mem_search`. With STM in front, relevant memories ride along with every tool response, no explicit query needed.
- **You want Claude Code native-tool context to see memories too** — `mms hook` can add `additionalContext` for read-like PostToolUse events, using a daemon-warmed LTM connection by default.

## Start in 3 Steps

```bash
uv tool install memtomem-stm                             # 1. install
mms init --mcp claude                                    # 2. register upstream + Claude Code (one step)
mms health                                               # 3. verify connectivity
```

`mms init` prompts for an upstream server and then registers `memtomem-stm` with your MCP client of choice (`--mcp claude`, `--mcp json`, or `--mcp skip`). Full setup walkthrough in [Quick Start](/guides/quickstart/).

## Core Capabilities

- **Proactive Surfacing** — Every tool call runs candidate memories through 5 relevance checks (context extraction → query suitability → LTM search → score threshold → dedup window) before anything is injected. See [Proactive Surfacing](/stm/surfacing/).
- **Response Compression** — 10 strategies pick themselves based on content type (JSON, Markdown, API docs, free text, …), with query-aware ranking and safer JSON output tiers. See [Compression Strategies](/stm/compression/).
- **Hook + Daemon Path** — `mms hook` bridges supported host PostToolUse payloads into STM surfacing, while `mms daemon` keeps the LTM session warm so hook calls avoid repeated cold starts.
- **Optional INDEX hooks** — Stage 4 config exists for library integrations, but the standalone `mms` server does not wire an index engine yet; `auto_index` and extraction are inert there until the MCP-only adapter lands.

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
4. **INDEX** — optional write-back hook for future LTM accumulation; inert in the standalone `mms` server today

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
| **Latest release** | `0.1.24` |
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
