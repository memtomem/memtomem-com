---
title: MCP Tools
description: STM management tools for monitoring proxy status, cache, compression, and surfacing.
---

In addition to transparently proxying all upstream MCP tools, memtomem-stm exposes **6 management tools** for monitoring and controlling proxy behavior.

## Management Tools

### `stm_status`

Check STM proxy status and connected upstream servers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

Returns proxy uptime, number of connected upstream servers, and memory usage.

### `stm_cache_stats`

View response cache statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

Returns hit rate, cache size, and per-tool cache usage.

### `stm_cache_clear`

Clear the response cache.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool_name` | string | No | Clear cache for a specific tool only |

When called without parameters, clears the entire cache.

### `stm_compression_stats`

View per-strategy compression statistics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

Returns compression ratio, invocation count, and average latency for each of the 10 strategies.

### `stm_surfacing_stats`

View surfacing statistics including hit rate and feedback metrics.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | No parameters |

Returns surfacing hit rate, relevant/irrelevant ratio, current `min_score` threshold, and feedback counts.

### `stm_feedback`

Submit quality feedback on surfacing or compression results. Feedback is used to auto-tune surfacing thresholds via the feedback loop.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | `helpful`, `not_relevant`, or `already_known` |
| `tool_name` | string | No | The tool call this feedback relates to |
| `details` | string | No | Additional context |

## Proxied Upstream Tools

All tools from registered upstream MCP servers are transparently proxied through STM. When an agent calls an upstream tool:

1. STM intercepts the request
2. Surfaces relevant memories from LTM alongside the call
3. Forwards the call to the upstream server
4. Compresses the response if it exceeds the context budget
5. Returns the compressed response + surfaced memories to the agent

Upstream tools can optionally be prefixed to avoid name collisions. Configure prefixes when registering servers:

```bash
mms add filesystem --command filesystem-server --prefix fs_
# Upstream tool "read_file" becomes "fs_read_file"
```

> See the [Proactive Surfacing](/stm/surfacing/) and [Compression Strategies](/stm/compression/) docs for details on how these mechanisms work.
