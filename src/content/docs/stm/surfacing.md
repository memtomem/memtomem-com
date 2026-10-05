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

No agent code changes are needed, but the call must pass through STM or a supported host hook. Direct calls to an upstream MCP server bypass STM. For Claude Code built-in tools, install `mms hook` as a host hook; it uses a warm local daemon by default so repeated hook calls do not pay LTM cold-start cost.

| Call surface | Surfacing path |
|---|---|
| MCP server routed through `memtomem-stm` | Proxy response injection |
| Supported Claude Code `PostToolUse` event | `mms hook` → `additionalContext` |
| Direct upstream MCP call | Not surfaced |
| Provider-native memory outside these paths | Not read or indexed automatically |

## 5-Level Context Extraction

STM needs a search query before it can ask LTM for memories. Instead of relying on a single signal, it runs a five-pass pipeline — each pass tries a different source, and the first one that produces a usable query wins. That way a tool call with a clean `_context_query` argument is used directly, while a bare call like `fs__read_file(path=...)` still yields a usable search query.

| Priority | Method | Description |
|---|---|---|
| 1 | Tool-specific query template | Pre-defined query patterns mapped to tool names |
| 2 | `_context_query` argument | Explicit search query passed by the agent |
| 3 | Path arguments | Dedicated tokenization for `path` / `file` / `filepath` / `file_path` / `filename` keys (split on separators, drop extensions) |
| 4 | Semantic keys | Keyword combination from `query` / `search` / `url` / `description` and similar argument values |
| 5 | Tool name | Last resort — use the tool name itself as the query |

`_context_query` is accepted by the proxy, but it is added to advertised upstream schemas only when `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY=true`. The default is `false`, so ordinary agents are not asked to synthesize this private hint.

## Relevance Gating

