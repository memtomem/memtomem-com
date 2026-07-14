---
title: Environment Variables
description: Configuration reference for memtomem LTM and STM environment variables.
---

Both memtomem (LTM) and memtomem-stm (STM) use [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) with `env_prefix` + `env_nested_delimiter="__"`. **Nested settings use double underscore** — `MEMTOMEM_EMBEDDING__PROVIDER`, not `MEMTOMEM_EMBEDDING_PROVIDER`.

Resolution order (highest priority first): CLI flags → environment variables → config file → built-in defaults.

This public reference tracks the `memtomem` 0.3.10 and `memtomem-stm` 0.1.38 configuration surfaces.

## LTM (memtomem) — prefix `MEMTOMEM_`

### Storage

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | Storage backend | `sqlite` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite database file path | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_STORAGE__COLLECTION_NAME` | Logical collection name | `memories` |

### Embedding

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `none` (keyword-only until `mm init` runs) |
| `MEMTOMEM_EMBEDDING__MODEL` | Model name for the chosen provider | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | Vector dimension (must match model) | provider-specific |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI-compatible endpoint | — |
| `MEMTOMEM_EMBEDDING__API_KEY` | API key for paid providers | — |
| `MEMTOMEM_EMBEDDING__BATCH_SIZE` | Texts per embedding batch | `64` |
| `MEMTOMEM_EMBEDDING__MAX_CONCURRENT_BATCHES` | Max parallel embedding batches | `4` |
| `MEMTOMEM_EMBEDDING__THREADS` | ONNX Runtime thread cap (`0` = ORT default) | `4` |
| `MEMTOMEM_EMBEDDING__PROGRESS_THRESHOLD` | Emit per-chunk progress only when a file produces more chunks than this threshold; `0` always emits | `32` |

### Indexing

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | Directories reactively re-indexed by the `mm server` file watcher (JSON list). Pre-existing files are not auto-scanned — seed them once with `mm index <dir>`, then the watcher picks up further edits. Populated by `mm init` when you opt in to AI agent memory enrollment. | `["~/.memtomem/memories"]` plus selected provider folders |
| `MEMTOMEM_INDEXING__PROJECT_MEMORY_DIRS` | Project-tier memory roots under `.memtomem/memories` or `.memtomem/memories.local` | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | File extensions to index (JSON list) | `[".md", ".json", ".yaml", ".yml", ".toml", ".py", ".js", ".ts", ".tsx", ".jsx"]` |
| `MEMTOMEM_INDEXING__MAX_CHUNK_TOKENS` | Maximum tokens per chunk | `512` |
| `MEMTOMEM_INDEXING__MIN_CHUNK_TOKENS` | Merge threshold for short chunks | `128` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | When `true`, `mm init` prompts to enroll AI agent memory directories into `memory_dirs`. Set `false` to skip the prompt. | `true` |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | `.gitignore`-syntax patterns (JSON list) that stack on top of the built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, ...). User `!negation` cannot override the built-in secret patterns. | `[]` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | Greedy semantic-pack target for short sibling sections. Set `0` to disable the pack pass. | `384` |
| `MEMTOMEM_INDEXING__CHUNK_OVERLAP_TOKENS` | Token overlap between adjacent chunks | `0` |
| `MEMTOMEM_INDEXING__STRUCTURED_CHUNK_MODE` | JSON/YAML/TOML chunking mode: `original` or `recursive` | `original` |
| `MEMTOMEM_INDEXING__PARAGRAPH_SPLIT_THRESHOLD` | Split long prose into paragraphs above this token count | `800` |
| `MEMTOMEM_INDEXING__STARTUP_BACKFILL` | On server start, run a one-shot scan over `memory_dirs` to catch files added while the server was down | `false` |
| `MEMTOMEM_INDEXING__AUTO_SUMMARIZE` | Generate AI per-source summaries when LLM is configured | `false` |
| `MEMTOMEM_INDEXING__SUMMARY_LANGUAGE` | Output language for AI source summaries | `en` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_INPUT_CHARS` | Max source chars sent to the summary LLM | `3000` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_TOKENS` | Summary output token cap | `256` |

### Namespace Policy Rules

Path-glob → namespace mappings that auto-tag files at index time, so you don't pass `namespace=` on every `mem_index` call.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | JSON list of `{path_glob, namespace}` objects. `pathspec.GitIgnoreSpec` patterns, case-insensitive. `{parent}` and `{ancestor:N}` placeholders expand from the matched file path. Resolution order: explicit `namespace=` param → rules (first match) → `enable_auto_ns` → `default_namespace`. | `[]` |
| `MEMTOMEM_NAMESPACE__DEFAULT_NAMESPACE` | Default namespace for new chunks | `default` |
| `MEMTOMEM_NAMESPACE__ENABLE_AUTO_NS` | Derive namespace from a file's immediate parent folder when no explicit namespace or rule applies | `false` |

Example (via `config.d/namespace.json`, APPEND-merged):

```json
{"namespace": {"rules": [
  {"path_glob": "docs/**", "namespace": "docs"},
  {"path_glob": "projects/{parent}/**", "namespace": "proj/{parent}"}
]}}
```

### Reranking

Cross-encoder reranking runs fully locally by default — no external API required.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_RERANK__ENABLED` | Enable reranking of hybrid search results | `false` |
| `MEMTOMEM_RERANK__PROVIDER` | `fastembed` (local ONNX) / `cohere` (external API) | `fastembed` |
| `MEMTOMEM_RERANK__MODEL` | Model name. Use `jinaai/jina-reranker-v2-base-multilingual` for non-English content. | `Xenova/ms-marco-MiniLM-L-6-v2` |
| `MEMTOMEM_RERANK__API_KEY` | Only required when `provider=cohere` | — |
| `MEMTOMEM_RERANK__OVERSAMPLE` | Pool multiplier over `response_top_k`. Pool size is `max(min_pool, min(max_pool, int(oversample * response_top_k)))`. | `2.0` |
| `MEMTOMEM_RERANK__MIN_POOL` | Floor — reranker never sees fewer candidates than this | `20` |
| `MEMTOMEM_RERANK__MAX_POOL` | Cap — prevents runaway cost at large `top_k` | `200` |
| `MEMTOMEM_RERANK__TOP_K` | Deprecated legacy pool size; migrates to `min_pool` when present | `20` |

