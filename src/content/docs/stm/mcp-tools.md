---
title: MCP Tools
description: STM proxy exposes 5 model-facing tools, an stm_admin dispatcher carrying 8 observability actions, and an opt-in formation tool.
---

When you want to see how much the proxy is saving, clear a stale cache, or tune what gets surfaced, memtomem-stm exposes **control tools** over MCP. Alongside proxying upstream MCP tools, it provides **5** model-facing tools, the `stm_admin` dispatcher, and the opt-in `stm_memory_propose` formation tool.

## Advertising observability tools

The five model-facing tools are advertised by default. The observability and admin functions are not separate tools: they are **eight actions on a single `stm_admin` dispatcher**, and that dispatcher is hidden from the MCP list until `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true`. Set `MEMTOMEM_STM_FORMATION__ENABLED=true` separately to advertise `stm_memory_propose`. That flag alone controls advertisement; whether the upstream LTM supports review-first proposals is checked at call time — an incompatible core returns `{"ok": false, "reason": "formation_unsupported"}`.

| Category | Advertised by default | Advertised when its flag is on |
|---|---|---|
| **Model-facing (5)** | `stm_proxy_select_chunks`, `stm_proxy_read_more`, `stm_proxy_describe_tool`, `stm_surfacing_feedback`, `stm_compression_feedback` | — |
| **Observability / admin (1 tool, 8 actions)** | — | `stm_admin` (`MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS`) |
| **Formation (opt-in)** | — | `stm_memory_propose` (`MEMTOMEM_STM_FORMATION__ENABLED`) |

## Working with a compressed response

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

### `stm_proxy_describe_tool`

Read bounded pages of a registered tool's full metadata, without executing the upstream tool. This is the recovery path when a host's description limit truncated what the agent was told about a tool. Pass STM's `{prefix}__{tool}` name **without** any host-added `mcp__server__` prefix.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | STM's `{prefix}__{tool}` name |
| `part` | string | No | `description` (default; the effective instructions, respecting overrides), `input_schema`, or `upstream_description` |
| `offset` | integer | No | Character offset to resume from (default `0`) |
| `limit` | integer | No | Chars per page, 1–16000 (default `4000`) |
| `generation` | string | No | Continuation token from the previous page |

Every page carries `text`, `format`, `total_chars`, `generation` and `next_offset`. Continue with the same `name`, `part` and `generation`, passing `next_offset` as the next `offset`; a null `next_offset` means the read is complete, and a changed `generation` means the metadata moved — restart at offset `0` without `generation`. Choose `input_schema` explicitly to recover argument descriptions and examples: concatenate the pages' `text`, then parse the JSON. The `limit` is a ceiling, not a promise — the 16384-byte whole-result budget can shorten a page.

`upstream_description` returns the text a `description_override` replaced, and is available only when the operator set `MEMTOMEM_STM_PROXY__RECOVER_UPSTREAM_DESCRIPTION=true` and configured an override. It is off by default: an override exists to decide what the model is told, so handing the original text back would undo it for exactly the reader it was written for.

## Feedback

### `stm_surfacing_feedback`

Rate surfaced memories so the auto-tuner can adjust thresholds. Each surfaced memory carries its own `memory_id`, so you can rate them one at a time; a memory marked `not_relevant` or `already_known` is invalidated — only that memory — on the next surfacing call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `surfacing_id` | string | Yes | Id from the surfacing footer |
| `rating` | string | No | `helpful` / `partially_helpful` / `not_relevant` / `already_known` (single-rating path) |
| `memory_id` | string | No | Specific memory the single-rating feedback refers to |
| `ratings` | object[] | No | Batched per-memory feedback, each with `memory_id` and `rating` (mutually exclusive with the single-rating fields) |

### `stm_compression_feedback`

Report missing information that compression dropped. This is a learning signal, not a repair: it does not restore the current turn. Reports accumulate for `stm_admin(action="compression_stats")`.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `server` | string | Yes | Upstream server |
| `tool` | string | Yes | Tool name |
| `missing` | string | Yes | What the agent needed but didn't get |
| `kind` | string | No | Category hint |
| `trace_id` | string | No | Langfuse trace id if available |

