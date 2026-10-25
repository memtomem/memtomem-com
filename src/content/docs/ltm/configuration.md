---
title: LTM Environment Variables
description: Configuration reference for memtomem (LTM) environment variables.
---

memtomem (LTM) uses [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) with `env_prefix` + `env_nested_delimiter="__"`. **Nested settings use double underscore** — `MEMTOMEM_EMBEDDING__PROVIDER`, not `MEMTOMEM_EMBEDDING_PROVIDER`.

Resolution order (highest priority first): CLI flags → environment variables → config file → built-in defaults.

This public reference tracks the complete `memtomem` 0.6.12 configuration surface. Options are intentionally mirrored here rather than reduced to a curated subset. STM settings (prefix `MEMTOMEM_STM_`) are listed in [STM Environment Variables](/stm/configuration/).

## LTM (memtomem) — prefix `MEMTOMEM_`

### Storage

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | Storage backend | `"sqlite"` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite database file path | `"~/.memtomem/memtomem.db"` |
| `MEMTOMEM_STORAGE__COLLECTION_NAME` | Logical collection name | `"memories"` |

### Embedding

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `"none"` |
| `MEMTOMEM_EMBEDDING__MODEL` | Model name for the chosen provider | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | Vector dimension (must match model) | `0` |
| `MEMTOMEM_EMBEDDING__ONNX_VARIANT` | Local ONNX precision: `fp32`, `int8-arm64`, `int8-avx2`, `int8-avx512`, or `int8-avx512-vnni`. Changing it requires a restart and an explicit index migration. | `"fp32"` |
| `MEMTOMEM_EMBEDDING__ONNX_ARTIFACT_PATH` | Directory holding a locally exported quantized artifact with a checksummed `manifest.json`. Required for every non-`fp32` variant; there is no automatic fallback. | `""` |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI-compatible endpoint | `""` |
| `MEMTOMEM_EMBEDDING__API_KEY` | API key for paid providers | `""` |
| `MEMTOMEM_EMBEDDING__BATCH_SIZE` | Texts per embedding batch | `64` |
| `MEMTOMEM_EMBEDDING__ONNX_BATCH_SIZE` | Texts per local FastEmbed/ONNX inference batch; runtime-mutable | `8` |
| `MEMTOMEM_EMBEDDING__MAX_SEQUENCE_TOKENS` | Actual-token cap per local ONNX input; `0` restores the model limit, except under the E5 profile noted below. Restart after changing it and force-reindex existing content so vectors use one policy. | `1024` |
| `MEMTOMEM_EMBEDDING__ONNX_CPU_MEM_ARENA` | Reuse ONNX CPU allocations. Restart required; this allocator-only switch does not require re-indexing. | `false` |
| `MEMTOMEM_EMBEDDING__MAX_CONCURRENT_BATCHES` | Max parallel embedding batches | `4` |
| `MEMTOMEM_EMBEDDING__THREADS` | ONNX Runtime thread cap (`0` = ORT default) | `4` |
| `MEMTOMEM_EMBEDDING__PROGRESS_THRESHOLD` | Emit per-chunk progress only when a file produces more chunks than this threshold; `0` always emits | `32` |

**Effective defaults under the ONNX E5 profile.** With `PROVIDER=onnx` and no `MODEL`, Core selects `multilingual-e5-small` and fills in `DIMENSION=384`, `MAX_SEQUENCE_TOKENS=512`, `THREADS=2` and `ONNX_BATCH_SIZE=4` for every one of those you leave unset. The Default column above is the *declared* default, which is what applies outside that profile. Inside it, a `DIMENSION` other than `384` and a `MAX_SEQUENCE_TOKENS` other than `512` are rejected at startup rather than adjusted — including the declared `0` and `1024`, if you set them explicitly.

