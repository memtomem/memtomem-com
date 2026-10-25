---
title: STM Environment Variables
description: Configuration reference for memtomem-stm (STM) environment variables.
---

memtomem-stm (STM) uses [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) with `env_prefix` + `env_nested_delimiter="__"`. **Nested settings use double underscore** — `MEMTOMEM_STM_PROXY__CACHE__ENABLED`, not `MEMTOMEM_STM_PROXY_CACHE_ENABLED`.

Resolution order (highest priority first): CLI flags → environment variables → config file → built-in defaults.

This public reference tracks the complete `memtomem-stm` 0.6.9 configuration surface. Options are intentionally mirrored here rather than reduced to a curated subset. LTM settings (prefix `MEMTOMEM_`) are listed in [LTM Environment Variables](/ltm/configuration/).

## STM (memtomem-stm) — prefix `MEMTOMEM_STM_`

STM settings are organized into root fields plus `PROXY__*`, `SURFACING__*`, `FORMATION__*`, `HOOK__*`, `DAEMON__*`, and `LANGFUSE__*`. Compression, caching, metrics, auto-indexing, and extraction all live **under `PROXY__`**.

`~/.memtomem/stm_proxy.json` loads `ProxyConfig` only. Root, surfacing, formation, hook, daemon, and Langfuse settings are environment/default-only; placing those blocks in the JSON file has no effect. `proxy.consumer_model` propagation into surfacing budget resolution is the documented exception.

