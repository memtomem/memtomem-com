---
title: Overview
description: What memtomem-stm is — an MCP proxy that adds proactive surfacing and compression for AI agents.
---

## What is memtomem-stm?

memtomem-stm is a **short-term memory (STM) proxy** that sits between your AI agent and your existing MCP servers. Without any agent-side code changes, it adds **response compression**, **proactive memory injection**, and **exposed-tool curation** to every tool call — typically cutting token use by 20–80%.

## Use It When

- **MCP tool responses keep blowing your context window** — filesystem or GitHub MCP servers often return 8,000-token payloads. STM compresses them to ~2,000 with a strategy picked for the content type.
- **You want memories auto-injected without the agent having to ask** — with LTM alone, the agent has to call `mem_search`. With STM in front, relevant memories ride along with every tool response, no explicit query needed.
- **You want to curate the tool list your agent sees** — STM drops unresponsive servers, credential-leaking descriptions, and duplicate-named tools from the advertised list at exposure time.
- **You want to try the proxy without committing** — STM imports your existing MCP servers and proxies them in front, and the move is reversible. `mms eject` restores an imported server to its original host config, returning you to the pre-STM state.

## Start in 3 Steps

```bash
uv tool install memtomem-stm                             # 1. install
mms init --mcp claude                                    # 2. register upstream + Claude Code (one step)
mms health                                               # 3. verify connectivity
```

`mms init` prompts for an upstream server and then registers `memtomem-stm` with your MCP client of choice (`--mcp claude`, `--mcp json`, or `--mcp skip`). Full setup walkthrough in [Quick Start](/guides/quickstart/).

## Core Capabilities

- **Proactive Surfacing** — Every tool call runs candidate memories through 5 relevance checks (context extraction → query suitability → LTM search → score threshold → dedup window) before anything is injected. Surfacing toggles per upstream (`mms surfacing <server> on|off`), so you can exclude a single server's responses from surfacing. See [Proactive Surfacing](/stm/surfacing/).
- **Response Compression** — 10 strategies, auto-selected by content type (JSON, Markdown, API docs, free text, …), with query-aware ranking and safer JSON output tiers. See [Compression Strategies](/stm/compression/).
- **Exposed-Tool Curation** — STM does not just relay every upstream tool as-is; it curates the advertised tool list at exposure time. Tools from unresponsive servers, descriptions that leak credentials, and duplicate or overflowing names are withheld from the agent. Tune the policy with `exposure.profile` (`strict` default / `review` / `explore`); `stm_proxy_health` reports "N discovered / M advertised".
- **Reversible Import** — Imported upstreams record their origin, so `mms list` distinguishes directly-registered servers from imported ones in an ORIGIN column (`*` marks a pruned host original). `mms eject` verifies the restore before it removes the STM entry.

## How It Works

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM runs every MCP tool call through this pipeline:

1. **CLEAN** — normalize the request (strip noise, unify format)
2. **COMPRESS** — shrink the response (auto-select from 10 strategies)
3. **SURFACE** — pull relevant memories from LTM and inject them (5-level gating)

STM does not write memories back to LTM at runtime. Surfacing only reads from LTM, and the INDEX (auto-accumulation) stage is inert by design in the standalone `mms` server.

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
| **Latest release** | `0.1.32` |
| **CLI** | `mms` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## Next Steps

- [Quick Start](/guides/quickstart/) — from install to agent connection
- [Proactive Surfacing](/stm/surfacing/) — 5-level gating and feedback auto-tuning
- [Compression Strategies](/stm/compression/) — 10 strategies and auto-selection logic
- [MCP Tools](/stm/mcp-tools/) — STM management and observability tools
- [CLI Reference](/stm/cli/) — `mms` command reference
