---
title: Compression Strategies
description: 10 compression strategies, auto-selection logic, and query-aware budget allocation.
---

> New here? Start with the [STM Overview](/stm/overview/) to see the full pipeline in context first.

Every MCP tool response passes through STM before it reaches your agent. When a response exceeds the agent's context budget, STM compresses it — and the compression method depends on the content type.

memtomem-stm automatically compresses MCP tool responses by content type to save tokens. It provides 10 strategies that reduce response size while preserving the information the agent needs. If you're not sure which to pick, leave the setting on `auto` — it chooses per response from the immediate-response strategies.

## 10 Compression Strategies

| Strategy | Target content | Behavior |
|---|---|---|
| **truncate** | Small text | Length-limited truncation (default fallback) |
| **hybrid** | Markdown | Preserve structure + abbreviate non-essential sections |
| **selective** | Large structured data | Two-phase TOC first, then retrieve selected sections on demand |
| **progressive** | Large content | Cursor-based sequential delivery (zero information loss) |
| **extract_fields** | JSON dictionaries | Preserve top-level shape with representative nested values |
| **schema_pruning** | JSON arrays | Recursive schema-preserving sampling |
| **skeleton** | API docs | Preserve headings and first content lines |
| **llm_summary** | Complex text | LLM-based summarization (Ollama/OpenAI) — timeout-bound (default 60s), falls back to `truncate` on timeout |
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

During compression, the agent's current query is taken into account — relevant sections receive a larger token budget. In v0.1.24, SELECTIVE / Hybrid / SCHEMA_PRUNING / SKELETON rank table-of-contents entries by relevance to the active query.

## JSON Safety

JSON-aware tiers re-serialize strict JSON after compression. Non-finite values such as `NaN`, `Infinity`, and `-Infinity` are mapped to `null` before JSON output so downstream parsers do not receive Python extension tokens. The JSON tiers degrade monotonically as budgets shrink. The documented exception is standalone SELECTIVE: it shrinks per-entry previews first, but a zero-preview TOC envelope can still exceed budget at very high section counts because dropping entries would break the selection contract.

## Zero Information Loss: Progressive Delivery

The `progressive` strategy delivers large content without any information loss:

1. First response delivers a table of contents (TOC) and the first chunk
2. Agent calls `stm_proxy_read_more(key, offset)` → cursor-based delivery of subsequent chunks
3. Full content can be inspected sequentially

Every progressive chunk ends with the canonical footer `\n---\n[progressive: chars=<n>]` — agents must split on the full `PROGRESSIVE_FOOTER_TOKEN` string (exported from `memtomem_stm.proxy.progressive`). Splitting on `\n---\n` alone silently drops bytes when content contains Markdown horizontal rules or YAML fences.

## Fallback Ladder

The retention floor (`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, default `0.65`) guards against over-compression. When an output drops below the floor, a 3-tier fallback activates automatically:

```
progressive → hybrid → truncate
```

Each tier checks the floor — if satisfied, that strategy's output is used. The char budget is raised to `len(response) * min_result_retention` before truncation when per-tool `max_result_chars` would otherwise drop more than the floor allows.

The `llm_summary` strategy has its own **timeout guard**: `compression.llm.llm_timeout_seconds` (default `60`, env var `MEMTOMEM_STM_PROXY__COMPRESSION__LLM_TIMEOUT_SECONDS`). A slow or stuck LLM endpoint no longer blocks the proxy — on timeout, STM falls back to `truncate` so the agent still receives a bounded response.

## Compression Budget Tuning

Agent feedback automatically adjusts per-tool compression budgets:

- Agent reports **information loss** → Increase preservation ratio for that tool
- Agent reports **response too long** → Decrease preservation ratio