### General

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_DATA_DIR` | Daemon handshake, ownership lock, and detached log directory | `"~/.memtomem"` |
| `MEMTOMEM_STM_LOG_LEVEL` | Log level | `"WARNING"` |
| `MEMTOMEM_STM_LOG_FILE` | Optional rotating log file; files use `0600`, 2 MiB rotation, and three backups | `null` |
| `MEMTOMEM_STM_LOG_DEPENDENCIES` | Let records below WARNING from loggers outside `memtomem_stm` (the MCP SDK, `httpx`, `httpcore`, `urllib3` and others) through to the server and daemon logs. Off by default because those lines carry upstream URLs with their query strings, the MCP session id, response headers, and whole MCP messages including tool arguments and results. Read at startup. | `false` |
| `MEMTOMEM_STM_LOG_EXCEPTION_TEXT` | Render logged tracebacks with their exception messages in the server and daemon logs. By default STM logs the frames and each exception's class and code and replaces the message with `[message withheld]`, because an upstream, the LTM server or an LLM provider writes that text and can quote a URL query, a tool argument or part of a header in it. Read at startup. | `false` |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | When `true`, advertises the `stm_admin` dispatcher and its eight observability/admin actions (`proxy_stats`, `proxy_cache_clear`, `proxy_health`, `surfacing_stats`, `selection_stats`, `compression_stats`, `progressive_stats`, `tuning_recommendations`). The five model-facing tools remain visible when false. | `false` |
| `MEMTOMEM_STM_FORMATION__ENABLED` | Advertise the opt-in `stm_memory_propose` tool. This flag alone controls advertisement; upstream LTM support for review-first proposals is checked at call time (an incompatible core returns `formation_unsupported`). | `false` |
| `MEMTOMEM_STM_FORMATION__MAX_CONTENT_CHARS` | Maximum review-first candidate content size; larger proposals are rejected | `2000` |

### Proxy

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__ENABLED` | Master switch for the proxy pipeline | `false` |
| `MEMTOMEM_STM_PROXY__CONFIG_PATH` | Proxy JSON configuration path | `"~/.memtomem/stm_proxy.json"` |
| `MEMTOMEM_STM_PROXY__UPSTREAM_SERVERS` | Complete upstream-server map as a JSON object; the file-backed form is usually easier to maintain | `{}` |
| `MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION` | Default compression strategy | `"auto"` |
| `MEMTOMEM_STM_PROXY__DEFAULT_MAX_RESULT_CHARS` | Per-response char budget | `16000` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_CHARS` | OOM guard on upstream response size | `10000000` |
| `MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION` | Retention floor (0.0–1.0) | `0.65` |
| `MEMTOMEM_STM_PROXY__MAX_DESCRIPTION_CHARS` | Cap on the client-visible tool description, `[proxied] ` prefix included. The effective budget for an upstream is `min(server, global)`, so raising this alone does not widen a stricter per-server value. | `4000` |
| `MEMTOMEM_STM_PROXY__STRIP_SCHEMA_DESCRIPTIONS` | Remove nested JSON-schema descriptions from advertised tools | `false` |
| `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY` | Advertise the optional `_context_query` argument used for relevance scoring | `false` |
| `MEMTOMEM_STM_PROXY__HOST_DESCRIPTION_CAP` | Explicit host description limit, proxy prefix and hints included. Unset means unknown, so no host limit is inferred. Applied at the next advertisement; restart to apply it reliably. | `null` |
| `MEMTOMEM_STM_PROXY__RECOVER_UPSTREAM_DESCRIPTION` | Also return the text a `description_override` replaced. Off by default, because recovery hands the overridden upstream text back to the one reader the override was written for. | `false` |
| `MEMTOMEM_STM_PROXY__CONSUMER_MODEL` | Client model identifier used to resolve its context-window budget | `""` |
| `MEMTOMEM_STM_PROXY__CONTEXT_BUDGET_RATIO` | Fraction of the consumer context window available to a proxied result | `0.05` |
| `MEMTOMEM_STM_PROXY__CHARS_PER_TOKEN` | Static character-to-token estimate used for token budgets | `3.5` |
| `MEMTOMEM_STM_PROXY__TOKEN_ESTIMATION_MODE` | Token estimate mode: `static` or Unicode-aware `unicode` | `"static"` |

### Proxy → Cache

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | Enable response caching | `true` |
| `MEMTOMEM_STM_PROXY__CACHE__DEFAULT_TTL_SECONDS` | Cache TTL | `3600` |
| `MEMTOMEM_STM_PROXY__CACHE__DB_PATH` | Cache DB location | `"~/.memtomem/proxy_cache.db"` |
| `MEMTOMEM_STM_PROXY__CACHE__MAX_ENTRIES` | Cache eviction ceiling | `10000` |
| `MEMTOMEM_STM_PROXY__CACHE__TOOL_ANNOTATION_POLICY` | How MCP tool annotations affect caching: `conservative`, `strict`, or `ignore` | `"conservative"` |

Cache schema 6 stores the canonical MCP content envelope, including `structuredContent` and `_meta`. On an incompatible older schema, STM performs its documented one-time cache reset rather than serving a mixed envelope.

### Proxy → Auto-Index (Stage 4)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__ENABLED` | Index tool responses into LTM | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | Run indexing in the background, off the request path | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | Minimum response size to index | `2000` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | Output directory | `"~/.memtomem/proxy_index"` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | Namespace for auto-indexed memories | `"proxy-{server}"` |

The bundled `mms` server reads from LTM but, by design, does not write back to it. These `auto_index` and extraction fields are therefore accepted as valid config but have no effect on its behavior.

