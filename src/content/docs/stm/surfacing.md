---
title: Proactive Surfacing
description: Real-time surfacing per tool call, 5-level relevance gating, feedback-based auto-tuning.
---

> New here? Start with the [STM Overview](/stm/overview/) to see the full pipeline in context first.

Traditional RAG only provides relevant information when the agent explicitly requests a search. memtomem-stm's proactive surfacing observes every tool call the agent makes, figures out what it's working on, and **automatically** injects matching memories from LTM into the response — no explicit query needed.

## How It Works

When an agent calls an MCP tool, the STM proxy runs this pipeline:

```
Tool call → Context extraction → LTM search → Relevance gating → Inject into response
```

No agent code changes needed — just routing through the STM proxy enables automatic memory injection for all MCP communication.

## 5-Level Context Extraction

STM needs a search query before it can ask LTM for memories. Instead of relying on a single signal, it runs a five-pass pipeline — each pass tries a different source, and the first one that produces a usable query wins. That way a tool call with a clean `_context_query` argument is used directly, while a bare call like `fs__read_file(path=...)` still produces something searchable.

| Priority | Method | Description |
|---|---|---|
| 1 | Tool-specific query template | Pre-defined query patterns mapped to tool names |
| 2 | `_context_query` argument | Explicit search query passed by the agent |
| 3 | Path arguments | Context extracted from file paths, URLs, etc. |
| 4 | Semantic keys | Keyword combination drawn from tool argument values |
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
| `prepend` (default) | Memories prepended as a header. Skips Stage 3 on progressive continuations. |
| `append` | Memories appended below the response. Triggers surfacing on progressive continuations (F6). |
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
- **not_relevant** → Raise `min_score` (stricter filtering)
- **already_known** → Expand deduplication window

## Safety Mechanisms

- **Circuit breaker** (3-state) — Suspends surfacing after consecutive failures, retries on backoff `1s → 2s → 4s → 30s max`
- **Surfacing timeout** — `3s` hard ceiling per call
- **Rate limit** — `15 calls / minute` ceiling across all tools
- **Write-tool skip** — Disables surfacing for tools with side effects (file writes, deletes)
- **Query cooldown** — Skips surfacing when the extracted query has Jaccard similarity `> 0.95` with one seen in the last 5 seconds
- **Cross-session dedup** — Default TTL `604800s` (7 days) via `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS`
- **Sensitive data detection** — Auto-detects API keys, passwords, PII before injection
- **Injection size cap** — Default `3000 chars` per injection

A `trace_id` is threaded through the surfacing and progressive-delivery path so follow-up reads correlate with the initial chunk in Langfuse (or any OpenTelemetry-style tracer).