Once a query is extracted, surfaced memories are filtered further to ensure usefulness (context extraction already happened in the [step above](#5-level-context-extraction)):

1. **LTM search** — Hybrid search for candidate memories. To keep latency low, surfacing asks the core to skip its rerank stage by default (`MEMTOMEM_STM_SURFACING__RERANK=false`). `true` asks for the core's configured reranker, and `none` sends no request and leaves the decision to the core's own configuration. The value is sent only to cores that advertise per-call rerank support; older cores follow their own configuration.
2. **Score filtering** — Remove results below `min_score`, a threshold on the RRF scale. With `scale_gated_min_score=true` (default), the global or auto-tuned `min_score` is not applied to a batch whose core-reported `score_scale` is a recognized non-RRF scale, such as reranker scores, because an RRF threshold has no meaning on that scale; the number of retrieved memories is still capped by `max_results`. A per-tool `context_tools.<tool>.min_score` always applies. A missing or unrecognized `score_scale` keeps the filter. Scores themselves are never rescaled.
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

Each memory in the surfaced block shows a relevance bucket — `[weak]` / `[related]` / `[strong]` — instead of a raw provider-dependent score. Buckets split a `[min_score, top]` band into thirds. For results stamped `rrf`, the top is `sum(rrf_weights) / (rrf_k + 1)`, computed from the `runtime_profile` of the Core session that served the search. It falls back to the `2/61` baseline (about 0.033) when the profile is missing, invalid or not a two-leg (BM25 + dense) fusion, or when an older daemon omits the stamp. Results without a `score_scale` stamp (compact format, older cores), or with a label STM does not recognize, keep the `[min_score, 1.0]` band. A result stamped with a known non-RRF scale, such as reranker logits, gets no bucket label, because no band is meaningful for it. Each memory also exposes its own `memory_id` (a backticked token), so the agent can rate a whole event or rate individual memories one at a time:

- Whole event: `stm_surfacing_feedback(surfacing_id=..., rating="helpful")`
- Specific memories: `stm_surfacing_feedback(surfacing_id=..., ratings=[{"memory_id": ..., "rating": "not_relevant"}])`

When an agent evaluates surfacing quality, the auto-tuner continuously optimizes per-tool relevance thresholds:

- **helpful** → Maintain or lower `min_score` for that tool
- **partially_helpful** → Count as neutral evidence
- **not_relevant** → Raise `min_score` (stricter filtering)
- **already_known** → Count as negative feedback and feed local demotion / dedup behavior

Raises are capped at `min(auto_tune_score_ceiling, max(batch reference, min_score))`, so a configured `min_score` above the batch reference is kept, never lowered. The batch reference is rounded down to the precision Core sends scores at:

- `rrf` results: their `score_ceiling` stamp (or `2/61` without a valid one) at 4 places (`2/61` → `0.0327`).
- Results without a `score_scale`, or with a label STM does not recognize: `2/61` at 2 places (`0.03`).
- An empty batch, or a recognized non-RRF scale: no extra cap.

Stored adjustments are not rewritten: a tool already tuned above the cap filters at the cap from its next search on, while `stm_surfacing_stats` keeps showing the stored value. This applies to the proxy, and to the daemon when `hook.record_feedback_events` is on.

Rating an individual memory `not_relevant` or `already_known` invalidates exactly that memory on the next cache hit, excluding only those memories from injection rather than the whole event.

## Scoping Surfacing per Upstream

Surfacing applies to every upstream by default, but you can durably turn it off (or back on) for a single upstream. This is useful for a third-party server whose calls never match LTM memories (pure wasted latency), or a sensitive upstream whose request context should never become an LTM query:

```bash
mms surfacing <server>          # show current state
mms surfacing <server> off      # disable surfacing for this upstream
mms surfacing <server> on       # re-enable
```

The setting is written as a per-upstream `surfacing_enabled` flag (default `true`) in the shared proxy config (`stm_proxy.json`), so every MCP client that proxies through this `mms` sees the same scope. A running proxy hot-reloads it without a restart, and `mms list` shows the effective state in its SURFACING column. A disabled upstream's calls are skipped before the LTM search and counted as a healthy skip (`upstream_disabled`) in `stm_admin(action="surfacing_stats")`.

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
- **Opportunity log** — Engines with a feedback tracker (the daemon, and the proxy with `feedback_enabled`) write one `surfacing_opportunities` row per call that entered surfacing: how it ended, the shape of the arguments (their number, a path's depth and, for a common file type, its extension) and a digest of the extracted query. No argument key or value is stored. Rows are about 320 bytes and are deleted with `stats_retention_days`; opt out with `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED=false`, or keep a share with `opportunities_sample_rate` (calls that drew a holdout arm are always kept)
- **Call identifiers** — The hook passes the host's `session_id`, `cwd`, `tool_use_id` and `agent_id` to the daemon and never logs them. `surfacing_events` rows store `tool_use_id`, `host_session_id` and `host_agent_id`; `cwd` is never stored. Delivered memories are recorded only as keyed hashes of their source path and preview text, with a per-install key
- **Holdout** — With `holdout_rate` above its default `0.0`, eligible injections on Claude Code hook calls through the daemon are withheld at random to measure their effect. A withheld call returns the tool response unchanged and is only recorded; the proxy path never withholds

## LTM Transport

STM talks to LTM over MCP. The default transport spawns `memtomem-server` over stdio, and it can also connect to long-running LTM services over `sse` or `streamable_http`:

```bash
export MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT=streamable_http
export MEMTOMEM_STM_SURFACING__LTM_MCP_URL=https://ltm.example/mcp
export MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS='{"Authorization":"Bearer ..."}'
```

LTM responses are consumed by the surfacing engine and bypass the proxy compression/cache pipeline.

A `trace_id` is threaded through the surfacing and progressive-delivery path so follow-up reads correlate with the initial chunk in Langfuse (or any OpenTelemetry-style tracer).

## Eligibility and observability

The automatic length gate uses the cleaned source before compression: by default, fewer than 5,000 characters skips surfacing. An explicit `_context_query` bypasses that length gate only, not disabled surfacing, relevance thresholds, or backend availability. The query parameter itself requires schema opt-in.

Observability tools are hidden by default. Set `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS=true` in the child MCP process environment and reconnect. Persistent aggregate statistics do not prove that per-call traces were exported; Langfuse and OTLP are separate opt-in sinks.
