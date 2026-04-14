---
title: Environment Variables
description: Configuration reference for memtomem LTM and STM environment variables.
---

Both memtomem (LTM) and memtomem-stm (STM) are configured via environment variables. CLI flags take precedence over environment variables when both are set.

## LTM Configuration (memtomem)

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMTOMEM_EMBEDDING_PROVIDER` | Embedding provider: `onnx`, `ollama`, or `openai` | `onnx` |
| `MEMTOMEM_DB_PATH` | SQLite database file path | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_TOOL_MODE` | Tool exposure mode: `core` (9 tools + mem_do) or `full` (74 tools) | `core` |
| `MEMTOMEM_DEFAULT_NAMESPACE` | Default namespace for new memories | `default` |
| `MEMTOMEM_OLLAMA_MODEL` | Ollama model name (when using ollama provider) | `nomic-embed-text` |
| `MEMTOMEM_OPENAI_API_KEY` | OpenAI API key (when using openai provider) | — |

### Embedding Provider Comparison

| Provider | GPU Required | Cost | Latency | Notes |
|----------|-------------|------|---------|-------|
| `onnx` | No | Free | Fast | Default. ~270MB model download on first run |
| `ollama` | No | Free | Medium | Requires Ollama installed. `ollama pull nomic-embed-text` |
| `openai` | No | Paid | Varies | Uses OpenAI API. Requires API key |

## STM Configuration (memtomem-stm)

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMTOMEM_STM_COMPRESSION` | Default compression strategy | `auto` |
| `MEMTOMEM_STM_SURFACING` | Enable proactive surfacing | `true` |
| `MEMTOMEM_STM_CACHE_ENABLED` | Enable response caching | `true` |
| `MEMTOMEM_STM_CACHE_TTL` | Cache time-to-live in seconds | `300` |
| `MEMTOMEM_STM_MIN_SCORE` | Initial surfacing relevance threshold | `0.3` |

### Compression Strategies

Available values for `MEMTOMEM_STM_COMPRESSION`:

| Strategy | Description |
|----------|-------------|
| `auto` | Auto-select based on content type (recommended) |
| `truncate` | Simple truncation |
| `hybrid` | Keyword + structural compression |
| `selective` | Keep only relevant sections |
| `progressive` | TOC + cursor-based delivery |
| `extract_fields` | Extract key fields from structured data |
| `schema_pruning` | Remove unused schema fields |
| `skeleton` | Structure-only skeleton |
| `llm_summary` | LLM-powered summarization |
| `none` | No compression |

## Precedence

Configuration is resolved in this order (highest priority first):

1. **CLI flags** — `mm serve --db-path /custom/path`
2. **Environment variables** — `MEMTOMEM_DB_PATH=/custom/path`
3. **Config file** — Set via `mm init` wizard
4. **Defaults** — Built-in default values

> See the [Installation guide](/guides/installation/) for initial setup, and each repository's README for the full configuration reference.