### Indexing

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | Directories reactively re-indexed by the long-running `memtomem-server` file watcher (JSON list). Pre-existing files are not auto-scanned — seed them once with `mm index <dir>`, then the watcher picks up further edits. Populated by `mm init` when you opt in to AI agent memory enrollment. | `["~/.memtomem/memories"]` |
| `MEMTOMEM_INDEXING__PROJECT_MEMORY_DIRS` | Project-tier memory roots under `.memtomem/memories` or `.memtomem/memories.local` | `[]` |
| `MEMTOMEM_INDEXING__READ_ONLY_MEMORY_DIRS` | Roots memtomem indexes and searches but never rewrites. Must be disjoint from the writable roots. | `[]` |
| `MEMTOMEM_INDEXING__RETAIN_MISSING_DIRS` | Directories whose files other tools delete on their own (Claude Code plans, Codex memories), where the indexed chunks are the only copy left. A missing source under one of these that is also under an index root stays searchable instead of being held, and is not offered for purge. Not an index root itself, and a source held for another reason (`redaction_blocked`, `scan_unavailable`) stays held. (JSON list, APPEND merge) | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | File extensions to index (JSON list) | `[".js",".json",".jsx",".md",".py",".toml",".ts",".tsx",".yaml",".yml"]` |
| `MEMTOMEM_INDEXING__MAX_CHUNK_TOKENS` | Maximum tokens per chunk | `512` |
| `MEMTOMEM_INDEXING__MIN_CHUNK_TOKENS` | Merge threshold for short chunks | `128` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | Deprecated one-shot migration trigger. Existing configs convert detected provider directories into explicit `memory_dirs`, persist them, and flip this field to `false`; new installs skip the migration. Use `mm init --include-provider ...` for new configuration. | `true` |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | `.gitignore`-syntax patterns (JSON list) that stack on top of the built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, ...). User `!negation` cannot override the built-in secret patterns. | `[]` |
| `MEMTOMEM_INDEXING__INDEX_MASKING_MANIFEST_PATH` | Owner-reviewed masking manifest naming exact source paths, content SHA-256 values, and complete-block line spans. A changed source or an invalid manifest falls back to the normal privacy guard, and masked chunks are read-only. It does not enable automatic masking. | `""` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | Greedy semantic-pack target for short sibling sections. Set `0` to disable the pack pass. | `384` |
| `MEMTOMEM_INDEXING__CHUNK_OVERLAP_TOKENS` | Token overlap between adjacent chunks | `0` |
| `MEMTOMEM_INDEXING__CHUNK_MODEL_TOKENS` | Composed retrieval-input ceiling, including special tokens | `8192` |
| `MEMTOMEM_INDEXING__CHUNK_CONTEXT_TOKENS` | Separate budget for the heading and description prefix | `512` |
| `MEMTOMEM_INDEXING__HARD_MAX_CHUNK_TOKENS` | Exact body ceiling; `0` disables hard-budget mode. Requires a matching local tokenizer. | `0` |
| `MEMTOMEM_INDEXING__CHUNK_TOKENIZER_PATH` | Local `tokenizer.json` for the embedding model, so hard-budget mode downloads no model | `""` |
| `MEMTOMEM_INDEXING__CHUNK_INPUT_PREFIX` | Exact model-role prefix counted in the final input token budget (E5 uses `passage: `). Restart required. | `""` |
| `MEMTOMEM_INDEXING__ENRICH_CHUNK_CONTEXT` | Add cached LLM descriptions to the chunk context. Requires hard-budget mode. | `false` |
| `MEMTOMEM_INDEXING__STRUCTURED_CHUNK_MODE` | JSON/YAML/TOML chunking mode: `original` or `recursive` | `"original"` |
| `MEMTOMEM_INDEXING__PARAGRAPH_SPLIT_THRESHOLD` | Split long prose into paragraphs above this token count | `800` |
| `MEMTOMEM_INDEXING__STARTUP_BACKFILL` | On server start, run a one-shot scan over `memory_dirs` to catch files added while the server was down | `false` |
| `MEMTOMEM_INDEXING__WATCHER_BACKEND` | Watch backend: `auto` polls on macOS and uses native events elsewhere; `native` or `polling` override it | `"auto"` |
| `MEMTOMEM_INDEXING__WATCHER_DEBOUNCE_MS` | Quiet period before automatic re-indexing, 1–30000 ms | `5000` |
| `MEMTOMEM_INDEXING__WATCHER_MAX_WAIT_MS` | Maximum event-collection window, 1–30000 ms, even under continuous edits | `30000` |
| `MEMTOMEM_INDEXING__AUTO_SUMMARIZE` | Generate AI per-source summaries when LLM is configured | `false` |
| `MEMTOMEM_INDEXING__SUMMARY_LANGUAGE` | Output language for AI source summaries | `"en"` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_INPUT_CHARS` | Max source chars sent to the summary LLM | `3000` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_TOKENS` | Summary output token cap | `256` |

