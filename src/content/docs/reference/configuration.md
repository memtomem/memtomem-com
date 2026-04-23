---
title: Environment Variables
description: Configuration reference for memtomem LTM and STM environment variables.
---

Both memtomem (LTM) and memtomem-stm (STM) use [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) with `env_prefix` + `env_nested_delimiter="__"`. **Nested settings use double underscore** — `MEMTOMEM_EMBEDDING__PROVIDER`, not `MEMTOMEM_EMBEDDING_PROVIDER`.

Resolution order (highest priority first): CLI flags → environment variables → config file → built-in defaults.

## LTM (memtomem) — prefix `MEMTOMEM_`

### Storage

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | Storage backend | `sqlite` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite database file path | `~/.memtomem/memtomem.db` |

### Embedding

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `none` (keyword-only until wizard runs) |
| `MEMTOMEM_EMBEDDING__MODEL` | Model name for the chosen provider | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | Vector dimension (must match model) | provider-specific |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI-compatible endpoint | — |
| `MEMTOMEM_EMBEDDING__API_KEY` | API key for paid providers | — |

### Indexing

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | Directories reactively re-indexed by the `mm server` file watcher (JSON list). Pre-existing files are not auto-scanned — seed them once with `mm index <dir>`, then the watcher picks up further edits. Populated by `mm init` when you opt in to AI agent memory enrollment. | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | File extensions to index (JSON list) | `[".md", ".py", ".js", ".ts", ".json", ".yaml", ".toml", ".rst"]` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | When `true`, `mm init` prompts to enroll AI agent memory directories into `memory_dirs`. Set `false` to skip the prompt. | `true` |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | `.gitignore`-syntax patterns (JSON list) that stack on top of the built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, ...). User `!negation` cannot override the built-in secret patterns. | `[]` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | Greedy semantic-pack target for short sibling sections. Set `0` to disable the pack pass. | `384` |

### Namespace Policy Rules

Path-glob → namespace mappings that auto-tag files at index time, so you don't pass `namespace=` on every `mem_index` call.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | JSON list of `{path_glob, namespace}` objects. `pathspec.GitIgnoreSpec` patterns, case-insensitive. `{parent}` placeholder expands to the matched file's immediate parent folder. Resolution order: explicit `namespace=` param → rules (first match) → `enable_auto_ns` → `default_namespace`. | `[]` |

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

### Search

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | Default result count | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 candidate pool size | `50` |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | Dense vector candidate pool size | `50` |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion constant | `60` |

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
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / etc. | `ollama` |
| `MEMTOMEM_LLM__MODEL` | Model name. Empty = provider-specific default | `""` |
| `MEMTOMEM_LLM__BASE_URL` | Endpoint URL | `http://localhost:11434` |
| `MEMTOMEM_LLM__API_KEY` | API key for paid providers | — |
| `MEMTOMEM_LLM__MAX_TOKENS` | Generation token cap | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | Request timeout in seconds | `60.0` |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (9 tools + `mem_do`) / `standard` (~32) / `full` (74) | `core` |

### Web UI

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod` (polished pages only) / `dev` (adds maintainer pages: Sessions, Namespaces, Health Report). `mm web --mode` and `mm web --dev` override this at launch. | `prod` |

### Lifecycle policies & webhooks

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | Run PolicyScheduler (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | Scheduler tick interval | — |
| `MEMTOMEM_WEBHOOK__ENABLED` | Enable outbound webhooks for memory events | `false` |
| `MEMTOMEM_WEBHOOK__URL` | Webhook target URL | — |
| `MEMTOMEM_WEBHOOK__EVENTS` | Event types to send (JSON list) | — |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC signing secret | — |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP timeout | — |

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

### Logging

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | Log format | — |

### Embedding provider comparison

| Provider | GPU | Cost | Notes |
|---|---|---|---|
| `onnx` | No | Free | Built-in via fastembed. ~270 MB on first run |
| `ollama` | No | Free | Requires Ollama. `ollama pull nomic-embed-text` |
| `openai` | No | Paid | Requires API key |

> Full list: [configuration.md](https://github.com/memtomem/memtomem/blob/main/docs/guides/configuration.md) in the upstream repo.

## STM (memtomem-stm) — prefix `MEMTOMEM_STM_`

STM settings are organized into four sections: a flat `LOG_LEVEL`, plus `PROXY__*`, `SURFACING__*`, and `LANGFUSE__*`. Compression, caching, metrics, auto-indexing, and extraction all live **under `PROXY__`**.

### General

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LOG_LEVEL` | Log level | `INFO` |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | When `false`, hides the seven observability tools (`stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`) from the MCP tool list. Tools remain callable from Python. | `true` |

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
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | Run Stage 4 off the request path (F4) | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | Minimum response size to index | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | Output directory | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | Namespace for auto-indexed memories | `proxy-{server}` |

### Proxy → Metrics / Extraction / Relevance scorer

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | Record call metrics | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (fact extraction) | `false` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | Scorer backend | — |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | Persist `stm_compression_feedback` | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | Record progressive-delivery read telemetry (surfaces via `stm_progressive_stats`) | `true` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | Internal lock-acquisition ceiling; a timeout signals a deadlock/stuck holder rather than a slow upstream | `30.0` |

### Proxy → Timeouts

These live on per-upstream `UpstreamServerConfig` entries in `~/.memtomem/stm_proxy.json` (set per server, not via env vars). Defaults apply to every registered upstream unless overridden.

| Field | Description | Default |
|---|---|---|
| `call_timeout_seconds` | Per-attempt timeout for `session.call_tool()`. On timeout the session is force-reset and the retry loop proceeds. | `90.0` |
| `overall_deadline_seconds` | Total wall-clock budget across all retry attempts. Prevents `call_timeout × (max_retries+1)` worst-case blowout. | `180.0` |
| `compression.llm.llm_timeout_seconds` | Timeout for `llm_summary` compression; on timeout STM falls back to `truncate`. | `60.0` |

### Surfacing (Stage 3)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | Enable proactive surfacing from LTM | `true` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | Minimum relevance score | `0.02` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | Max memories injected per call | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | Skip surfacing on tiny responses | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | Min tokens in extracted query | `3` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | Cross-session dedup window | `604800` (7 days) |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | Accept `stm_surfacing_feedback` | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | Per-tool threshold auto-tuning | `true` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | MCP command launching the LTM server | — |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | Args for the LTM command (JSON list) | — |

Injection mode (`prepend` default, plus `append` / `section`) is set via `MEMTOMEM_STM_SURFACING__INJECTION_MODE`.

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
| `llm_summary` | LLM-based summarization (Ollama / OpenAI) |
| `truncate` | Fallback truncation |
| `none` | Pass-through |

> Full list: [configuration.md](https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md) in the upstream repo.
