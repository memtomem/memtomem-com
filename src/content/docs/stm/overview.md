---
title: STM Overview
description: What memtomem-stm is — an MCP proxy that adds proactive surfacing and compression for AI agents.
---

## What is memtomem-stm?

memtomem-stm is a **short-term memory (STM) proxy** that sits between your AI agent and your existing MCP servers. Without agent-side code changes, it adds **response compression**, **proactive memory injection**, and **exposed-tool curation** to calls routed through the proxy. Token savings depend on response shape, chosen budgets, and workload.

## Use It When

- **MCP tool responses keep blowing your context window** — STM applies content-aware character or token budgets to routed filesystem, GitHub, and other MCP responses.
- **You want memories auto-injected without the agent having to ask** — with LTM alone, the agent calls a search tool. With STM in front, eligible routed responses can carry relevant memories without a separate agent query.
- **You want to curate the tool list your agent sees** — STM drops unresponsive servers, credential-leaking descriptions, and duplicate-named tools from the advertised list at exposure time.
- **You want to try the proxy without committing** — STM imports your existing MCP servers and proxies them in front, and the move is reversible. `mms eject` restores an imported server to its original host config, returning you to the pre-STM state.

## Start in 3 Steps

```bash
uv tool install memtomem-stm                             # 1. install
mms init --demo --client auto                            # 2. create a runnable demo + register a detected client
mms doctor                                               # 3. diagnose the complete setup
```

`mms init --demo` creates a deterministic demo upstream. `--client auto` registers a supported detected host; use `mms register --client claude`, `--client codex`, or `--client auto` later to change registration. The completed call, metrics, prune, and rollback workflow is in [Add STM to an MCP Server](/stm/first-proxy/).

## Core Capabilities

- **Proactive Surfacing** — Every tool call runs candidate memories through 5 relevance checks (context extraction → query suitability → LTM search → score threshold → dedup window) before anything is injected. Surfacing toggles per upstream (`mms surfacing <server> on|off`), so you can exclude a single server's responses from surfacing. See [Proactive Surfacing](/stm/surfacing/).
- **Response Compression** — 10 strategies, auto-selected by content type (JSON, Markdown, API docs, free text, …), with query-aware ranking and safer JSON output tiers. See [Compression Strategies](/stm/compression/).
- **Exposed-Tool Curation** — STM does not just relay every upstream tool as-is; it curates the advertised tool list at exposure time. Tools from unresponsive servers, descriptions that leak credentials, and duplicate or overflowing names are withheld from the agent. A tool whose name falls outside the MCP tool-name grammar (`[A-Za-z0-9._-]`, 1–128 characters) is not proxied at all. Tune the policy with `exposure.profile` (`strict` default / `review` / `explore`); `stm_admin(action="proxy_health")` reports "N discovered / M advertised".
- **Reversible Import** — Imported upstreams record their origin, so `mms list` distinguishes directly-registered servers from imported ones in an ORIGIN column (`*` marks a pruned host original). `mms eject` verifies the restore before it removes the STM entry.

## How It Works

