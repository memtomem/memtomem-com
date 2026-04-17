---
title: Compression Strategies
description: 10 compression strategies, auto-selection logic, and query-aware budget allocation.
---

memtomem-stm automatically compresses MCP tool responses by content type to save tokens. It provides 10 strategies that reduce response size while preserving the information the agent needs.

## 10 Compression Strategies

| Strategy | Target content | Behavior |
|---|---|---|
| **truncate** | Small text | Length-limited truncation (default fallback) |
| **hybrid** | Markdown | Preserve structure + abbreviate non-essential sections |
| **selective** | General text | Keep only query-relevant portions |
| **progressive** | Large content | Cursor-based sequential delivery (zero information loss) |
| **extract_fields** | JSON dictionaries | Extract key fields only |
| **schema_pruning** | JSON arrays | Preserve schema + reduce samples |
| **skeleton** | API docs | Preserve structural skeleton only |
| **llm_summary** | Complex text | LLM-based summarization (Ollama/OpenAI) |
| **auto** | All types | Analyze content and auto-select optimal strategy |
| **none** | — | Pass through original without compression |

## Auto-Selection Logic

The `auto` strategy (default) analyzes content to pick the optimal strategy:

| Content type | Selected strategy |
|---|---|
| JSON dictionary | `extract_fields` |
| Large JSON array | `schema_pruning` |
| Markdown document | `hybrid` |
| API documentation | `skeleton` |
| Small text (< threshold) | `truncate` |
| Other large text | `selective` |

## Query-Aware Budget Allocation

During compression, the agent's current query is taken into account — relevant sections receive a larger token budget. For example, when compressing API documentation while the agent is asking about "authentication module," auth-related endpoints get more space.

## Zero Information Loss: Progressive Delivery

The `progressive` strategy delivers large content without any information loss:

1. First response delivers a table of contents (TOC) and the first chunk
2. Agent calls `stm_proxy_read_more(key, offset)` → cursor-based delivery of subsequent chunks
3. Full content can be inspected sequentially

Every progressive chunk ends with the canonical footer `\n---\n[progressive: chars=<n>]` — agents must split on the full `PROGRESSIVE_FOOTER_TOKEN` string (exported from `memtomem_stm.proxy.progressive`). Splitting on `\n---\n` alone silently drops bytes when content contains Markdown horizontal rules or YAML fences.

**F6 (unreleased):** When `MEMTOMEM_STM_SURFACING__INJECTION_MODE` is `append` or `section`, Stage 3 SURFACE now also runs on progressive continuations. `prepend` (the default) keeps its existing behavior of skipping surfacing on progressive responses.

## Fallback Ladder

The retention floor (`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, default `0.65`) guards against over-compression. When an output drops below the floor, a 3-tier fallback activates automatically:

```
progressive → hybrid → truncate
```

Each tier checks the floor — if satisfied, that strategy's output is used. The char budget is raised to `len(response) * min_result_retention` before truncation when per-tool `max_result_chars` would otherwise drop more than the floor allows.

## Compression Budget Tuning

Agent feedback automatically adjusts per-tool compression budgets:

- Agent reports **information loss** → Increase preservation ratio for that tool
- Agent reports **response too long** → Decrease preservation ratio
