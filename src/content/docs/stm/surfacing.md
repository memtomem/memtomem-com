---
title: Proactive Surfacing
description: Real-time surfacing per tool call, 5-level relevance gating, feedback-based auto-tuning.
---

> New here? Start with the [STM Overview](/stm/overview/) to see the full pipeline in context first.

Traditional RAG only provides relevant information when the agent explicitly requests a search. memtomem-stm's proactive surfacing observes proxied MCP calls, figures out what the agent is working on, and **automatically** injects matching memories from LTM into the response — no explicit query needed. In v0.1.24, `mms hook` extends this surfacing path to supported Claude Code native-tool `PostToolUse` events as `additionalContext`.

## How It Works

When an agent calls an MCP tool, the STM proxy runs this pipeline:

```
Tool call → Context extraction → LTM search → Relevance gating → Inject into response
```

No agent code changes needed — routing through the STM proxy enables automatic memory injection for MCP communication. For Claude Code built-in tools, install `mms hook` as a host hook; it uses a warm local daemon by default so repeated hook calls do not pay LTM cold-start cost.

## 5-Level Context Extraction

STM needs a search query before it can ask LTM for memories. Instead of relying on a single signal, it runs a five-pass pipeline — each pass tries a different source, and the first one that produces a usable query wins. That way a tool call with a clean `_context_query` argument is used directly, while a bare call like `fs__read_file(path=...)` still produces something searchable.

| Priority | Method | Description |
|---|---|---|
| 1 | Tool-specific query template | Pre-defined query patterns mapped to tool names |
| 2 | `_context_query` argument | Explicit search query passed by the agent |
| 3 | Path arguments | Dedicated tokenization for `path` / `file` / `filepath` / `file_path` / `filename` keys (split on separators, drop extensions) |
| 4 | Semantic keys | Keyword combination from `query` / `search` / `url` / `description` and similar argument values |
| 5 | Tool name | Last resort — use the tool name itself as the query |

## Relevance Gating

Surfaced memories are filtered through 5 stages to ensure usefulness:

1. **Context extraction** — Can a meaningful query be generated from the tool call?
2. **Relevance assessment** — Is the extracted query suitable for memory search?
3. **LTM search** — Hybrid search for candidate memories
4. **Score filtering** — Remove results below the `min_score` threshold
5. **Deduplication** — In-session + cross-session (7-day) duplicate prevention

## Injection Modes

How surfaced memories are stitched into the response is controlled by `MEMTOMEM_STM_SURFACING__INJECTION_MODE`:

| Mode | Behavior |
|---|---|
| `append` (default) | Memories appended below the response. Preserves progressive-delivery offsets and works on eligible continuation paths. |
| `prepend` | Memories prepended as a header. Skipped on progressive delivery because it would shift `stm_proxy_read_more` offsets. |
| `section` | Memories placed in a dedicated section. Triggers surfacing on progressive continuations (F6). |

## Model-Aware Defaults

Automatically scales based on the agent's context window size:

| Context window | Compression | Injection size | Result count |
|---|---|---|---|
| ≤ 32K | High compression | Small | Few |
| 32K – 200K | Default | Medium | Default |
| > 200K | Low compression | Large | Many |

## Feedback Loop

When an agent evaluates surfacing quality, the auto-tuner continuously optimizes per-tool relevance thresholds:

- **helpful** → Maintain or lower `min_score` for that tool
- **partially_helpful** → Count as neutral evidence
- **not_relevant** → Raise `min_score` (stricter filtering)
- **already_known** → Count as negative feedback and feed local demotion / dedup behavior

## Safety Mechanisms

- **Circuit breaker** (3-state: closed / open / half-open) — Opens after `circuit_max_failures` consecutive failures (default `3`) and transitions to half-open after `circuit_reset_seconds` (default `60s`)
- **Surfacing timeout** — `3s` hard ceiling per call
- **Rate limit** — `15 calls / minute` ceiling across all tools
- **Write-tool skip** — Disables surfacing for tools with side effects (file writes, deletes)
- **Query cooldown** — Skips surfacing when the extracted query has Jaccard similarity `> 0.95` with one seen in the last 5 seconds
- **Cross-session dedup** — Default TTL `604800s` (7 days) via `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS`
- **Injection size cap** — Default `3000 chars` per injection
- **Local feedback demotion** — Memories repeatedly rated `not_relevant` or `already_known` are filtered before injection once they cross `feedback_demotion_negative_threshold` (default `3` distinct events)
- **Query-text privacy** — `query_retention_days` clears persisted raw query text after 30 days by default, and `persist_query_text=false` stores a `sha256:` digest instead of the raw query

## LTM Transport

STM talks to LTM over MCP. The default transport spawns `memtomem-server` over stdio, and v0.1.24 also supports long-running LTM services over `sse` or `streamable_http`:

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM responses are consumed by the surfacing engine and bypass the proxy compression/cache pipeline.

## Scoping Surfacing

Surfacing can be scoped or disabled to prevent noise on specific tools:

- **Per-client env exclude** — Set `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS` (e.g. `'["context7__*","langfuse-docs__*"]'`) to exclude matching tool-names from surfacing.
- **Shared proxy-config exclude** — Turn off surfacing for a registered upstream in `stm_proxy.json` using the CLI:
  ```bash
  mms surfacing <server> off
  ```
  This is client-independent, persists across restarts, hot-reloads, and skips LTM searches entirely.

A `trace_id` is threaded through the surfacing and progressive-delivery path so follow-up reads correlate with the initial chunk in Langfuse (or any OpenTelemetry-style tracer).
