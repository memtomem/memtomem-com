---
title: Installation
description: Detailed installation guide for memtomem and memtomem-stm.
---

## Requirements

- **Python 3.12+**
- **pip**, **uv**, or **pipx**
- An embedding provider for semantic search — pick one during `mm init` (see [Embedding Providers](#embedding-providers) below). Fine to skip at first: memtomem works keyword-only until you choose.

## LTM Server (memtomem)

### Using uv (recommended)

```bash
uv tool install memtomem
```

### Using pipx

```bash
pipx install memtomem
```

### Using pip

```bash
pip install memtomem
```

### Optional extras

The base package already works — install only the extras you actually need.

```bash
pip install memtomem[onnx]         # fastembed local embeddings (recommended default)
pip install memtomem[ollama]       # Ollama provider client
pip install memtomem[openai]       # OpenAI provider client
pip install memtomem[korean]       # kiwipiepy Korean morphological analysis
pip install memtomem[code]         # tree-sitter (Python / JS / TS) AST chunking
pip install memtomem[web]          # FastAPI + uvicorn for the Web UI
pip install memtomem[all]          # everything
```

After installation, the `mm` CLI is available:

```bash
mm init          # interactive setup wizard
mm --version     # print installed version
mm web           # launch Web UI dashboard (http://localhost:8080)
```

The MCP server itself ships as the `memtomem-server` console script. You don't run it by hand — your MCP client (Claude Desktop, Claude Code, Cursor, etc.) launches it automatically once `memtomem` is registered in the client's MCP config.

## STM Proxy (memtomem-stm)

### Using uv (recommended)

```bash
uv tool install memtomem-stm
```

### Run without installing (uvx)

```bash
uvx memtomem-stm --help
```

### Using pip

```bash
pip install memtomem-stm
```

### Optional extras

```bash
pip install memtomem-stm[langfuse]     # Langfuse observability tracing
pip install memtomem-stm[langchain]    # LangChain agent integration
```

After installation, the `mms` CLI is available:

```bash
mms init --mcp claude              # first-time setup + auto-register with Claude Code
mms add <name> --command <cmd>     # register an upstream MCP server
mms add --from-clients             # bulk-import upstreams from existing MCP client configs
mms list                           # list registered servers
mms health                         # probe upstream connectivity
mms --version                      # print installed version
```

The STM proxy itself ships as the `memtomem-stm` console script. As with LTM, you don't launch it by hand — once `memtomem-stm` is registered with your MCP client (via `mms init --mcp claude`, `mms register`, or a `.mcp.json` entry), the client starts it automatically.

## Embedding Providers

| Provider | Setup | GPU | Cost |
|---|---|---|---|
| **ONNX** (fastembed) | Built-in | Not required | Free |
| **Ollama** | `ollama pull nomic-embed-text` | Not required | Free |
| **OpenAI** | API key required | — | Paid |

**Not sure which to pick?** Start with **ONNX** — it's fully local, free, and needs no extra daemon or API key. You can always switch later by re-running `mm init` or setting `MEMTOMEM_EMBEDDING__PROVIDER` (note the double underscore — nested pydantic-settings keys use `__` as delimiter).

## Tech Stack

| Category | Technology |
|----------|-----------|
| MCP | FastMCP (stdio, SSE, Streamable HTTP) |
| Framework | Pydantic v2, Click (CLI), FastAPI (Web UI) |
| Database | SQLite (FTS5 full-text search), sqlite-vec (vector search) |
| Code parsing | tree-sitter (Python, JS, TS AST) |
| Korean | kiwipiepy morphological analyzer (optional) |
| Observability | Langfuse (optional) |
