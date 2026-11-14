---
title: Hybrid Search
description: How BM25 keyword + dense vector + RRF fusion search works and how to tune it.
---

> New to memtomem? Start with the [Memory Persistence Across Sessions](/ltm/memory-persistence/) tutorial to see the basic search flow in action first.

memtomem's hybrid search combines keyword search and semantic search, leveraging both exact term matching and meaning-based similarity in a single query.

## Why both?

Keyword search finds exact names like `mem_search` or `FastAPI` — things a vector model often misses because their meaning isn't distributed across the embedding space. Semantic search finds ideas like "how do I deploy?" that match documents using different wording. Running both and merging the rankings covers both cases.

## Search Architecture

With an embedding provider enabled, BM25 and vector retrieval run in parallel, followed by RRF fusion. With `embedding.provider=none` (including the minimal preset), search is keyword-only:

<figure class="flow-diagram">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 542" role="img" aria-labelledby="search-flow-title search-flow-desc">
<title id="search-flow-title">How memtomem ranks search results</title>
<desc id="search-flow-desc">A query from mem_search or mm search runs BM25 keyword search and vector search in parallel. RRF fusion combines the two rankings into one. A cross-encoder reranker runs next only when reranking is enabled; it is off by default. Both retrievers apply the source filter: BM25 before its candidate limit, vector search within its nearest-neighbor pool. After reranking, the source filter is checked again, the temporal validity filter runs, and the top results are returned, 10 by default. With embedding.provider=none, only BM25 runs.</desc>
<defs><marker id="search-flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-head" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<rect class="fd-box" x="140" y="16" width="200" height="48" rx="8"/>
<text class="fd-title" x="240" y="38" text-anchor="middle">Query</text>
<text class="fd-note" x="240" y="56" text-anchor="middle">mem_search · mm search</text>
<path class="fd-arrow" d="M 240 64 V 84 H 130 V 104" marker-end="url(#search-flow-head)"/>
<path class="fd-arrow" d="M 240 84 H 350 V 104" marker-end="url(#search-flow-head)"/>
<rect class="fd-stage" x="30" y="106" width="200" height="72" rx="8"/>
<text class="fd-title" x="130" y="132" text-anchor="middle">BM25</text>
<text class="fd-note" x="130" y="152" text-anchor="middle">SQLite FTS5</text>
<text class="fd-note" x="130" y="169" text-anchor="middle">exact terms</text>
<rect class="fd-stage" x="250" y="106" width="200" height="72" rx="8"/>
<text class="fd-title" x="350" y="132" text-anchor="middle">Vector search</text>
<text class="fd-note" x="350" y="152" text-anchor="middle">sqlite-vec</text>
<text class="fd-note" x="350" y="169" text-anchor="middle">similar meaning</text>
<path class="fd-arrow" d="M 130 178 V 196 H 240 V 214" marker-end="url(#search-flow-head)"/>
<path class="fd-arrow" d="M 350 178 V 196 H 240"/>
<rect class="fd-box" x="140" y="216" width="200" height="52" rx="8"/>
<text class="fd-title" x="240" y="239" text-anchor="middle">RRF fusion</text>
<text class="fd-note" x="240" y="258" text-anchor="middle">one ranking · k = 60</text>
<path class="fd-arrow" d="M 240 268 V 300" marker-end="url(#search-flow-head)"/>
<rect class="fd-optional" x="140" y="302" width="200" height="52" rx="8"/>
<text class="fd-title" x="240" y="325" text-anchor="middle">Rerank</text>
<text class="fd-note" x="240" y="344" text-anchor="middle">optional · off by default</text>
<path class="fd-arrow" d="M 240 354 V 386" marker-end="url(#search-flow-head)"/>
<rect class="fd-box" x="140" y="388" width="200" height="52" rx="8"/>
<text class="fd-title" x="240" y="411" text-anchor="middle">Filters</text>
<text class="fd-note" x="240" y="430" text-anchor="middle">source recheck · validity</text>
<path class="fd-arrow" d="M 240 440 V 472" marker-end="url(#search-flow-head)"/>
<rect class="fd-mem" x="140" y="474" width="200" height="52" rx="8"/>
<text class="fd-title" x="240" y="497" text-anchor="middle">Results</text>
<text class="fd-note" x="240" y="516" text-anchor="middle">top_k, default 10</text>
</svg>
<figcaption>The default search path. The source filter runs inside both retrievers and is checked again after reranking. With <code>embedding.provider=none</code>, including the minimal preset, only BM25 runs.</figcaption>
</figure>

