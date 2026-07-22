---
title: Hybrid Search
description: How BM25 keyword + dense vector + RRF fusion search works and how to tune it.
---

> New to memtomem? Start with the [Memory Persistence Across Sessions](/guides/memory-persistence/) tutorial to see the basic search flow in action first.

memtomem's hybrid search combines keyword search and semantic search, leveraging both exact term matching and meaning-based similarity in a single query.

### Why both?

Keyword search finds exact names like `mem_search` or `FastAPI` — things a vector model often misses because their meaning isn't distributed across the embedding space. Semantic search finds ideas like "how do I deploy?" that match documents using different wording. Running both and merging the rankings covers both cases.

## Search Architecture

Hybrid search runs three search engines in parallel:

| Engine | Based on | Strength |
|---|---|---|
| **BM25** | SQLite FTS5 | Exact keyword/term matching. Strong for unique identifiers like "FastAPI", "mem_search" |
| **Vector search** | sqlite-vec + ONNX/Ollama/OpenAI embeddings | Semantic similarity. Can match "how to deploy" → "deployment checklist" |
| **RRF fusion** | Reciprocal Rank Fusion | Combines rankings from both engines into a final score |

## Reranker Pool Tuning

When reranking is enabled, the reranker sees a candidate pool of size `max(min_pool, min(max_pool, int(oversample * response_top_k)))`. The defaults (oversample `2.0`, min_pool `20`, max_pool `200`) give the classic 2× oversample at `top_k=10` and scale up with larger `top_k` requests. Tune with:

| Key | Env var | Default | Notes |
|---|---|---|---|
| `rerank.oversample` | `MEMTOMEM_RERANK__OVERSAMPLE` | `2.0` | Pool multiplier over `response_top_k` |
| `rerank.min_pool` | `MEMTOMEM_RERANK__MIN_POOL` | `20` | Floor — reranker never sees fewer candidates |
| `rerank.max_pool` | `MEMTOMEM_RERANK__MAX_POOL` | `200` | Cap — prevents runaway cost on large `top_k` |

Runtime-tunable via `mm config set rerank.oversample 3.0` etc. The remaining `rerank.*` keys, including reranker model selection, are covered in the [configuration reference](/reference/configuration/).

## Semantic Chunking

During indexing, supported documents are split into meaningful units by structure before the short-section merge pass runs.

| Chunker | Target | Behavior |
|---|---|---|
| **Markdown** | `.md` files | Split by heading level, preserving hierarchy |
| **Structured data** | `.json`, `.yaml`, `.yml`, `.toml` files | Top-level key splitting, with recursive mode available via config |
| **Code** | `.py`, `.js`, `.ts`, `.tsx`, `.jsx` files | Function / class-aware splitting when code chunking extras are installed |

Very short sections are greedily packed with adjacent siblings up to `indexing.target_chunk_tokens` (default `384`) to keep each chunk informative enough to retrieve. Set `target_chunk_tokens=0` to disable the pass and keep every small section as its own chunk.

Directory indexing is extension-filtered. If a file type is not chunked by the active registry, it is skipped rather than indexed as plain text.

## Incremental Indexing

Instead of full re-indexing, only changed chunks are updated:

1. Store **SHA-256 hash** for each chunk
2. On re-index, compare hashes to detect changes
3. Only re-embed changed chunks

This minimizes indexing cost even for large document sets.

## Search Scope and Maintenance

Searches can be scoped by namespace. Folder-based derivation is disabled by default (`namespace.enable_auto_ns=false`); use an explicit namespace, a path rule, or opt into auto derivation. Per-agent namespaces stay out of unscoped search by default. See [Multi-Agent](/ltm/multi-agent/) for details.

Structured search responses identify the active `score_scale` (`rrf`, `bm25`, `dense`, `none`, or `rerank`). Do not compare one fixed threshold across different scales; clients such as STM use this metadata to gate or suspend scale-specific filtering.

Maintenance behaviors that affect search quality — near-duplicate detection, time-based decay, TTL expiration, and auto-tagging — are documented alongside their environment variables in the [configuration reference](/reference/configuration/).

## Retrieval benchmark v2

The current holdout evaluates 120 bilingual queries across separate English,
Korean, and cross-language tracks with portable qrels and pinned corpus/query
hashes. It complements the original 48-file, 192-chunk, 100-query regression
portfolio rather than replacing it.

A one-run staged k-sweep retained the product defaults: `top_k=10`, BM25/dense
candidates `50/50`, `rrf_k=60`, and reranking disabled. Candidate width 100 at
`top_k=5` is only a follow-up candidate; repeated 5-run/10-run validation is
required before any default change.
