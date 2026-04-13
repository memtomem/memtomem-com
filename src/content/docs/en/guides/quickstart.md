---
title: Quick Start
description: Get memtomem installed and store your first memory in under 5 minutes.
---

## 1. Install

To use local embeddings, pull an Ollama model first (~270MB, free, no GPU required):

```bash
ollama pull nomic-embed-text
```

Then install memtomem:

```bash
uv tool install memtomem          # or: pipx install memtomem
```

To also use the STM proxy:

```bash
uv tool install memtomem-stm      # or: pip install memtomem-stm
```

> No GPU? Pick OpenAI in the setup wizard — see the [Embeddings guide](https://github.com/memtomem/memtomem/blob/main/docs/guides/embeddings.md).

## 2. Setup

Run the interactive 8-step wizard:

```bash
mm init                            # interactive setup
mm init -y                         # auto-accept defaults (for CI)
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