### Proxy → Extraction

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (fact extraction) | `false` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__STRATEGY` | Extraction strategy: `none`, `llm`, `heuristic`, or `hybrid`. An LLM reply is parsed only as a whole JSON fact array (a markdown fence is stripped); a reply wrapped in prose, an empty one, or an array whose entries are all malformed falls back to heuristic extraction | `"llm"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PROVIDER` | Extraction LLM provider: `openai`, `anthropic`, or `ollama` | `openai` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MODEL` | Extraction LLM model | `gpt-4.1-mini` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__API_KEY` | Extraction LLM API key | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__BASE_URL` | Extraction LLM endpoint override | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__SYSTEM_PROMPT` | Extraction system-prompt template | built-in template |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MAX_TOKENS` | Extraction LLM output-token cap | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__LLM_TIMEOUT_SECONDS` | Extraction LLM timeout | `60.0` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PRIVACY_SCAN_ENABLED` | Scan content before sending it to a remote extraction LLM | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_FACTS` | Maximum extracted facts per response | `10` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MIN_RESPONSE_CHARS` | Minimum response size eligible for extraction | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__DEDUP_THRESHOLD` | Extracted-fact similarity threshold | `0.92` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MEMORY_DIR` | Extracted-fact output directory | `"~/.memtomem/extracted_facts"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__NAMESPACE` | Extracted-fact namespace template | `"facts-{server}"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__BACKGROUND` | Run extraction outside the request path | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_INPUT_CHARS` | Maximum response text considered for extraction | `20000` |

### Proxy → Metrics / feedback / relevance scorer

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | Record call metrics | `true` |
| `MEMTOMEM_STM_PROXY__METRICS__DB_PATH` | Proxy metrics SQLite path | `"~/.memtomem/proxy_metrics.db"` |
| `MEMTOMEM_STM_PROXY__METRICS__MAX_HISTORY` | Maximum retained metrics rows | `10000` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | Scorer backend | `"bm25"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_PROVIDER` | Embedding provider for semantic relevance scoring | `"ollama"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_MODEL` | Relevance embedding model | `"nomic-embed-text"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_BASE_URL` | Relevance embedding endpoint | `"http://localhost:11434"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_TIMEOUT` | Relevance embedding request timeout | `10` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | Persist `stm_compression_feedback` | `true` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__DB_PATH` | Compression feedback SQLite path | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__RETENTION_DAYS` | Compression feedback retention | `90` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | Record progressive-delivery read telemetry (surfaces via `stm_admin(action="progressive_stats")`) | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__DB_PATH` | Progressive-read telemetry SQLite path | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__RETENTION_DAYS` | Progressive-read telemetry retention | `90` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | Internal lock-acquisition ceiling; a timeout signals a deadlock/stuck holder rather than a slow upstream | `30` |

### Proxy → Tool exposure

An STM-native filter that decides, at tool-advertisement time, which of an upstream's tools the agent gets to see. Tools that fail consistently, carry credentials, or duplicate another tool's name are kept out of the advertised list. Health signals are evaluated once at proxy startup, so the advertised set stays stable for the session.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXPOSURE__PROFILE` | `strict` (signal rules hard-reject) / `review` (demote in ranking instead of rejecting, recorded in telemetry) / `explore` (signal rules off) | `"strict"` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_WINDOW_HOURS` | Look-back window over the metrics store for per-tool health | `24` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_MIN_CALLS` | Minimum calls in the window before health is judged; below this a tool is presumed healthy | `5` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_ERROR_RATE_THRESHOLD` | Upstream-attributable error rate at or above which a tool is flagged unhealthy | `0.95` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__REVIEW_RISK_PENALTY` | Ranking-demotion multiplier applied to signal-flagged tools under the `review` profile | `0.5` |

### Proxy → Selection telemetry / Tool relevance

Records one selection + execution entry per proxied call as JSONL, and BM25-ranks the advertised tool set against the call's query signal. Ranking is recorded into telemetry only — it never changes exposure.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__ENABLED` | Enable per-call selection/execution JSONL records | `false` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__PATH` | JSONL log path | `"~/.memtomem/stm_selection_log.jsonl"` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__SAMPLE_RATE` | 0.0–1.0. Fraction of calls recorded | `1` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BYTES` | Rotate the log at this size | `50000000` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BACKUPS` | Rotated files kept (`0` truncates instead) | `3` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__ENABLED` | Record per-call BM25 tool ranking; only takes effect when `selection_telemetry` is on | `true` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__TOP_N` | Ranked candidates recorded per selection event | `20` |

### Proxy → Tool-graph eligibility (optional)

