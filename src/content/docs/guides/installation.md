---
title: Installation
description: Detailed installation guide for memtomem and memtomem-stm.
---

## Requirements

- **Python 3.12+**
- **pip**, **uv**, or **pipx**
- Embeddings: ONNX (built-in) / Ollama (~270MB) / OpenAI API

## LTM Server (memtomem)

```bash
# uv (recommended)
uv tool install memtomem

# pipx
pipx install memtomem

# pip
pip install memtomem
```

### Optional extras

```bash
pip install memtomem[korean]       # kiwipiepy Korean morphological analysis
```

After installation, the `mm` CLI is available:

```bash
mm init          # interactive setup wizard
mm serve         # start MCP server
mm web           # launch Web UI dashboard
```

## STM Proxy (memtomem-stm)

```bash
# uv (recommended)
uv tool install memtomem-stm

# run without installing
uvx memtomem-stm --help

# pip
pip install memtomem-stm
```

### Optional extras

```bash
pip install memtomem-stm[langfuse]     # Langfuse observability tracing
pip install memtomem-stm[langchain]    # LangChain agent integration
```

After installation, the `mms` CLI is available:

```bash
mms add <name> --command <cmd>     # register upstream MCP server
mms list                           # list registered servers
mms serve                          # start STM proxy
```

## Embedding Providers

| Provider | Setup | GPU | Cost |
|---|---|---|---|
| **ONNX** (fastembed) | Built-in | Not required | Free |
| **Ollama** | `ollama pull nomic-embed-text` | Not required | Free |
| **OpenAI** | API key required | — | Paid |

Choose a provider during `mm init` or set the `MEMTOMEM_EMBEDDING_PROVIDER` environment variable.

## Tech Stack

| Category | Technology |
|----------|-----------|
| MCP | FastMCP (stdio, SSE, Streamable HTTP) |
| Framework | Pydantic v2, Click (CLI), FastAPI (Web UI) |
| Database | SQLite (FTS5 full-text search), sqlite-vec (vector search) |
| Code parsing | tree-sitter (Python, JS, TS AST) |
| Korean | kiwipiepy morphological analyzer (optional) |
| Observability | Langfuse (optional) |
