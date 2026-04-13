---
title: Hybrid Search
description: How BM25 keyword + dense vector + RRF fusion search works and how to tune it.
---

memtomem's hybrid search combines keyword search and semantic search, leveraging both exact term matching and meaning-based similarity in a single query.

## Search Architecture

Hybrid search runs three search engines in parallel:

| Engine | Based on | Strength |
|---|---|---|
| **BM25** | SQLite FTS5 | Exact keyword/term matching. Strong for unique identifiers like "FastAPI", "mem_search" |
| **Vector search** | sqlite-vec + ONNX/Ollama/OpenAI embeddings | Semantic similarity. Can match "how to deploy" → "deployment checklist" |
| **RRF fusion** | Reciprocal Rank Fusion | Combines rankings from both engines into a final score |

## Semantic Chunking

During indexing, documents are split into meaningful units — not by token count, but by structure. Six chunking strategies:

| Strategy | Target | Behavior |
|---|---|---|
| **Markdown** | `.md` files | Split by heading level, preserving hierarchy |
| **Python AST** | `.py` files | Split by function/class, including docstrings |
| **JS/TS AST** | `.js`, `.ts` files | tree-sitter based function/module splitting |
| **JSON** | `.json` files | Structure-aware splitting |
| **YAML/TOML** | `.yaml`, `.toml` | Key-value block splitting |
| **Plain text** | Other files | Paragraph/newline based splitting |

## Incremental Indexing

Instead of full re-indexing, only changed chunks are updated:

1. Store **SHA-256 hash** for each chunk
2. On re-index, compare hashes to detect changes
3. Only re-embed changed chunks

This minimizes indexing cost even for large document sets.

## Namespaces

Organize memories into scoped groups:

- Namespace auto-derived from folder names
- Filter by namespace when searching
- Support agent-level isolation and sharing in multi-agent environments

## Maintenance Features

- **Near-duplicate detection** — automatically identify memories with nearly identical content
- **Time-based decay** — gradually decrease search weight for older memories
- **TTL expiration** — automatically delete memories past their configured lifespan
- **Auto-tagging** — automatically assign tags based on content analysis