<figure class="flow-diagram">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 430" role="img" aria-labelledby="stm-flow-title stm-flow-desc">
<title id="stm-flow-title">How a tool call passes through memtomem-stm</title>
<desc id="stm-flow-desc">The AI agent sends a tool call to the memtomem-stm proxy, which forwards it to the upstream MCP server. A text response usually comes back through three stages: CLEAN, COMPRESS, and SURFACE; the responses described after the list skip COMPRESS and SURFACE. SURFACE searches memtomem (LTM) and adds the memories that pass its relevance checks, if any. The agent receives the response with those memories.</desc>
<defs><marker id="stm-flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-head" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<rect class="fd-box" x="90" y="16" width="300" height="56" rx="8"/>
<text class="fd-title" x="240" y="40" text-anchor="middle">AI agent</text>
<text class="fd-note" x="240" y="60" text-anchor="middle">Claude Code · Codex CLI · any MCP client</text>
<path class="fd-arrow" d="M 135 72 V 120" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="145" y="100">tool call</text>
<path class="fd-arrow" d="M 345 160 V 74" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="335" y="94" text-anchor="end">response</text>
<text class="fd-label" x="335" y="110" text-anchor="end">+ memories, if relevant</text>
<rect class="fd-proxy" x="20" y="122" width="440" height="188" rx="10"/>
<text class="fd-title" x="36" y="148">memtomem-stm</text>
<text class="fd-note" x="36" y="167">optional proxy</text>
<text class="fd-label" x="36" y="232">forwards the call</text>
<rect class="fd-stage" x="250" y="160" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="181" text-anchor="middle">SURFACE</text>
<rect class="fd-stage" x="250" y="208" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="229" text-anchor="middle">COMPRESS</text>
<rect class="fd-stage" x="250" y="256" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="277" text-anchor="middle">CLEAN</text>
<path class="fd-arrow" d="M 335 256 V 242" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 335 208 V 194" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 135 310 V 348" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 200 350 V 272 H 248" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="208" y="334">response</text>
<path class="fd-arrow" d="M 440 350 V 176 H 422" marker-start="url(#stm-flow-head)" marker-end="url(#stm-flow-head)"/>
<rect class="fd-box" x="20" y="350" width="210" height="64" rx="8"/>
<text class="fd-title" x="125" y="376" text-anchor="middle">Upstream MCP servers</text>
<text class="fd-note" x="125" y="396" text-anchor="middle">filesystem, GitHub, …</text>
<rect class="fd-mem" x="270" y="350" width="190" height="64" rx="8"/>
<text class="fd-title" x="365" y="376" text-anchor="middle">memtomem (LTM)</text>
<text class="fd-note" x="365" y="396" text-anchor="middle">search over MCP</text>
</svg>
<figcaption>The usual path for a text response. Some responses skip COMPRESS and SURFACE, as described below.</figcaption>
</figure>

STM runs every MCP tool call through this pipeline:

1. **CLEAN** — clean the upstream response (strip noise, unify format)
2. **COMPRESS** — shrink the response (auto-select from 10 strategies)
3. **SURFACE** — pull relevant memories from LTM and inject them (5-level gating)

A successful response with more than one text block, where any text block carries `annotations` or `_meta`, is cleaned per block and cut to its budget instead, without COMPRESS or SURFACE. Under the experimental structured delivery, so is any successful response that carries upstream `structuredContent` or non-text content; see [Compression Strategies](/stm/compression/).

The bundled `mms` runtime does not write memories back to LTM. Its active response pipeline is **CLEAN → COMPRESS → SURFACE**, and surfacing reads from LTM over MCP.

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
| **Latest release** | `0.7.8` |
| **CLI** | `mms` |
| **License** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## Limits and retry safety

The default `proxy.max_upstream_bytes` limit is 40 MiB (41,943,040 bytes) of decoded compact JSON, including metadata, non-text blocks and error content. It is not a wire-byte or peak-memory guarantee.

A timed-out or disconnected call can have executed upstream. Retrying an ambiguous failure requires a replay-safe policy and remaining retry/deadline budget; an unannotated tool is not automatically safe. Restarting a session does not roll back side effects. Shutdown watchdog and parent-liveness settings are listed in the [configuration reference](/stm/configuration/).

## Next Steps

- [Add STM to an MCP Server](/stm/first-proxy/) — demo, real proxied call, metrics, and rollback
- [Proactive Surfacing](/stm/surfacing/) — 5-level gating and feedback auto-tuning
- [Compression Strategies](/stm/compression/) — 10 strategies and auto-selection logic
- [MCP Tools](/stm/mcp-tools/) — STM management and observability tools
- [CLI Reference](/stm/cli/) — `mms` command reference