### Search

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | Default result count | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 candidate pool size | `50` |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | Dense vector candidate pool size | `50` |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion constant | `60` |
| `MEMTOMEM_SEARCH__ENABLE_BM25` | Enable keyword retriever | `true` |
| `MEMTOMEM_SEARCH__ENABLE_DENSE` | Enable semantic vector retriever | `true` |
| `MEMTOMEM_SEARCH__RRF_WEIGHTS` | RRF weights for `[BM25, Dense]` (JSON list, REPLACE merge) | `[1.0, 1.0]` |
| `MEMTOMEM_SEARCH__TOKENIZER` | FTS tokenizer: `unicode61` or `kiwipiepy` | `unicode61` |
| `MEMTOMEM_SEARCH__CACHE_TTL` | Search result cache TTL in seconds | `30.0` |
| `MEMTOMEM_SEARCH__SYSTEM_NAMESPACE_PREFIXES` | Namespace prefixes hidden from default `namespace=None` search (JSON list, APPEND merge) | `["archive:", "agent-runtime:"]` |

### Decay (time-based scoring)

Half-life decay multiplier applied to hybrid-search scores. Gradually deprioritises older chunks.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_DECAY__ENABLED` | Enable time-based decay weighting | `false` |
| `MEMTOMEM_DECAY__HALF_LIFE_DAYS` | Half-life in days — a chunk's contribution halves every interval | `30.0` |

### MMR (diversity rerank)

Maximal Marginal Relevance rerank. Reduces redundancy among top results and mixes in alternate angles.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_MMR__ENABLED` | Enable MMR diversity rerank | `false` |
| `MEMTOMEM_MMR__LAMBDA_PARAM` | 0.0–1.0. `0.0` = max diversity, `1.0` = max relevance | `0.7` |

### Access (frequency boost)

Frequency-based multiplier that promotes chunks which have been accessed often.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_ACCESS__ENABLED` | Enable access-frequency boost | `false` |
| `MEMTOMEM_ACCESS__MAX_BOOST` | Score multiplier ceiling (must be `>= 1.0`) | `1.5` |

### Importance (metadata boost)

Multiplier derived from chunk metadata features (tags, size, position, ...) applied on top of the search score.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_IMPORTANCE__ENABLED` | Enable importance boost | `false` |
| `MEMTOMEM_IMPORTANCE__MAX_BOOST` | Score multiplier ceiling (must be `>= 1.0`) | `1.5` |
| `MEMTOMEM_IMPORTANCE__WEIGHTS` | Importance-feature weight vector (JSON list, REPLACE merge) | `[0.3, 0.2, 0.3, 0.2]` |