## Observability and admin — `stm_admin`

The eight observability functions used to be eight separate MCP tools. They are now actions on one dispatcher, so an operator who turns observability on pays one tool slot in the agent's catalogue instead of eight.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action` | string | Yes | Action name, or `help` to list every action's parameters |
| `params` | object | No | Arguments for the action, e.g. `{"tool": "mem_search"}` |

The CLI equivalents are `mms stats`, `mms health` and `mms tune`.

| Action | Parameters | What it reports |
|---|---|---|
| `proxy_stats` | — | Token savings, cache hits, per-tool call history |
| `proxy_health` | — | Upstream connectivity and proxy health. For each upstream it reports how many tools were **discovered** and how many were actually **advertised**, so a gap opened by the eligibility filter is visible at a glance. Also shows the surfacing circuit-breaker state, and the external tool-graph eligibility provider's status when that is enabled. |
| `proxy_cache_clear` | `server`, `tool` | Clears caches. An unfiltered call flushes both the SQLite response cache and the in-memory surfacing cache; a filtered call (`server` and/or `tool`) reaches only the response cache, because the surfacing cache is keyed by query hash and has no server/tool axis. The startup-only tool-graph consult cache is not touched. |
| `surfacing_stats` | `tool`, `since`, `limit` | `events_total`, `distinct_tools`, `total_feedback`, per-tool breakdown, rating distribution, helpfulness %, and a configurable recent tail. `since` is an ISO-8601 timestamp; `limit` defaults to `10` and `0` hides the tail. |
| `selection_stats` | — | Tool-selection and execution telemetry. Requires `proxy.selection_telemetry.enabled = true`, which makes the proxy write a JSONL log; the action reads it back into event counts, selections by ranker version, selections by server and tool, execution ok/error with latency percentiles, and the eligibility hard-filter reject-reason tally. It also shows this process's write-path counters (events written / sampled out / redaction drops / write errors). Only the active log is aggregated; rotated backups are noted but not parsed. |
| `compression_stats` | `tool` | Compression feedback counts per tool |
| `progressive_stats` | `tool` | Per-response follow-up rate and coverage across progressive-compressed calls. Each initial chunk and each follow-up `stm_proxy_read_more` is a row in `progressive_reads`; aggregates collapse per cache key, so a response with five follow-ups weighs the same as one with none. Reports total reads, total responses, follow-up rate, avg chars served, avg total chars, avg coverage, and a per-tool breakdown — plus how often the primary `PROGRESSIVE` store path failed and degraded to an uncached full-content passthrough, so a failing backing store does not go silent. |
| `tuning_recommendations` | `since_hours`, `tool` | Per-tool auto-tuner recommendations from recent feedback. `since_hours` defaults to `24.0`. |

## Proxied upstream tools

Tools from a registered upstream MCP server are proxied through STM using the pattern `{prefix}__{tool}`. For example:

```bash
mms add filesystem --command npx \
  --args "-y @modelcontextprotocol/server-filesystem ~/projects" \
  --prefix fs
# filesystem's read_file becomes fs__read_file
```

STM does not advertise every upstream tool 1:1 — it applies an eligibility filter at exposure time. Tools from a disconnected server, tools whose metadata contains credential-looking strings, and tools with colliding names are not advertised to the agent; the discovered-vs-advertised counts in `stm_admin(action="proxy_health")` make the difference visible.

Proxied tool **titles** — the `annotations.title` field rendered by MCP tool-picker UIs (e.g. Claude Code's `/mcp`) — are automatically prefixed with `[{server}]` for attribution: a `filesystem` server's `Read file` tool appears as `[filesystem] Read file`. This is separate from the `{prefix}__{tool}` name used when calling the tool, and applies only when the upstream tool provides an `annotations.title`.

When the agent calls `fs__read_file`, the bundled proxy runs **CLEAN → COMPRESS → SURFACE**. It returns the compressed response plus any surfaced memories and does not write the response back into LTM.

> See [Proactive Surfacing](/stm/surfacing/) and [Compression Strategies](/stm/compression/) for mechanism details.
