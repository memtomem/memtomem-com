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
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | Directories indexed on start (JSON list). Populated by `mm init` when you opt in to AI agent memory enrollment. | `[]` |
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

### Search

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | Default result count | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 candidate pool size | — |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | Dense vector candidate pool size | — |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion constant | — |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (9 tools + `mem_do`) / `standard` (~32) / `full` (74) | `core` |

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