### Query expansion

Augments the original query with related tags, headings, or LLM-generated terms to improve recall. `strategy=llm` uses the LLM section below.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_QUERY_EXPANSION__ENABLED` | Enable query expansion | `false` |
| `MEMTOMEM_QUERY_EXPANSION__MAX_TERMS` | Max additional terms to append | `3` |
| `MEMTOMEM_QUERY_EXPANSION__STRATEGY` | `tags` / `headings` / `both` / `llm` | `tags` |

### Context window

Small-to-big retrieval: returns ±N adjacent chunks around each search hit. Useful for recovering fragmented context in long documents.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_CONTEXT_WINDOW__ENABLED` | Enable context-window expansion | `false` |
| `MEMTOMEM_CONTEXT_WINDOW__WINDOW_SIZE` | ±N adjacent chunks per hit (`0`–`10`) | `2` |

### LLM (summarisation · query-expansion backend)

Shared LLM backend used by `query_expansion.strategy=llm`, consolidation summaries, and other LLM-powered features.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LLM__ENABLED` | Enable LLM-powered features | `false` |
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / `anthropic` / compatible endpoint | `ollama` |
| `MEMTOMEM_LLM__MODEL` | Model name. Empty = provider-specific default | `""` |
| `MEMTOMEM_LLM__BASE_URL` | Endpoint URL | `http://localhost:11434` |
| `MEMTOMEM_LLM__API_KEY` | API key for paid providers | — |
| `MEMTOMEM_LLM__MAX_TOKENS` | Generation token cap | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | Request timeout in seconds | `60.0` |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (9 names incl. `mem_do`) / `standard` (38) / `full` (96 current tools + deprecated `mem_context_migrate` alias) | `core` |

### Web UI

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod` (polished pages only) / `dev` (adds maintainer pages: Sessions, Namespaces, Health Report). `mm web --mode` and `mm web --dev` override this at launch. | `prod` |

### Lifecycle policies & webhooks

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | Run PolicyScheduler (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | Scheduler tick interval | `60.0` |
| `MEMTOMEM_POLICY__MAX_ACTIONS_PER_RUN` | Cumulative action cap per scheduled policy run | `100` |
| `MEMTOMEM_WEBHOOK__ENABLED` | Enable outbound webhooks for memory events | `false` |
| `MEMTOMEM_WEBHOOK__URL` | Webhook target URL | — |
| `MEMTOMEM_WEBHOOK__EVENTS` | Event types to send (JSON list, APPEND merge) | `["add", "delete", "search"]` |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC signing secret | — |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP timeout | `10.0` |

### Consolidation schedule

Background job that periodically groups near-duplicate memories and compresses them into archive summaries.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__ENABLED` | Run the consolidation scheduler | `false` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__INTERVAL_HOURS` | Scheduler interval (hours) | `24.0` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MIN_GROUP_SIZE` | Minimum group size to consolidate | `3` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MAX_GROUPS` | Max groups processed per run | `10` |

### Health watchdog

Background loop for periodic health checks, orphan-record cleanup, and automatic maintenance.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_HEALTH_WATCHDOG__ENABLED` | Run the health watchdog | `false` |
| `MEMTOMEM_HEALTH_WATCHDOG__HEARTBEAT_INTERVAL_SECONDS` | Heartbeat interval | `60.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DIAGNOSTIC_INTERVAL_SECONDS` | Diagnostic-check interval | `300.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DEEP_INTERVAL_SECONDS` | Deep-scan interval | `3600.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__MAX_SNAPSHOTS` | Snapshot retention cap | `1000` |
| `MEMTOMEM_HEALTH_WATCHDOG__ORPHAN_CLEANUP_THRESHOLD` | Orphan-record cleanup threshold | `10` |
| `MEMTOMEM_HEALTH_WATCHDOG__AUTO_MAINTENANCE` | Perform automatic maintenance | `true` |

