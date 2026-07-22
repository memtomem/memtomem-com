---
title: Memory Persistence Across Sessions
description: Store a memory in one session and recall it in the next — the core memtomem flow, in under 5 minutes.
sidebar:
  order: 2
---

AI agents start new sessions without the full prior transcript. With memtomem connected, content explicitly written through its tools is **persisted to disk** and can be retrieved by later sessions and agents connected to the same store and namespace. This tutorial walks through that flow end-to-end.

## Prerequisites

Complete [Quick Start](/guides/quickstart/) so `memtomem` is installed, initialized, and registered with your MCP client (Claude Code, Cursor, Claude Desktop, …).

## Session A: Save a Memory

In your first agent session, say in plain language:

> **"Remember this: our team paused the migration this quarter. Reason: waiting on legal review."**

The agent calls `mem_add` under the hood. The result identifies the Markdown path, namespace, indexed chunk count, and source file so you can verify what was written.

To verify from the CLI:

```bash
mm search "migration paused"
```

The entry you just saved should appear at the top. You can also run `mm web` to browse the dashboard visually.

## End the Session

Close the agent completely. For Claude Code, exit the terminal; for Claude Desktop, quit the app. The memtomem server itself re-launches automatically on the next tool call — no manual restart needed.

## Session B: Recall the Memory

Start a fresh session and ask:

> **"What's our team's migration status? I think we discussed it in an earlier session."**

Guided by the MCP tool descriptions, the agent calls `mem_search` and surfaces the entry from Session A — including the "waiting on legal review" reason.

## What Just Happened

```
Session A:  agent → mem_add("migration paused, legal review") → Markdown source
                                                               → SQLite indexes
            (BM25 FTS5 index + optional vector index updated together)

Session B:  agent → mem_search("migration status") → hybrid search
                                                   → same chunk ranked at top
```

The durable source is Markdown and retrieval runs against the local SQLite indexes — no cross-session sync step is required. For how the search engine ranks results, see [Hybrid Search](/ltm/hybrid-search/).

## Common Pitfalls

- **Agent doesn't call `mem_search`.** Phrase the question so it's clearly about past context — "earlier", "previously saved", "you remembered that ..." — to nudge the tool call.
- **Empty results.** Run `mm status` to confirm the server connection and namespace list. Session A and Session B may be using different namespaces; the default is whatever `mm init` set.

## Next Steps

- [Hybrid Search](/ltm/hybrid-search/) — how to tune search when results don't land
- [STM Overview](/stm/overview/) — if you want memories injected without even having to ask, add the STM proxy. Adopting it is reversible (`mms eject` restores your original host MCP config).
- [Multi-Agent Collaboration](/ltm/multi-agent/) — namespace design for sharing memory across several agents