Consults a separate tool-graph MCP server for cross-server authorization / data-flow eligibility and feeds the verdict into the exposure filter as an extra rule source. Off by default. The graph server is consulted, never proxied — the client never sees its tools.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENABLED` | Enable the external tool-graph eligibility provider | `false` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SOURCE` | Policy source: live `stdio` consult or signed `bundle` file | `"stdio"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__BUNDLE_PATH` | Local policy-bundle path used when `source=bundle` | `"~/.memtomem/toolgraph/policy-bundle.json"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__COMMAND` | Launch command for the stdio tool-graph MCP server | `"toolgraph"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ARGS` | Command args (JSON list) | `["serve"]` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENV` | Extra environment for the graph server (e.g. `NEO4J_*`, JSON object) | `null` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__AGENT_ID` | Identity (registered in the graph) that eligibility is authorized against | `"stm-proxy"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SERVER_NAME_MAP` | Map STM upstream names to graph server identities (JSON object) | `{}` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__QUERY_PROFILE` | Profile passed to the graph consult | `"strict"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_UNREACHABLE` | Graph unreachable: `open` (advertise per STM-native rules) / `closed` (withhold every tool the graph did not bless) | `"open"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_TOOL_NOT_FOUND` | Candidate not in the graph: `open` / `closed` | `"open"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_AGENT_NOT_FOUND` | `agent_id` unknown (usually a typo): `fail_start` / `open` / `closed` | `"fail_start"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_PROTOCOL_ERROR` | Graph response contract violation: `fail_start` / `open` / `closed` | `"fail_start"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__RISK_PENALTY_SCALE` | Ranking-demotion multiplier for eligible-but-risky tools | `1` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__TIMEOUT_SECONDS` | Per-consult timeout | `5` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_ENABLED` | Disk-cache a successful consult's verdict | `true` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_PATH` | SQLite path for the consult cache | `"~/.memtomem/toolgraph_consult.db"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_MAX_SCOPES` | Maximum cached tool-set scopes | `64` |

A typed `backend_unavailable` result follows `on_unreachable`; unknown or malformed result envelopes follow `on_protocol_error`.

### Per-upstream (`UpstreamServerConfig`)

These live on per-upstream `UpstreamServerConfig` entries in `~/.memtomem/stm_proxy.json` (set per server, not via individual scalar env vars). Every accepted field is listed below.

| Field | Description | Default |
|---|---|---|
| `command` | stdio server executable | `""` |
| `args` | stdio server arguments | `[]` |
| `env` | additional server environment | `null` |
| `cwd` | server working directory | `null` |
| `prefix` | required namespace segment used in composed tool names | required |
| `transport` | `stdio`, `sse`, or `streamable_http` | `stdio` |
| `url` | endpoint for a network transport | `""` |
| `headers` | static headers for a network transport | `null` |
| `compression` | default compression strategy for this upstream | `auto` |
| `max_result_chars` | result character budget. Omitted, the server inherits the global `default_max_result_chars`; any stated value, `8000` included, applies. A token budget outranks it | `8000` |
| `max_result_tokens` | optional token-equivalent result budget | `null` |
| `chars_per_token` | optional per-upstream character/token estimate | `null` (inherits proxy) |
| `token_estimation_mode` | optional `static` / `unicode` estimator override | `null` (inherits proxy) |
| `retention_floor` | optional minimum compression-retention fraction; applies even when the global `min_result_retention` is `0`, and an explicit `0` opts this level out | `null` (inherits proxy) |
| `llm` | per-upstream LLM compressor settings | `null` |
| `selective` | selective-compressor settings | `null` |
| `hybrid` | hybrid-compressor settings | `null` |
| `progressive` | cursor-based progressive-delivery settings | `null` |
| `cleaning` | pre-compression cleaning settings | `null` |
| `tool_overrides` | per-tool `ToolOverrideConfig` map | `{}` |
| `auto_index` | override the global accepted compatibility setting | `null` |
| `extraction` | override the global accepted compatibility setting | `null` |
| `cache` | override response caching | `null` |
| `cache_ttl_seconds` | override response-cache TTL | `null` |
| `expose_in_profiles` | exposure profiles allowed for the upstream | `null` |
| `surfacing_enabled` | Opt this upstream's responses in/out of proactive surfacing. `false` suppresses surfacing for every tool on this server. | `true` |
| `max_retries` | reconnect/call retries after the first attempt | `3` |
| `reconnect_delay_seconds` | initial reconnect delay | `1.0` |
| `max_reconnect_delay_seconds` | reconnect backoff ceiling | `30.0` |
| `connect_timeout_seconds` | upstream connection timeout | `30.0` |
| `call_timeout_seconds` | Per-attempt timeout for `session.call_tool()`. On timeout the session is force-reset; another attempt requires replay-safe tool policy and remaining retry/deadline budget. | `90.0` |
| `overall_deadline_seconds` | Total wall-clock budget across all retry attempts. Prevents `call_timeout × (max_retries+1)` worst-case blowout. | `180.0` |
| `circuit_max_failures` | failures before opening this upstream's circuit | `3` |
| `circuit_reset_seconds` | open-circuit reset interval | `60.0` |
| `max_description_chars` | per-upstream tool-description cap; the effective budget is `min(server, global)` | `4000` |
| `strip_schema_descriptions` | per-upstream nested schema-description stripping | `false` |
| `origin` | Import-provenance block written by `mms add --import`/`mms init` and used by `mms eject`; CLI JSON output redacts the stored original entry. | `null` |

