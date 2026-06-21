---
title: MCP Tools
description: STM proxy exposes 13 control tools for stats, cache, surfacing, compression, progressive delivery, and selection telemetry.
---

When you want to see how much the proxy is saving, clear a stale cache, or tune what gets surfaced, memtomem-stm exposes **control tools** over MCP. Alongside proxying upstream MCP tools, it provides **13** such tools; the table below is the source of truth for how they split and when each is advertised.

## Advertising observability tools

Of the 13 tools, 4 are **model-facing** and advertised by default; the remaining 9 are **observability / admin** tools that are hidden from the MCP tool list by default to free up agent context. Set the env var `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true` in your MCP client config to advertise them — they remain callable from Python tests / direct code paths either way.

| Category | Always advertised | Advertised when flag on |
|---|---|---|
| **Model-facing (4)** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **Observability / admin (9)** | — | `stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_index_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations` |

## Proxy stats & control

### `stm_proxy_stats`

Token savings, cache hits, per-tool call history.

No parameters. *(Observability — advertised only when `advertise_observability_tools=true`.)*

### `stm_proxy_health`

Upstream connectivity and proxy health. For each upstream it reports both how many tools were **discovered** and how many were actually **advertised**, so when the eligibility filter withholds some tools the gap is visible at a glance. It also shows the surfacing circuit-breaker state and, if the external tool-graph eligibility provider is enabled, its status.

No parameters. *(Observability.)*

### `stm_proxy_cache_clear`

Clear the response cache.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `server` | string | No | Scope to one upstream server |
| `tool` | string | No | Scope to one tool |

*(Observability.)*

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
| `offset` | integer | No | Character offset to resume from (default `0`) |
| `limit` | integer | No | Chars to return this turn |

> Agents should split on the canonical `PROGRESSIVE_FOOTER_TOKEN` (`\n---\n[progressive: chars=`) rather than `\n---\n` alone — the latter collides with Markdown HR / YAML fences.

## Surfacing feedback

### `stm_surfacing_feedback`

Rate surfaced memories so the auto-tuner can adjust thresholds. Each surfaced memory carries its own `memory_id`, so you can rate them one at a time; a memory marked `not_relevant` or `already_known` is invalidated — only that memory — on the next surfacing call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `surfacing_id` | string | Yes | Id from the surfacing footer |
| `rating` | string | No | `helpful` / `partially_helpful` / `not_relevant` / `already_known` (single-rating path) |
| `memory_id` | string | No | Specific memory the single-rating feedback refers to |
| `ratings` | object[] | No | Batched per-memory feedback, each with `memory_id` and `rating` (mutually exclusive with the single-rating fields) |

### `stm_surfacing_stats`

Aggregated surfacing metrics and feedback distribution. Reports `events_total`, `distinct_tools`, `total_feedback`, per-tool breakdown, rating distribution, helpfulness %, and a configurable recent tail.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool` | string | No | Filter by upstream tool name |
| `since` | string | No | ISO-8601 timestamp (e.g. `2026-04-20T00:00:00`) — restricts to events at or after this moment |
| `limit` | integer | No | Tail size for the `Recent` section (default `10`; `0` hides it) |

*(Observability.)*

## Selection stats

### `stm_selection_stats`

Summarizes tool-selection and execution telemetry. Set `proxy.selection_telemetry.enabled = true` and the proxy records a JSONL log; this tool reads it back into event counts, selections by ranker version, selections by server and tool, execution ok/error with latency percentiles, and the eligibility hard-filter reject-reason tally. It also shows this process's write-path counters (events written / sampled out / redaction drops / write errors). Only the active log is aggregated; rotated backups are noted but not parsed.

No parameters. *(Observability — advertised only when `advertise_observability_tools=true`.)*

## Index stats

### `stm_index_stats`

STM-driven LTM write statistics across both INDEX paths — `auto_index_response` (verbatim response → markdown chunk) and `extract_and_store` (response → LLM-extracted facts → markdown chunks). It mirrors `stm_surfacing_stats` for the write side, but INDEX intentionally has no quality signal, so operators only see `attempts` (per-path counts) and the `outcomes` distribution (`stored` / `error` / `privacy_skip` / `dedup_skip` / `extracted_zero_facts`).

> In the standalone `mms` server the INDEX write path is inert by design (#288). Enabling `auto_index` in `stm_proxy.json` does not write back to LTM from the standalone server; these counters exist for library integrations and future server wiring.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool` | string | No | Filter by upstream tool name — the `__total__` aggregate row is always included |

*(Observability.)*

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

*(Observability.)*

## Progressive delivery stats

### `stm_progressive_stats`

Per-response follow-up rate and coverage across all progressive-compressed calls. Each initial chunk and each follow-up `stm_proxy_read_more` appears as a row in `progressive_reads`; aggregates collapse per cache key, so a response with five follow-ups is weighted the same as one with none. Reports total reads, total responses, follow-up rate, avg chars served, avg total chars, avg coverage, and a per-tool breakdown. It also reports how often the primary `PROGRESSIVE` store path failed and degraded to an uncached full-content passthrough, so a failing backing store does not go silent.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tool` | string | No | Filter by upstream tool name |

*(Observability — advertised only when `advertise_observability_tools=true`.)*

### `stm_tuning_recommendations`

Per-tool auto-tuner recommendations derived from recent feedback.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `since_hours` | number | No | Time window (default `24.0`) |
| `tool` | string | No | Filter by tool name |

*(Observability.)*

## Proxied upstream tools

Tools from a registered upstream MCP server are proxied through STM using the pattern `{prefix}__{tool}`. For example:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem's read_file becomes fs__read_file
```

STM does not advertise every upstream tool 1:1 — it applies an eligibility filter at exposure time. Tools from a disconnected server, tools whose metadata contains credential-looking strings, and tools with colliding names are not advertised to the agent; the discovered-vs-advertised counts in `stm_proxy_health` make the difference visible.

Proxied tool **titles** — the `annotations.title` field rendered by MCP tool-picker UIs (e.g. Claude Code's `/mcp`) — are automatically prefixed with `[{server}]` for attribution: a `filesystem` server's `Read file` tool appears as `[filesystem] Read file`. This is separate from the `{prefix}__{tool}` name used when calling the tool, and applies only when the upstream tool provides an `annotations.title`.

When the agent calls `fs__read_file`, the proxy runs the active pipeline: **CLEAN → COMPRESS → SURFACE**, with **INDEX** available only when an index engine is wired. It returns the compressed response plus any surfaced memories.

> See [Proactive Surfacing](/stm/surfacing/) and [Compression Strategies](/stm/compression/) for mechanism details.
