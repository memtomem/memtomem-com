---
title: Proactive Surfacing
description: Real-time surfacing per tool call, relevance gating, feedback-based auto-tuning.
---

Traditional RAG only provides relevant information when the agent explicitly requests a search. memtomem-stm's proactive surfacing observes proxied MCP calls, infers the current working context, and **automatically** injects matching memories from LTM into the response — no explicit query needed. `mms hook` extends this surfacing path to supported Claude Code native-tool `PostToolUse` events as `additionalContext`.

## How It Works

When an agent calls an MCP tool, the STM proxy runs this pipeline:

```
Tool call → Context extraction → LTM search → Relevance gating → Inject into response
```

No agent code changes needed — routing through the STM proxy enables automatic memory injection for MCP communication. For Claude Code built-in tools, install `mms hook` as a host hook; it uses a warm local daemon by default so repeated hook calls do not pay LTM cold-start cost.

## 5-Level Context Extraction

STM needs a search query before it can ask LTM for memories. Instead of relying on a single signal, it runs a five-pass pipeline — each pass tries a different source, and the first one that produces a usable query wins. That way a tool call with a clean `_context_query` argument is used directly, while a bare call like `fs__read_file(path=...)` still yields a usable search query.

| Priority | Method | Description |
|---|---|---|
| 1 | Tool-specific query template | Pre-defined query patterns mapped to tool names |
| 2 | `_context_query` argument | Explicit search query passed by the agent |
| 3 | Path arguments | Dedicated tokenization for `path` / `file` / `filepath` / `file_path` / `filename` keys (split on separators, drop extensions) |
| 4 | Semantic keys | Keyword combination from `query` / `search` / `url` / `description` and similar argument values |
| 5 | Tool name | Last resort — use the tool name itself as the query |

## Relevance Gating

Once a query is extracted, surfaced memories are filtered further to ensure usefulness (context extraction already happened in the [step above](#5-level-context-extraction)):

1. **LTM search** — Hybrid search for candidate memories
2. **Score filtering** — Remove results below the `min_score` threshold
3. **Deduplication** — In-session + cross-session (7-day) duplicate prevention

## Injection Modes

How surfaced memories are stitched into the response is controlled by `MEMTOMEM_STM_SURFACING__INJECTION_MODE`. Progressive delivery splits a large response into chunks, with follow-up `stm_proxy_read_more` calls relying on continuing offsets:

| Mode | Behavior |
|---|---|
| `append` (default) | Memories appended below the response. Preserves progressive-delivery offsets and works on the continuing read path. |
| `prepend` | Memories prepended as a header. Skipped on progressive delivery because it would shift `stm_proxy_read_more` offsets. |
| `section` | Memories placed in a dedicated section. Triggers surfacing on progressive continuations. |

## Model-Aware Defaults

Automatically scales based on the agent's context window size:

| Context window | Compression | Injection size | Result count |
|---|---|---|---|
| ≤ 32K | High compression | Small | Few |
| 32K – 200K | Default | Medium | Default |
| > 200K | Low compression | Large | Many |

## Feedback Loop

Each memory in the surfaced block shows a relevance bucket — `[weak]` / `[related]` / `[strong]` — instead of a raw score, computed across the range between the active `min_score` threshold and 1.0. Each memory also exposes its own `memory_id` (a backticked token), so the agent can rate a whole event or rate individual memories one at a time:

- Whole event: `stm_surfacing_feedback(surfacing_id=..., rating="helpful")`
- Specific memories: `stm_surfacing_feedback(surfacing_id=..., ratings=[{"memory_id": ..., "rating": "not_relevant"}])`

When an agent evaluates surfacing quality, the auto-tuner continuously optimizes per-tool relevance thresholds:

- **helpful** → Maintain or lower `min_score` for that tool
- **partially_helpful** → Count as neutral evidence
- **not_relevant** → Raise `min_score` (stricter filtering)
- **already_known** → Count as negative feedback and feed local demotion / dedup behavior

Rating an individual memory `not_relevant` or `already_known` invalidates exactly that memory on the next cache hit, excluding only those memories from injection rather than the whole event.

## Scoping Surfacing per Upstream

Surfacing applies to every upstream by default, but you can durably turn it off (or back on) for a single upstream. This is useful for a third-party server whose calls never match LTM memories (pure wasted latency), or a sensitive upstream whose request context should never become an LTM query:

```bash
mms surfacing <server>          # show current state
mms surfacing <server> off      # disable surfacing for this upstream
mms surfacing <server> on       # re-enable
```

The setting is written as a per-upstream `surfacing_enabled` flag (default `true`) in the shared proxy config (`stm_proxy.json`), so every MCP client that proxies through this `mms` sees the same scope. A running proxy hot-reloads it without a restart, and `mms status` shows the effective state. A disabled upstream's calls are skipped before the LTM search and counted as a healthy skip (`upstream_disabled`) in `stm_surfacing_stats`.

For tool-grained or cross-server glob scope, set `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS` (matches the `server__tool` pattern).

## Safety Mechanisms

Surfacing runs under the following safeguards for resilience and privacy:

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

STM talks to LTM over MCP. The default transport spawns `memtomem-server` over stdio, and it can also connect to long-running LTM services over `sse` or `streamable_http`:

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM responses are consumed by the surfacing engine and bypass the proxy compression/cache pipeline.

A `trace_id` is threaded through the surfacing and progressive-delivery path so follow-up reads correlate with the initial chunk in Langfuse (or any OpenTelemetry-style tracer).