#### Compression sub-configs

The same sub-config shapes are used under an upstream and, where noted, inside each `tool_overrides.<tool>` entry.

| Block / field | Description | Default |
|---|---|---|
| `llm.provider` | `openai`, `anthropic`, or `ollama` | `openai` |
| `llm.model` | summarization model | `gpt-4.1-mini` |
| `llm.api_key` | provider API key | `""` |
| `llm.base_url` | provider endpoint override | `""` |
| `llm.system_prompt` | summary prompt template containing `{max_chars}` | built-in template |
| `llm.max_tokens` | summary output-token cap | `500` |
| `llm.llm_timeout_seconds` | summary timeout; timeout falls back to `truncate` | `60.0` |
| `llm.privacy_scan_enabled` | scan before a remote LLM call | `true` |
| `selective.max_pending` | in-flight selection record cap | `100` |
| `selective.pending_ttl_seconds` | pending selection TTL | `300.0` |
| `selective.json_depth` | JSON outline depth | `1` |
| `selective.min_section_chars` | minimum retained section size | `50` |
| `selective.pending_store` | `memory` or `sqlite`. With `sqlite`, a response that would be stored and matches credential patterns is not written; it returns uncached, truncated (`truncate_on_sensitive`) or in full (`passthrough_on_sensitive`) | `memory` |
| `selective.pending_store_path` | SQLite pending-selection path | `~/.memtomem/pending_selections.db` |
| `hybrid.head_chars` | preferred leading-content budget | `5000` |
| `hybrid.tail_mode` | `toc` or `truncate` | `toc` |
| `hybrid.min_toc_budget` | minimum table-of-contents budget | `200` |
| `hybrid.min_head_chars` | minimum leading-content budget | `100` |
| `hybrid.head_ratio` | fraction assigned to leading content | `0.6` |
| `progressive.chunk_size` | characters per progressive chunk | `4000` |
| `progressive.max_stored` | pending progressive payload cap | `200` |
| `progressive.ttl_seconds` | pending payload TTL; `0` expires immediately | `1800.0` |
| `progressive.include_structure_hint` | include remaining-content structure metadata | `true` |
| `cleaning.enabled` | enable the cleaning stage | `true` |
| `cleaning.strip_html` | remove HTML markup | `true` |
| `cleaning.deduplicate` | remove duplicate blocks | `true` |
| `cleaning.collapse_links` | collapse verbose links | `true` |

#### Per-tool overrides

Each `tool_overrides.<tool>` accepts `compression`, `max_result_chars`, `max_result_tokens`, `chars_per_token`, `token_estimation_mode`, `retention_floor`, and the `llm`, `selective`, `hybrid`, `progressive`, and `cleaning` blocks above. It also accepts every field below.

| Field | Description | Default |
|---|---|---|
| `auto_index` | override accepted auto-index compatibility config | `null` |
| `extraction` | override accepted extraction compatibility config | `null` |
| `cache` | override caching | `null` |
| `cache_ttl_seconds` | override cache TTL | `null` |
| `hidden` | never advertise this tool | `false` |
| `description_override` | replace the advertised description | `null` |
| `expose_in_profiles` | exposure profiles allowed for this tool | `null` |

