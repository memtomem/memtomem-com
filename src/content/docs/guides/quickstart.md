---
title: Quick Start
description: Get memtomem installed and store your first memory in under 5 minutes.
---

In 5 minutes you'll have memtomem installed, connected to your MCP client, and answering questions about your notes and code. No GPU, no external account, no database setup.

## 1. Install

```bash
uv tool install memtomem          # or: pipx install memtomem
```

Optionally, also install the STM proxy:

```bash
uv tool install memtomem-stm      # or: pip install memtomem-stm
```

> memtomem works out of the box with keyword-only (BM25) search. For semantic search you can pick an embedding provider in the setup wizard — ONNX (built-in, local), Ollama (local), or OpenAI. See the [Embeddings guide](https://github.com/memtomem/memtomem/blob/main/docs/guides/embeddings.md).

## 2. Setup

Run the interactive setup wizard. It asks for your embedding provider (ONNX / Ollama / OpenAI), where to store the database, and your default namespace — you can accept every default by passing `-y`.

```bash
mm init                            # interactive setup
mm init -y                         # auto-accept defaults (for CI)
```

During `mm init` you can opt in to indexing AI agent memory directories — Claude Code memory (`~/.claude/projects/<project>/memory/`), Claude Code plans (`~/.claude/plans/`), and Codex CLI memories (`~/.codex/memories/`).

If you also want the STM proxy, run its first-time setup:

```bash
mms init                           # STM guided wizard
mms health                         # probe registered upstream servers
```

## 3. Connect your MCP client

### Claude Code

```bash
claude mcp add memtomem -s user -- memtomem-server
```

With STM proxy:

```bash
claude mcp add memtomem-stm -s user -- memtomem-stm
```

### Cursor / Windsurf / Claude Desktop

Register `memtomem-server` or `memtomem-stm` as a stdio MCP server in your editor's MCP settings. See [MCP Client Setup](https://github.com/memtomem/memtomem/blob/main/docs/guides/mcp-client-setup.md) for details.

## 4. Use

You don't call these tools directly — tell your agent in plain language and it chooses the right tool.

| Tell your agent | MCP tool called | What you'll see |
|---|---|---|
| "Check server status" | `mem_status` | Connection info, namespace list, total memory count |
| "Index my ~/notes folder" | `mem_index(path="~/notes")` | Number of files indexed, chunks created |
| "Search for deployment" | `mem_search(query="deployment checklist")` | Ranked memory hits with snippets |
| "Remember this insight" | `mem_add(content="...", tags=["ops"])` | Confirmation with the new memory's namespace and ID |

## Next

- [Installation](/guides/installation/) — optional extras, embedding providers, full CLI
- [LTM Overview](/ltm/overview/) — what the LTM server does and how search actually works
- [STM Overview](/stm/overview/) — when the optional STM proxy is worth adding
- [Hybrid Search](/ltm/hybrid-search/) — BM25 + vector + RRF fusion explained

## Packages

| Package | Description |
|---------|-------------|
| **memtomem** | Core — MCP server, CLI (`mm`), Web UI, hybrid search, storage |
| **memtomem-stm** | STM proxy — proactive memory surfacing via transparent MCP proxying |

The two packages have no Python-level dependency on each other. All communication between STM and LTM happens over the MCP protocol — they can be deployed and upgraded independently.