### Scheduler

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SCHEDULER__ENABLED` | Enable cron dispatch for registered maintenance jobs | `false` |
| `MEMTOMEM_SCHEDULER__MAX_CONCURRENT_JOBS` | Max concurrently running scheduled jobs | `1` |
| `MEMTOMEM_SCHEDULER__DEFAULT_TIMEZONE` | Schedule timezone; Phase A honors `utc` | `utc` |
| `MEMTOMEM_SCHEDULER__RUNNER_TIMEOUT_SECONDS` | Timeout for one scheduled job run | `300.0` |

### Session summary

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SESSION_SUMMARY__AUTO` | Auto-generate an LLM summary on `mem_session_end` when enough chunks were added | `true` |
| `MEMTOMEM_SESSION_SUMMARY__MIN_CHUNKS` | Minimum chunks before auto-summary runs | `5` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_TOKENS` | Output token cap | `500` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_INPUT_CHARS` | Skip auto-summary above this assembled input size | `60000` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_LINKS` | Cap summary-to-source chunk links | `50` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_LOOKUP_TOP_K` | Session-summary chunks considered for search rescue | `3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_SCORE_THRESHOLD` | Minimum summary score for rescue expansion | `0.3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_RESCUE_WEIGHT` | RRF input weight for rescued source-file hits | `0.5` |

### Session tracing

Traces session command execution to a JSONL file and, optionally, to Langfuse. Off by default. `payload_mode` defaults to `metadata`, which records no payload body; `redacted` keeps a secret-masked body, and `full` keeps the entire body.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SESSION_TRACE__ENABLED` | Enable session execution tracing | `false` |
| `MEMTOMEM_SESSION_TRACE__JSONL_ENABLED` | Write to the JSONL sink | `true` |
| `MEMTOMEM_SESSION_TRACE__JSONL_PATH` | JSONL output file path | `~/.memtomem/traces/session-traces.jsonl` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_ENABLED` | Emit traces to the Langfuse sink | `false` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_HOST` | Langfuse host URL | `""` |
| `MEMTOMEM_SESSION_TRACE__SAMPLING_RATE` | 0.0–1.0. Fraction of sessions recorded | `1.0` |
| `MEMTOMEM_SESSION_TRACE__PAYLOAD_MODE` | `metadata` (no body) / `redacted` (secret-masked body) / `full` (entire body) | `metadata` |
| `MEMTOMEM_SESSION_TRACE__MAX_PAYLOAD_CHARS` | Char cap on payload retained in a trace | `10000` |

Setting `langfuse_enabled=true` requires the `langfuse` extra installed and both the public and secret keys set; otherwise startup validation fails.

### Logging

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | Log format | — |

### Hooks / Context Gateway

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_HOOKS__TARGET_SCOPE` | Scope for memtomem-managed Claude Code settings hooks: `user`, `project_shared`, or `project_local` | `user` |
| `MEMTOMEM_CONTEXT_GATEWAY__KNOWN_PROJECTS_PATH` | Web UI project registry for Context Gateway | `~/.memtomem/known_projects.json` |
| `MEMTOMEM_CONTEXT_GATEWAY__EXPERIMENTAL_CLAUDE_PROJECTS_SCAN` | Decode `~/.claude/projects/<encoded>` directory names back into project roots and scan them (includes unverified candidates) | `false` |
| `MEMTOMEM_CONTEXT_GATEWAY__AUTO_DISPLAY_CONFIGURED_PROJECTS` | Auto-display a scanned project only when its root carries a recognized runtime marker (`.claude`/`.gemini`/`.codex`/`.agents`/`.kimi`/`.memtomem`) | `true` |
| `MEMTOMEM_CONTEXT_GATEWAY__USER_TIER_ENABLED` | Forward-compat field gating writes to the User tier (host-global artifacts). While `false`, the User tier is hidden from discovery responses | `false` |

### Embedding provider comparison

| Provider | GPU | Cost | Notes |
|---|---|---|---|
| `onnx` | No | Free | Built-in via fastembed. ~270 MB on first run |
| `ollama` | No | Free | Requires Ollama. `ollama pull nomic-embed-text` |
| `openai` | No | Paid | Requires API key |