### Namespace Policy Rules

Path-glob → namespace mappings that auto-tag files at index time, so you don't pass `namespace=` on every `mem_index` call.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | JSON list of `{path_glob, namespace}` objects. `pathspec.GitIgnoreSpec` patterns, case-insensitive. `{parent}` and `{ancestor:N}` placeholders expand from the matched file path. Resolution order: explicit `namespace=` param → rules (first match) → `enable_auto_ns` → `default_namespace`. | `[]` |
| `MEMTOMEM_NAMESPACE__DEFAULT_NAMESPACE` | Default namespace for new chunks | `"default"` |
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
| `MEMTOMEM_RERANK__PROVIDER` | `fastembed` (local ONNX) / `cohere` (external API) / `local` (sentence-transformers `CrossEncoder`, local). `local` needs `sentence-transformers` installed separately; no memtomem extra includes it. `MEMTOMEM_RERANK__MODEL` then takes a sentence-transformers model name (e.g. `cross-encoder/ms-marco-MiniLM-L-6-v2`). `fastembed` is usually preferable | `"fastembed"` |
| `MEMTOMEM_RERANK__MODEL` | Model name; its form depends on the provider (a fastembed catalog ID, a Cohere Rerank model, or a sentence-transformers model name). With `fastembed`, for non-English content use `onnx-community/gte-multilingual-reranker-base` (341 MB; memtomem registers it with fastembed itself, so it needs no setup). `jinaai/jina-reranker-v2-base-multilingual` still works but is 1.1 GB and its model license (CC-BY-NC-4.0) does not allow commercial use. The Korean-optimized preset leaves reranking off, so pair the model with `MEMTOMEM_RERANK__ENABLED=true` | `"Xenova/ms-marco-MiniLM-L-6-v2"` |
| `MEMTOMEM_RERANK__API_KEY` | Only required when `provider=cohere` | `""` |
| `MEMTOMEM_RERANK__OVERSAMPLE` | Pool multiplier over `response_top_k`. Pool size is `max(min_pool, min(max_pool, int(oversample * response_top_k)))`. | `2` |
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
| `MEMTOMEM_SEARCH__RRF_WEIGHTS` | RRF weights for `[BM25, Dense]` (JSON list, REPLACE merge) | `[1,1]` |
| `MEMTOMEM_SEARCH__TOKENIZER` | FTS tokenizer: `unicode61` or `kiwipiepy` | `"unicode61"` |
| `MEMTOMEM_SEARCH__CACHE_TTL` | Search result cache TTL in seconds | `30` |
| `MEMTOMEM_SEARCH__SYSTEM_NAMESPACE_PREFIXES` | Namespace prefixes hidden from default `namespace=None` search (JSON list, APPEND merge) | `["archive:","agent-runtime:"]` |

### Decay (time-based scoring)

Half-life decay multiplier applied to hybrid-search scores. Gradually deprioritises older chunks.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_DECAY__ENABLED` | Enable time-based decay weighting | `false` |
| `MEMTOMEM_DECAY__HALF_LIFE_DAYS` | Half-life in days — a chunk's contribution halves every interval | `30` |

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
| `MEMTOMEM_IMPORTANCE__WEIGHTS` | Importance-feature weight vector (JSON list, REPLACE merge) | `[0.3,0.2,0.3,0.2]` |

### Query expansion

Augments the original query with related tags, headings, or LLM-generated terms to improve recall. `strategy=llm` uses the LLM section below.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_QUERY_EXPANSION__ENABLED` | Enable query expansion | `false` |
| `MEMTOMEM_QUERY_EXPANSION__MAX_TERMS` | Max additional terms to append | `3` |
| `MEMTOMEM_QUERY_EXPANSION__STRATEGY` | `tags` / `headings` / `both` / `llm` | `"tags"` |

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
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / `anthropic` / compatible endpoint | `"ollama"` |
| `MEMTOMEM_LLM__MODEL` | Model name. Empty = provider-specific default | `""` |
| `MEMTOMEM_LLM__BASE_URL` | Endpoint URL | `"http://localhost:11434"` |
| `MEMTOMEM_LLM__API_KEY` | API key for paid providers | `""` |
| `MEMTOMEM_LLM__MAX_TOKENS` | Generation token cap | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | Request timeout in seconds | `60` |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (9 names incl. `mem_do`) / `standard` (38) / `full` (100 current tools; no deprecated aliases) | `core` |

