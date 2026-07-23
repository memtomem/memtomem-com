---
title: Use These Docs
description: How to make memtomem's docs readable by AI agents — via llms.txt and a local MCP server (mcpdoc).
---

There are three practical ways to let an AI agent use these docs. Pick one based on whether you want a one-time read, reusable MCP tools, or local memtomem search.

| Need | Use | Success check |
|---|---|---|
| Give an agent one page or the full corpus | `llms.txt` URL | the client fetches the requested text |
| Let an agent search docs through MCP | local `mcpdoc` server | `list_doc_sources` then `fetch_docs` returns a page |
| Search the docs from your local memory index | `mm index` | `mem_search` returns a memtomem.com source |

## llms.txt

LLM-friendly documentation indexes, generated statically at build time.

| File | Purpose |
|---|---|
| [`/llms.txt`](https://memtomem.com/llms.txt) | Index — lists the available doc sets |
| [`/llms-full.txt`](https://memtomem.com/llms-full.txt) | The entire documentation in one file |
| [`/llms-small.txt`](https://memtomem.com/llms-small.txt) | Abridged version for small context windows |

Most tools — Claude, ChatGPT, Cursor — can fetch these URLs directly.

## Local MCP server (mcpdoc)

[`mcpdoc`](https://github.com/langchain-ai/mcpdoc) is an open-source MCP server that exposes llms.txt as MCP tools. It **runs on your machine** — no hosting required — and your agent searches the memtomem docs through its `list_doc_sources` and `fetch_docs` tools.

### Prerequisite

```bash
# install uv (skip if you already have it)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Run

```bash
uvx --from mcpdoc mcpdoc --urls "memtomem:https://memtomem.com/llms.txt" --transport stdio
```

### Connect Claude Code

```bash
claude mcp add memtomem-docs -s user -- \
  uvx --from mcpdoc mcpdoc --urls "memtomem:https://memtomem.com/llms.txt" --transport stdio
```

### Cursor · Windsurf · Antigravity · other MCP clients

Add it to your MCP config file.

```json
{
  "mcpServers": {
    "memtomem-docs": {
      "command": "uvx",
      "args": ["--from", "mcpdoc", "mcpdoc", "--urls", "memtomem:https://memtomem.com/llms.txt", "--transport", "stdio"]
    }
  }
}
```

Codex CLI and other stdio MCP clients register the same `command` / `args`.

### Tell your agent to use it

If your agent doesn't reach for the tools automatically, add a line to its rules / system prompt:

> For memtomem questions, use the `memtomem-docs` MCP server — call `list_doc_sources` first, then `fetch_docs` to read the relevant pages.

The connection is verified only after both tools succeed. Seeing `memtomem-docs` in a client list without fetching a page is not an end-to-end check.

:::note[Allowed domains]
When you point mcpdoc at a remote llms.txt URL, it auto-allows only that domain (`memtomem.com`). To use local files, specify domains explicitly with `--allowed-domains`.
:::

## Or remember it with memtomem

memtomem is itself a memory MCP server, so you can index the docs and run hybrid search over them:

```bash
curl -sL https://memtomem.com/llms-full.txt -o memtomem-docs.md
mm index ./memtomem-docs.md
```

Your agent then finds answers with `mem_search`. See [Hybrid Search](/ltm/hybrid-search/).

## Related

- [Quick Start](/guides/quickstart/)
- [Hybrid Search](/ltm/hybrid-search/)
