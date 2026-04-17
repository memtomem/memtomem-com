---
title: MCP Tools
description: STM proxy exposes 10 control tools for stats, cache, surfacing, compression, and progressive delivery.
---

In addition to transparently proxying every upstream MCP tool, memtomem-stm exposes **10 control tools** that let the agent inspect and steer the proxy.

## Proxy stats & control

### `stm_proxy_stats`

Token savings, cache hits, per-tool call history.

No parameters.

### `stm_proxy_health`

Upstream connectivity and circuit breaker state.

No parameters.

### `stm_proxy_cache_clear`

Clear the response cache.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `server` | string | No | Scope to one upstream server |
| `tool` | string | No | Scope to one tool |

### `stm_proxy_select_chunks`

Pick specific sections from a `selective` / `hybrid` TOC returned by an earlier call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | TOC key from the previous response |
| `sections` | string[] | Yes | Section ids to expand |

### `stm_proxy_read_more`

Read the next chunk of a `progressive` response.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `key` | string | Yes | Progressive response key |
| `offset` | integer | Yes | Byte offset to resume from |
| `limit` | integer | No | Chars to return this turn |

> Agents should split on the canonical `PROGRESSIVE_FOOTER_TOKEN` (`\n---\n[progressive: chars=`) rather than `\n---\n` alone — the latter collides with Markdown HR / YAML fences.

## Surfacing feedback

### `stm_surfacing_feedback`

Rate surfaced memories so the auto-tuner can adjust thresholds.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `surfacing_id` | string | Yes | Id from the surfacing footer |
| `rating` | string | Yes | `helpful` / `not_relevant` / `already_known` |
| `memory_id` | string | No | Specific memory the feedback refers to |

### `stm_surfacing_stats`

Aggregated surfacing metrics and feedback distribution.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool` | string | No | Filter by tool name |

## Compression feedback

### `stm_compression_feedback`

Report missing information that compression dropped.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `server` | string | Yes | Upstream server |
| `tool` | string | Yes | Tool name |
| `missing` | string | Yes | What the agent needed but didn't get |
| `kind` | string | No | Category hint |
| `trace_id` | string | No | Langfuse trace id if available |

### `stm_compression_stats`

Compression feedback counts per tool.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool` | string | No | Filter by tool name |

### `stm_tuning_recommendations`

Per-tool auto-tuner recommendations derived from recent feedback.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `since_hours` | integer | No | Time window |
| `tool` | string | No | Filter by tool name |

## Proxied upstream tools

Every tool from a registered upstream MCP server is proxied through STM using the pattern `{prefix}__{tool}`. For example:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem's read_file becomes fs__read_file
```

When the agent calls `fs__read_file`, the proxy runs the pipeline: **CLEAN → COMPRESS → SURFACE → INDEX**, then returns the compressed response plus any surfaced memories.

> See [Proactive Surfacing](/stm/surfacing/) and [Compression Strategies](/stm/compression/) for mechanism details.