### Surfacing (Stage 3)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | Enable proactive surfacing from LTM | `true` |
| `MEMTOMEM_STM_SURFACING__USE_DAEMON` | Route standalone surfacing through the shared daemon, with no private fallback | `false` |
| `MEMTOMEM_STM_SURFACING__WARMUP_ENABLED` | Warm the LTM client in the background | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DB_PATH` | Surfacing feedback and dedup SQLite path | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | Global result-score floor on the RRF scale, applied unless a per-tool pin or the scale gate overrides it | `0.017` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | Max retrieved memories injected per call. Pinned context returned by the core's `context_compose` is added separately and does not count toward this limit | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | Skip surfacing on tiny responses | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | Min tokens in extracted query | `3` |
| `MEMTOMEM_STM_SURFACING__COOLDOWN_SECONDS` | Minimum interval between repeated surfacing work | `5` |
| `MEMTOMEM_STM_SURFACING__TIMEOUT_SECONDS` | LTM surfacing request timeout | `3` |
| `MEMTOMEM_STM_SURFACING__INJECTION_MODE` | Placement: `prepend`, `append`, or `section` | `"append"` |
| `MEMTOMEM_STM_SURFACING__SECTION_HEADER` | Heading used by `section` injection mode | `"## Relevant Memories"` |
| `MEMTOMEM_STM_SURFACING__DEFAULT_NAMESPACE` | Optional namespace used when a tool rule does not override it | `null` |
| `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS` | Tool-name denylist (JSON list) | `[]` |
| `MEMTOMEM_STM_SURFACING__WRITE_TOOL_PATTERNS` | Patterns classified as write tools and therefore not surfaced by default (JSON list) | `["*write*","*create*","*delete*","*push*","*send*","*remove*"]` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_TOOLS` | Per-tool `enabled`, `query_template`, `namespace`, `min_score`, and `max_results` overrides (JSON object) | `{}` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | Cross-session dedup window | `604800` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | Accept `stm_surfacing_feedback` | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_SURFACINGS_PER_MINUTE` | Process-local surfacing rate limit | `15` |
| `MEMTOMEM_STM_SURFACING__CACHE_TTL_SECONDS` | In-process surfacing result cache TTL | `60` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_MAX_FAILURES` | Consecutive LTM failures before opening the circuit | `3` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_RESET_SECONDS` | Open-circuit reset interval | `60` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | Per-tool threshold auto-tuning | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_MIN_SAMPLES` | Minimum feedback samples before tuning | `20` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_INCREMENT` | Threshold adjustment step | `0.002` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_FLOOR` | Default lower auto-tune bound; validation widens it to include an explicit `min_score` | `0.005` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_CEILING` | Default upper auto-tune bound; validation widens it to include an explicit `min_score`. At run time raises are also capped at the batch's attainable reference (see [Feedback Loop](/stm/surfacing/#feedback-loop)) | `0.05` |
| `MEMTOMEM_STM_SURFACING__INCLUDE_SESSION_CONTEXT` | Include available session context in the generated query | `true` |
| `MEMTOMEM_STM_SURFACING__FIRE_WEBHOOK` | Ask LTM to fire its configured webhook for surfaced results | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_INJECTION_CHARS` | Total injected-memory character cap | `3000` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_WINDOW_SIZE` | Adjacent LTM chunks requested around each hit | `0` |
| `MEMTOMEM_STM_SURFACING__RESULT_CONTENT_MAX_CHARS` | Content cap per structured result | `500` |
| `MEMTOMEM_STM_SURFACING__PREVIEW_MAX_CHARS` | Content cap per compact preview | `300` |
| `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` | Days to retain raw query text in the feedback DB before clearing the column; `0` disables cleanup | `30` |
| `MEMTOMEM_STM_SURFACING__STATS_RETENTION_DAYS` | Aggregated surfacing-stat retention | `90` |
| `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT` | Store raw query text when `true`; store `sha256:<16-hex>` digests when `false`. The `surface` webhook's `query` carries the same stored value | `true` |
| `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED` | Record one `surfacing_opportunities` row per call that entered surfacing, labelled with how it ended (surfaced, skipped and why, errored, cancelled). Rows carry the shape of the arguments (their number, a path's depth and, for a common file type, its extension), never their keys or values; `false` turns the log off completely. Only engines with a feedback tracker write them (the daemon, and the proxy with `feedback_enabled`) | `true` |
| `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_SAMPLE_RATE` | Share of opportunity rows kept (`0.0`–`1.0`); dropped rows are counted in `stm_admin(action="surfacing_stats")` but not stored. A call that drew a holdout arm is never sampled out, so `0.0` can still store rows while `HOLDOUT_RATE` is above `0` | `1.0` |
| `MEMTOMEM_STM_SURFACING__HOLDOUT_RATE` | Share of eligible injections withheld at random to measure whether surfacing changes what the agent does next. Values outside `[0, 0.5]` are clamped, not rejected. Only Claude Code hook calls carrying both `tool_use_id` and `session_id` are eligible; the proxy path never withholds | `0.0` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_ENABLED` | Locally filter memories with repeated negative feedback before injection | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_NEGATIVE_THRESHOLD` | Distinct negative surfacing events before local demotion applies | `3` |
| `MEMTOMEM_STM_SURFACING__CONSUMER_MODEL` | Surfacing-specific consumer model; empty inherits `proxy.consumer_model` | `""` |
| `MEMTOMEM_STM_SURFACING__RESULT_FORMAT` | LTM response mode: `compact` or `structured` | `"structured"` |
| `MEMTOMEM_STM_SURFACING__RERANK` | Per-call rerank request sent to the core for surfacing searches: `false` skips the rerank stage, `true` asks for the configured reranker, `none` sends no request and leaves it to core configuration. Sent only to cores that advertise per-call rerank | `false` |
| `MEMTOMEM_STM_SURFACING__SCALE_GATED_MIN_SCORE` | Skip the global or auto-tuned `min_score` for batches whose `score_scale` is a recognized non-RRF scale, and pause auto-tuning for them. A per-tool `min_score` still applies; scores are not rescaled | `true` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT` | LTM MCP transport: `stdio`, `sse`, or `streamable_http` | `"stdio"` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | MCP command launching the LTM server for stdio transport | `"memtomem-server"` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | Args for the LTM command (JSON list) | `[]` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_URL` | LTM endpoint URL for `sse` / `streamable_http` | `""` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS` | Optional static headers for network LTM transport (JSON object) | `null` |

