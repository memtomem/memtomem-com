---
title: Quick Start
description: Get memtomem installed and store your first memory in under 5 minutes.
---

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

Run the interactive 8-step wizard:

```bash
mm init                            # interactive setup
mm init -y                         # auto-accept defaults (for CI)
```

memtomem auto-indexes `~/.claude/projects`, `~/.gemini`, and `~/.codex/memories` out of the box — conversations and memories from these agents become searchable without any extra configuration.

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

Use memory through your AI agent:

| Tell your agent | MCP tool called |
|---|---|
| "Check server status" | `mem_status` |
| "Index my ~/notes folder" | `mem_index(path="~/notes")` |
| "Search for deployment" | `mem_search(query="deployment checklist")` |
| "Remember this insight" | `mem_add(content="...", tags=["ops"])` |

## Packages

| Package | Description |
|---------|-------------|
| **memtomem** | Core — MCP server, CLI (`mm`), Web UI, hybrid search, storage |
| **memtomem-stm** | STM proxy — proactive memory surfacing via tool interception |

The two packages have no Python-level dependency on each other. All communication between STM and LTM happens over the MCP protocol — they can be deployed and upgraded independently.
