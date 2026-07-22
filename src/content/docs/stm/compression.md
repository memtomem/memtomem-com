---
title: Compression Strategies
description: 10 compression strategies, auto-selection logic, and query-aware budget allocation.
---

> New here? Start with the [STM Overview](/stm/overview/) to see the full pipeline in context first.

Every MCP tool response routed through STM passes through its compression gate before it reaches your agent. Direct upstream calls bypass STM. When a routed response exceeds its configured budget, STM compresses it — and the method depends on the content type.

memtomem-stm automatically compresses MCP tool responses by content type to save tokens. It ships 10 strategies in total — 8 content-type reducers plus the `auto` selector and the `none` passthrough — reducing response size while preserving the information the agent needs. If you're not sure which to pick, leave the setting on `auto` — it chooses the right reducer per response from the immediate-response strategies.

## Compression Strategies

| Strategy | Target content | Behavior |
|---|---|---|
| **truncate** | Small text | Length-limited truncation (default fallback) |
| **hybrid** | Markdown | Preserve structure + abbreviate non-essential sections |
| **selective** | Large structured data | Two-phase TOC first, then retrieve selected sections on demand |
| **progressive** | Large content | Cursor-based sequential delivery (zero information loss) |
| **extract_fields** | JSON dictionaries | Preserve top-level shape with representative nested values |
| **schema_pruning** | JSON arrays | Recursive schema-preserving sampling |
| **skeleton** | API docs | Preserve headings and first content lines |
| **llm_summary** | Complex text | LLM-based summarization (OpenAI/Anthropic/Ollama) — timeout-bound (default 60s) |
| **auto** | All types | Analyze content and auto-select optimal strategy |
| **none** | — | Pass through original without compression |

## Auto-Selection Logic

The `auto` strategy (default) analyzes content to pick the optimal strategy:

| Content type | Selected strategy |
|---|---|
| Already within budget | `none` |
| Large JSON array, or dict containing large arrays | `schema_pruning` |
| Nested JSON dictionary | `extract_fields` |
| API docs with HTTP endpoints | `skeleton` |
| Large structured Markdown / code-heavy text | `hybrid` |
| Other text or simple JSON | `truncate` |

`selective`, `progressive`, and `llm_summary` are opt-in only. `auto` never chooses them because they change the interaction pattern or add external latency.

## Query-Aware Budget Allocation

During compression, the agent's current query is taken into account — relevant sections receive a larger token budget. The `selective` / `hybrid` / `schema_pruning` / `skeleton` strategies also rank table-of-contents entries by BM25 relevance to the active query. The deterministic BM25 score used here is recorded by selection telemetry for offline analysis (see [Configuration](/reference/configuration/)).

Budgets can be expressed as `max_result_chars` or `max_result_tokens`. Token budgets use `chars_per_token` plus `token_estimation_mode` (`static` or Unicode-aware `unicode`), while `consumer_model` and `context_budget_ratio` can cap a result against the receiving model's context window. Per-upstream and per-tool values override proxy defaults.

## JSON Safety

JSON-aware tiers re-serialize strict JSON after compression. Non-finite values such as `NaN`, `Infinity`, and `-Infinity` are mapped to `null` before JSON output so downstream parsers do not receive Python extension tokens. The JSON tiers degrade monotonically as budgets shrink. The documented exception is standalone `selective`: it shrinks per-entry previews first, but a zero-preview TOC envelope can still exceed budget at very high section counts because dropping entries would break the selection contract.

## Zero Information Loss: Progressive Delivery

The `progressive` strategy delivers large content without any information loss:

1. First response delivers a table of contents (TOC) and the first chunk
2. Agent calls `stm_proxy_read_more(key, offset)` → cursor-based delivery of subsequent chunks
3. Full content can be inspected sequentially

Every progressive chunk ends with the canonical footer `\n---\n[progressive: chars=<n>]` — agents must split on the full `PROGRESSIVE_FOOTER_TOKEN` string (exported from `memtomem_stm.proxy.progressive`). Splitting on `\n---\n` alone silently drops bytes when content contains Markdown horizontal rules or YAML fences.

Per-response follow-up rate and coverage for progressive delivery — along with degradation to passthrough when the primary store fails — are reported by the `stm_progressive_stats` tool (see [MCP Tools](/stm/mcp-tools/)).

The response cache uses schema 4 and preserves the canonical MCP envelope, including `content`, `structuredContent`, and `_meta`. An incompatible older cache is reset once instead of mixing envelope versions.

## Fallback Ladder

The retention floor (`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, default `0.65`) guards against over-compression. When an output drops below the floor, a 3-tier fallback activates automatically:

```
progressive → hybrid → truncate
```

Each tier checks the floor — if satisfied, that strategy's output is used. The char budget is raised to `len(response) * min_result_retention` before truncation when per-tool `max_result_chars` would otherwise drop more than the floor allows.

The `llm_summary` strategy has its own **timeout guard**: the `llm_timeout_seconds` field (default `60`s) on the per-server / per-tool `llm` block. A slow or stuck LLM endpoint no longer blocks the proxy — on timeout, STM falls back to `truncate` so the agent still receives a bounded response.

## Compression Budget Tuning

Agent feedback automatically adjusts per-tool compression budgets:

- Agent reports **information loss** → Increase preservation ratio for that tool
- Agent reports **response too long** → Decrease preservation ratio

This feedback loop is driven by the `stm_compression_feedback` tool; accumulated feedback and per-tool adjustments are visible via `stm_compression_stats` (see [MCP Tools](/stm/mcp-tools/)).