### Web UI

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod` (standard Simple/Advanced pages, including Namespaces under Settings) / `dev` (also adds maintainer pages: Sessions, Search Runs, Quality Lab, Working Memory, Procedures, Health Report, Redaction). `mm web --mode` and `mm web --dev` override this at launch. | `prod` |
| `MEMTOMEM_WEB__HOST` | Bind address for `mm web`; overridden by `--host` | `127.0.0.1` |
| `MEMTOMEM_WEB__PORT` | Bind port for `mm web`; overridden by `--port` | `8080` |
| `MEMTOMEM_WEB__CSRF_ENFORCE` | Enforce CSRF protection on mutating Web UI endpoints. Disable only as an emergency rollback. | `true` |

### Lifecycle policies & webhooks

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | Run PolicyScheduler (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | Scheduler tick interval | `60` |
| `MEMTOMEM_POLICY__MAX_ACTIONS_PER_RUN` | Cumulative action cap per scheduled policy run | `100` |
| `MEMTOMEM_WEBHOOK__ENABLED` | Enable outbound webhooks for memory events | `false` |
| `MEMTOMEM_WEBHOOK__URL` | Webhook target URL | `""` |
| `MEMTOMEM_WEBHOOK__EVENTS` | Event types to send (JSON list, APPEND merge) | `["add","delete","search"]` |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC signing secret | `""` |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP timeout | `10` |
| `MEMTOMEM_WEBHOOK__ALLOW_PRIVATE_HOSTS` | Allow delivery to a receiver on this machine or LAN. When off, the URL's host must not resolve to a private, loopback, link-local or reserved address, checked where the socket opens and not only at startup. | `false` |
| `MEMTOMEM_WEBHOOK__PROXY` | Explicit forward proxy (`http://` or `https://`). Webhooks never use an ambient `HTTP(S)_PROXY`; with a proxy set, the proxy connects to the receiver and the address policy is the proxy's to enforce. | `""` |

### Consolidation schedule

Background job that periodically groups near-duplicate memories and compresses them into archive summaries.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__ENABLED` | Run the consolidation scheduler | `false` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__INTERVAL_HOURS` | Scheduler interval (hours) | `24` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MIN_GROUP_SIZE` | Minimum group size to consolidate | `3` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MAX_GROUPS` | Max groups processed per run | `10` |

### Warmup

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WARMUP__ENABLED` | Pre-load local embedding/reranker models in a background task at MCP server startup. Remote providers are skipped. | `false` |

### Health watchdog

Background loop for periodic health checks and automatic maintenance. Missing sources are held out of search rather than deleted (a source under both an index root and `indexing.retain_missing_dirs` stays searchable instead, unless it is held for another reason); purging their chunks is an explicit `mm gc orphan-sources --apply`.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_HEALTH_WATCHDOG__ENABLED` | Run the health watchdog | `false` |
| `MEMTOMEM_HEALTH_WATCHDOG__HEARTBEAT_INTERVAL_SECONDS` | Heartbeat interval | `60` |
| `MEMTOMEM_HEALTH_WATCHDOG__DIAGNOSTIC_INTERVAL_SECONDS` | Diagnostic-check interval | `300` |
| `MEMTOMEM_HEALTH_WATCHDOG__DEEP_INTERVAL_SECONDS` | Deep-scan interval | `3600` |
| `MEMTOMEM_HEALTH_WATCHDOG__MAX_SNAPSHOTS` | Snapshot retention cap | `1000` |
| `MEMTOMEM_HEALTH_WATCHDOG__ORPHAN_CLEANUP_THRESHOLD` | Missing-source count at which auto-maintenance holds them (no chunks are deleted) | `10` |
| `MEMTOMEM_HEALTH_WATCHDOG__AUTO_MAINTENANCE` | Perform automatic maintenance | `true` |