Surfacing applies only to calls routed through STM or supported host hooks. It is not a provider-memory layer and does not silently inject into unrelated direct MCP calls.

### Hook / Daemon

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_HOOK__USE_DAEMON` | Route `mms hook` surfacing through a resident local daemon instead of a fresh in-process path each call | `true` |
| `MEMTOMEM_STM_HOOK__DAEMON_TIMEOUT_SECONDS` | Hook-to-daemon round-trip timeout | `2.5` |
| `MEMTOMEM_STM_HOOK__FALLBACK` | Behavior when daemon is unavailable: `skip` (skip surfacing) or `cold` (handle via the in-process path). A `busy` or `expired` daemon reply skips surfacing either way | `"skip"` |
| `MEMTOMEM_STM_HOOK__AUTO_SPAWN` | Start a daemon asynchronously on the first eligible hook call (does not wait for it) | `true` |
| `MEMTOMEM_STM_HOOK__RECORD_FEEDBACK_EVENTS` | Persist hook surfacing feedback/query events; default keeps dedup without storing raw query text | `false` |
| `MEMTOMEM_STM_HOOK__METRICS_ENABLED` | Record size/timing-only hook metrics | `true` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED` | Enable built-in Bash `updatedToolOutput` compression | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MAX_CHARS` | Target char budget for Bash output replacement | `16000` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MIN_RETENTION` | Minimum retained fraction for built-in Bash output compression | `0.65` |
| `MEMTOMEM_STM_HOOK_SURFACE_TOOLS` | Direct-read comma-separated canonical hook-tool allowlist, separate from the nested settings model. Host adapters map names such as Claude `Read` / `Bash` to `read` / `shell`. | `read,grep,glob,shell` |
| `MEMTOMEM_STM_DAEMON__HOST` | Local daemon bind address; keep it loopback-only | `"127.0.0.1"` |
| `MEMTOMEM_STM_DAEMON__ALLOW_NON_LOOPBACK` | Explicitly permit a non-loopback daemon bind address | `false` |
| `MEMTOMEM_STM_DAEMON__IDLE_TIMEOUT_SECONDS` | Stop the daemon after this many idle seconds; `0` disables idle shutdown | `900` |
| `MEMTOMEM_STM_DAEMON__MAX_PENDING_REQUESTS` | Bound admitted hook and standalone surfacing requests | `32` |