| Engine | Based on | Strength |
|---|---|---|
| **BM25** | SQLite FTS5 | Exact keyword/term matching. Strong for unique identifiers like "FastAPI", "mem_search" |
| **Vector search** | sqlite-vec + ONNX/Ollama/OpenAI embeddings | Semantic similarity. Can match "how to deploy" → "deployment checklist" |
| **RRF fusion** | Reciprocal Rank Fusion | Combines rankings from both engines into a final score |

BM25 path fallback indexes only the filename stem without its extension (`octopus` finds `octopus.md`), so subfolder names below the memory directory do not match files inside them. Existing databases rewrite that field once when first opened by 0.7.9; if 0.7.8 or older later writes or moves a file in the same database, full-path matching returns on those rows until `mm index <memory dir> --force` or an FTS rebuild runs.

If vector retrieval raises an error (for example, the embedding server is unreachable), the remaining results are still returned, and when there are any they carry the notice `semantic search failed for this query — results may be incomplete`. It appears at the end of `mem_search`'s compact output, in the structured `hints` array, on `mm search`'s stderr and in `mem_ask`'s grounded prompt. It does not mean the results are keyword-only: the session-summary rescue search can still contribute vector hits. When vector retrieval is skipped because of an embedding mismatch, a separate notice that names the fix appears instead, and an empty result set is reported as before.

## Reranker Pool Tuning

When reranking is enabled, the reranker sees a candidate pool of size `max(response_top_k, min_pool, min(max_pool, int(oversample * response_top_k)))`. The defaults (oversample `2.0`, min_pool `20`, max_pool `200`) give the classic 2× oversample at `top_k=10` and scale up with larger `top_k` requests. The pool is never smaller than the requested `top_k`, so `max_pool` no longer cuts a larger request short; the response still holds only as many results as there are matching candidates. Tune with:

| Key | Env var | Default | Notes |
|---|---|---|---|
| `rerank.oversample` | `MEMTOMEM_RERANK__OVERSAMPLE` | `2.0` | Pool multiplier over `response_top_k` |
| `rerank.min_pool` | `MEMTOMEM_RERANK__MIN_POOL` | `20` | Floor — reranker never sees fewer candidates |
| `rerank.max_pool` | `MEMTOMEM_RERANK__MAX_POOL` | `200` | Cap on the oversampled pool; a larger `top_k` or `min_pool` still wins |

Runtime-tunable via `mm config set rerank.oversample 3.0` etc. (`rerank.enabled` is also runtime-mutable via `mm config set` / `mem_config`). The remaining `rerank.*` keys, including reranker model selection, are covered in the [configuration reference](/ltm/configuration/).

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

`mem_search`'s structured response always carries a top-level `recorded` key, empty responses included: `true` in the default recording mode and `false` under `record=false`. It reports which mode applied, not that a write happened. Compact and verbose output are unchanged, and servers before 0.6.8 omit the key. Callers with a strict turn budget can also pass `deadline_ms` (a positive integer in milliseconds) to bound server-side processing time.

Maintenance and post-fusion behaviors that affect search quality — near-duplicate detection, time-based decay, access/importance/entity boosts, MMR diversity reranking (which runs after time decay and score boosts), TTL expiration, and auto-tagging — are documented alongside their environment variables in the [configuration reference](/ltm/configuration/).

## Retrieval benchmark v2

The current holdout evaluates 120 bilingual queries across separate English,
Korean, and cross-language tracks with portable qrels and pinned corpus/query
hashes. It complements the original 48-file, 192-chunk, 100-query regression
portfolio rather than replacing it.

A one-run staged k-sweep retained the product defaults: `top_k=10`, BM25/dense
candidates `50/50`, `rrf_k=60`, and reranking disabled. Candidate width 100 at
`top_k=5` is only a follow-up candidate; repeated 5-run/10-run validation is
required before any default change.

## Filter boundaries

Project scope is enforced at retrieval. Tag filters are applied in BM25/recall SQL, while dense retrieval checks tags after its bounded nearest-neighbor pool and may miss a rare tagged match outside that pool. BM25 tag filtering still requires a lexical query match: tag text is not itself indexed by FTS.

The source substring/glob filter is applied inside both retrievers and checked again after reranking. BM25 applies it in SQL before its candidate limit; vector search checks it within its bounded nearest-neighbor pool, so, as with tags, it may miss a rare matching source outside that pool. The temporal validity filter runs after reranking. Do not treat every filter as an identical SQL prefilter or assume that filtering guarantees a full `top_k` result set.