> Full list: [configuration.md](https://github.com/memtomem/memtomem/blob/main/docs/guides/configuration.md) in the upstream repo.

## STM (memtomem-stm) — prefix `MEMTOMEM_STM_`

STM settings are organized into six sections: a flat `LOG_LEVEL`, plus `PROXY__*`, `SURFACING__*`, `HOOK__*`, `DAEMON__*`, and `LANGFUSE__*`. Compression, caching, metrics, auto-indexing, and extraction all live **under `PROXY__`**.

### General

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LOG_LEVEL` | Log level | `WARNING` |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | When `true`, advertises eight observability/admin tools (`stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`). The four model-facing tools remain visible when false. | `false` |
| `MEMTOMEM_STM_FORMATION__ENABLED` | Advertise the opt-in `stm_memory_propose` tool. This flag alone controls advertisement; upstream LTM support for review-first proposals is checked at call time (an incompatible core returns `formation_unsupported`). | `false` |

### Proxy

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__ENABLED` | Master switch for the proxy pipeline | `false` |
| `MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION` | Default compression strategy | `auto` |
| `MEMTOMEM_STM_PROXY__DEFAULT_MAX_RESULT_CHARS` | Per-response char budget | `16000` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_CHARS` | OOM guard on upstream response size | `10000000` |
| `MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION` | Retention floor (0.0–1.0) | `0.65` |

### Proxy → Cache

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | Enable response caching | `true` |
| `MEMTOMEM_STM_PROXY__CACHE__DEFAULT_TTL_SECONDS` | Cache TTL | `3600` |
| `MEMTOMEM_STM_PROXY__CACHE__DB_PATH` | Cache DB location | — |
| `MEMTOMEM_STM_PROXY__CACHE__MAX_ENTRIES` | Cache eviction ceiling | — |

### Proxy → Auto-Index (Stage 4)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__ENABLED` | Index tool responses into LTM | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | Run indexing in the background, off the request path | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | Minimum response size to index | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | Output directory | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | Namespace for auto-indexed memories | `proxy-{server}` |

The bundled `mms` server reads from LTM but, by design, does not write back to it. These `auto_index` and extraction fields are therefore accepted as valid config but have no effect on its behavior.

### Proxy → Metrics / Extraction / Relevance scorer

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | Record call metrics | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (fact extraction) | `false` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | Scorer backend | — |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | Persist `stm_compression_feedback` | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | Record progressive-delivery read telemetry (surfaces via `stm_progressive_stats`) | `true` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | Internal lock-acquisition ceiling; a timeout signals a deadlock/stuck holder rather than a slow upstream | `30.0` |

### Proxy → Tool exposure

An STM-native filter that decides, at tool-advertisement time, which of an upstream's tools the agent gets to see. Tools that fail consistently, carry credentials, or duplicate another tool's name are kept out of the advertised list. Health signals are evaluated once at proxy startup, so the advertised set stays stable for the session.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXPOSURE__PROFILE` | `strict` (signal rules hard-reject) / `review` (demote in ranking instead of rejecting, recorded in telemetry) / `explore` (signal rules off) | `strict` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_WINDOW_HOURS` | Look-back window over the metrics store for per-tool health | `24.0` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_MIN_CALLS` | Minimum calls in the window before health is judged; below this a tool is presumed healthy | `5` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_ERROR_RATE_THRESHOLD` | Upstream-attributable error rate at or above which a tool is flagged unhealthy | `0.95` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__REVIEW_RISK_PENALTY` | Ranking-demotion multiplier applied to signal-flagged tools under the `review` profile | `0.5` |

### Proxy → Selection telemetry / Tool relevance

Records one selection + execution entry per proxied call as JSONL, and BM25-ranks the advertised tool set against the call's query signal. Ranking is recorded into telemetry only — it never changes exposure.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__ENABLED` | Enable per-call selection/execution JSONL records | `false` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__PATH` | JSONL log path | `~/.memtomem/stm_selection_log.jsonl` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__SAMPLE_RATE` | 0.0–1.0. Fraction of calls recorded | `1.0` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BYTES` | Rotate the log at this size | `50000000` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BACKUPS` | Rotated files kept (`0` truncates instead) | `3` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__ENABLED` | Record per-call BM25 tool ranking; only takes effect when `selection_telemetry` is on | `true` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__TOP_N` | Ranked candidates recorded per selection event | `20` |

### Proxy → Tool-graph eligibility (optional)

Consults a separate tool-graph MCP server for cross-server authorization / data-flow eligibility and feeds the verdict into the exposure filter as an extra rule source. Off by default. The graph server is consulted, never proxied — the client never sees its tools.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENABLED` | Enable the external tool-graph eligibility provider | `false` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__COMMAND` | Launch command for the stdio tool-graph MCP server | `toolgraph` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ARGS` | Command args (JSON list) | `["serve"]` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENV` | Extra environment for the graph server (e.g. `NEO4J_*`, JSON object) | `null` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__AGENT_ID` | Identity (registered in the graph) that eligibility is authorized against | `stm-proxy` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__QUERY_PROFILE` | Profile passed to the graph consult | `strict` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_UNREACHABLE` | Graph unreachable: `open` (advertise per STM-native rules) / `closed` (withhold every tool the graph did not bless) | `open` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_TOOL_NOT_FOUND` | Candidate not in the graph: `open` / `closed` | `open` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_AGENT_NOT_FOUND` | `agent_id` unknown (usually a typo): `fail_start` / `open` / `closed` | `fail_start` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_PROTOCOL_ERROR` | Graph response contract violation: `fail_start` / `open` / `closed` | `fail_start` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__RISK_PENALTY_SCALE` | Ranking-demotion multiplier for eligible-but-risky tools | `1.0` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__TIMEOUT_SECONDS` | Per-consult timeout | `5.0` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_ENABLED` | Disk-cache a successful consult's verdict | `true` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_PATH` | SQLite path for the consult cache | `~/.memtomem/toolgraph_consult.db` |

### Per-upstream (`UpstreamServerConfig`)

These live on per-upstream `UpstreamServerConfig` entries in `~/.memtomem/stm_proxy.json` (set per server, not via env vars). The timeout fields fall back to the defaults below for every registered upstream unless overridden.

| Field | Description | Default |
|---|---|---|
| `surfacing_enabled` | Opt this upstream's responses in/out of proactive surfacing. `false` suppresses surfacing for every tool on this server. | `true` |
| `origin` | Import-provenance block. Written by `mms add --import`/`mms init` and used later by `mms eject` to restore the original entry to the host config. | — |
| `call_timeout_seconds` | Per-attempt timeout for `session.call_tool()`. On timeout the session is force-reset and the retry loop proceeds. | `90.0` |
| `overall_deadline_seconds` | Total wall-clock budget across all retry attempts. Prevents `call_timeout × (max_retries+1)` worst-case blowout. | `180.0` |
| `compression.llm.llm_timeout_seconds` | Timeout for `llm_summary` compression; on timeout STM falls back to `truncate`. | `60.0` |

### Surfacing (Stage 3)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | Enable proactive surfacing from LTM | `true` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | Minimum relevance score | `0.03` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | Max memories injected per call | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | Skip surfacing on tiny responses | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | Min tokens in extracted query | `3` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | Cross-session dedup window | `604800` (7 days) |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | Accept `stm_surfacing_feedback` | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | Per-tool threshold auto-tuning | `true` |
| `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` | Days to retain raw query text in the feedback DB before clearing the column; `0` disables cleanup | `30` |
| `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT` | Store raw query text when `true`; store `sha256:<16-hex>` digests when `false` | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_ENABLED` | Locally filter memories with repeated negative feedback before injection | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_NEGATIVE_THRESHOLD` | Distinct negative surfacing events before local demotion applies | `3` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT` | LTM MCP transport: `stdio`, `sse`, or `streamable_http` | `stdio` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | MCP command launching the LTM server for stdio transport | `memtomem-server` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | Args for the LTM command (JSON list) | `[]` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_URL` | LTM endpoint URL for `sse` / `streamable_http` | `""` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS` | Optional static headers for network LTM transport (JSON object) | `null` |

Injection mode (`append` default, plus `prepend` / `section`) is set via `MEMTOMEM_STM_SURFACING__INJECTION_MODE`.

### Hook / Daemon

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_HOOK__USE_DAEMON` | Route `mms hook` surfacing through a resident local daemon instead of a fresh in-process path each call | `true` |
| `MEMTOMEM_STM_HOOK__DAEMON_TIMEOUT_SECONDS` | Hook-to-daemon round-trip timeout | `2.5` |
| `MEMTOMEM_STM_HOOK__FALLBACK` | Behavior when daemon is unavailable: `skip` (skip surfacing) or `cold` (handle via the in-process path) | `skip` |
| `MEMTOMEM_STM_HOOK__AUTO_SPAWN` | Start a daemon asynchronously on the first eligible hook call (does not wait for it) | `true` |
| `MEMTOMEM_STM_HOOK__RECORD_FEEDBACK_EVENTS` | Persist hook surfacing feedback/query events; default keeps dedup without storing raw query text | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED` | Enable built-in Bash `updatedToolOutput` compression | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MAX_CHARS` | Target char budget for Bash output replacement | `16000` |
| `MEMTOMEM_STM_DAEMON__HOST` | Local daemon bind address; keep it loopback-only | `127.0.0.1` |
| `MEMTOMEM_STM_DAEMON__IDLE_TIMEOUT_SECONDS` | Stop the daemon after this many idle seconds; `0` disables idle shutdown | `900.0` |

### Langfuse (observability)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | Emit spans | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | — |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | — |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse host URL | — |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1.0` |

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