### Langfuse (observability)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | Emit spans | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse host URL | `""` |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1` |

Setting `MEMTOMEM_STM_LANGFUSE__ENABLED=true` without the `[langfuse]` extra installed raises a `ValueError` at startup (fail-fast since v0.1.16). Install the extra first, or leave `enabled=false`. The old silent-disable-with-WARNING behavior is gone, so a typo no longer leaves tracing quietly off.

### Compression strategies (`MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION`)

| Strategy | Use for |
|---|---|
| `auto` | Default — picks per content type |
| `hybrid` | Markdown (structure + summarize non-essentials) |
| `selective` | Keep only query-relevant sections |
| `progressive` | Large content; cursor-based delivery (zero loss) |
| `extract_fields` | JSON dictionaries |
| `schema_pruning` | Large JSON arrays |
| `skeleton` | API docs (schema-only) |
| `llm_summary` | LLM-based summarization (OpenAI / Anthropic / Ollama) |
| `truncate` | Fallback truncation |
| `none` | Pass-through |

> Full list: [configuration.md](https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md) in the upstream repo.

## Defaults from pinned sources

Defaults above are schema declarations before initialization presets. `mm init` may change the provider, dimension, and memory directories. OTLP and Langfuse are independent opt-ins. Pass environment variables to the child MCP process and reconnect.

### STM additional settings

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_DAEMON__MAX_CONCURRENT_LTM_OPS` | Concurrent LTM operation limit | `4` |
| `MEMTOMEM_STM_OTLP__ENABLED` | Optional OTLP export: enabled | `false` |
| `MEMTOMEM_STM_OTLP__ENDPOINT` | Optional OTLP export: endpoint | `""` |
| `MEMTOMEM_STM_OTLP__FLUSH_TIMEOUT_SECONDS` | Optional OTLP export: flush timeout seconds | `5` |
| `MEMTOMEM_STM_OTLP__HEADERS` | Optional OTLP export: headers | `{}` |
| `MEMTOMEM_STM_OTLP__MAX_EXPORT_BATCH_SIZE` | Optional OTLP export: max export batch size | `512` |
| `MEMTOMEM_STM_OTLP__MAX_QUEUE_SIZE` | Optional OTLP export: max queue size | `2048` |
| `MEMTOMEM_STM_OTLP__SAMPLING_RATE` | Optional OTLP export: sampling rate | `1` |
| `MEMTOMEM_STM_OTLP__SCHEDULE_DELAY_MS` | Optional OTLP export: schedule delay ms | `5000` |
| `MEMTOMEM_STM_OTLP__TIMEOUT_SECONDS` | Optional OTLP export: timeout seconds | `10` |
| `MEMTOMEM_STM_PARENT_LIVENESS_GRACE_SECONDS` | Parent-liveness grace period in seconds | `900` |
| `MEMTOMEM_STM_PARENT_LIVENESS_POLL_SECONDS` | Parent-liveness polling interval; 0 disables polling | `0` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM` | Optional LLM extraction configuration; null disables this override | `null` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_BYTES` | Decoded compact-JSON response limit including metadata, non-text and error content; not a wire-size or peak-memory limit | `41943040` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_CACHE_SIZE` | Embedding relevance cache entry limit | `256` |
| `MEMTOMEM_STM_TEARDOWN_WATCHDOG_SECONDS` | Shutdown watchdog deadline in seconds | `60` |

Cache schema 6 uses length-prefixed key framing and Unicode serialization, and binds a cached reply to the upstream's connection settings. Older cache rows are discarded on initialization; this is separate from deleting LTM memories.