### Scheduler

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SCHEDULER__ENABLED` | Enable cron dispatch for registered maintenance jobs | `false` |
| `MEMTOMEM_SCHEDULER__MAX_CONCURRENT_JOBS` | Max concurrently running scheduled jobs | `1` |
| `MEMTOMEM_SCHEDULER__DEFAULT_TIMEZONE` | Schedule timezone; Phase A honors `utc` | `"utc"` |
| `MEMTOMEM_SCHEDULER__RUNNER_TIMEOUT_SECONDS` | Timeout for one scheduled job run | `300` |

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
| `MEMTOMEM_SESSION_TRACE__JSONL_PATH` | JSONL output file path | `"~/.memtomem/traces/session-traces.jsonl"` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_ENABLED` | Emit traces to the Langfuse sink | `false` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_HOST` | Langfuse host URL | `""` |
| `MEMTOMEM_SESSION_TRACE__SAMPLING_RATE` | 0.0–1.0. Fraction of sessions recorded | `1` |
| `MEMTOMEM_SESSION_TRACE__PAYLOAD_MODE` | `metadata` (no body) / `redacted` (secret-masked body) / `full` (entire body) | `"metadata"` |
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
| `MEMTOMEM_HOOKS__TARGET_SCOPE` | Scope for memtomem-managed Claude Code settings hooks: `user`, `project_shared`, or `project_local` | `"user"` |
| `MEMTOMEM_CONTEXT_GATEWAY__KNOWN_PROJECTS_PATH` | Web UI project registry for Context Gateway | `"~/.memtomem/known_projects.json"` |
| `MEMTOMEM_CONTEXT_GATEWAY__EXPERIMENTAL_CLAUDE_PROJECTS_SCAN` | Decode `~/.claude/projects/<encoded>` directory names back into project roots and scan them (includes unverified candidates) | `false` |
| `MEMTOMEM_CONTEXT_GATEWAY__AUTO_DISPLAY_CONFIGURED_PROJECTS` | Auto-display a scanned project only when its root carries a recognized runtime marker (`.claude`/`.gemini`/`.codex`/`.agents`/`.kimi`/`.memtomem`) | `true` |

User-tier writes are protected by explicit host-write confirmation; there is no `USER_TIER_ENABLED` configuration field.

### Advanced / operator paths

These process-level variables are not part of the layered `config.json` / `config.d` model.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WIKI_PATH` | Override the wiki store location | `~/.memtomem-wiki` |
| `MEMTOMEM_FASTEMBED_CACHE` | Override the ONNX / FastEmbed model cache (checked before `FASTEMBED_CACHE_PATH`) | `~/.memtomem/cache/fastembed` |
| `MEMTOMEM_INDEX_DEBOUNCE_QUEUE` | Override the file-watcher debounce queue file | state directory |

### Embedding provider comparison

| Provider | GPU | Cost | Notes |
|---|---|---|---|
| `onnx` | No | Free | Built-in via fastembed. ~270 MB on first run |
| `ollama` | No | Free | Requires Ollama. `ollama pull nomic-embed-text` |
| `openai` | No | Paid | Requires API key |

> Full list: [configuration.md](https://github.com/memtomem/memtomem/blob/v0.6.12/docs/guides/configuration.md) in the upstream repo.

## Defaults from pinned sources

Defaults above are schema declarations before initialization presets. `mm init` may change the provider, dimension, and memory directories. OTLP and Langfuse are independent opt-ins. Pass environment variables to the child MCP process and reconnect.

### Core additional settings

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_ENTITY_BOOST__ENABLED` | Enable query-entity score boosting | `false` |
| `MEMTOMEM_ENTITY_BOOST__MAX_BOOST` | Maximum entity score multiplier | `1.5` |
| `MEMTOMEM_ENTITY_BOOST__MIN_CONFIDENCE` | Minimum entity confidence | `0` |
| `MEMTOMEM_ENTITY_BOOST__QUERY_ENTITY_TYPES` | Entity types used for query matching | `["date","person","technology"]` |
| `MEMTOMEM_INDEXING__EXTRACT_ENTITIES` | Extract entities during indexing | `true` |
| `MEMTOMEM_RERANK__TIMEOUT_S` | Reranker timeout in seconds | `30` |
