---
title: Choose Your Path
description: Start with the memtomem task you want to complete, from a first memory to STM proxying and team sharing.
---

You do not need every memtomem feature at once. Pick the outcome you need now, finish one working path, and add another layer only when it becomes useful.

## Start Here

| I want to… | Start with | You are done when… |
|---|---|---|
| Prove that memory storage and search work | [Quick Start](/guides/quickstart/) | `mm search` returns the memory you just added |
| Recall a decision in a new AI session | [Memory Across Sessions](/guides/memory-persistence/) | a new session returns the saved reason and source |
| Connect Claude Code, Codex, or another MCP client | [Connect an AI Client](/guides/connect-ai-client/) | the client can call `mem_status` |
| Search existing notes, docs, code, or built-in AI memory | [Index and Import Existing Content](/guides/index-and-import/) | a known phrase returns with its source path |
| Add response compression or proactive memory surfacing | [Add STM to an MCP Server](/guides/stm-first-proxy/) | one proxied call appears in `mms stats --source mcp` |
| Separate personal, agent, and shared memory | [Multi-Agent Collaboration](/ltm/multi-agent/) | one agent shares a reviewed memory and another retrieves it |
| Maintain skills and commands across runtimes | [Context Gateway](/ltm/context-gateway/) | a previewed Store version is pushed to a selected runtime |
| Check local storage and external-service boundaries | [Local-First & Privacy](/guides/privacy/) | you know which enabled integrations can send data off-device |
| Diagnose or operate an existing installation | [Troubleshooting](/guides/troubleshooting/) and [Operations & API](/ltm/operations/) | health checks pass or point to a specific recovery step |

## LTM or STM?

Start with **LTM** (`memtomem`). It stores durable memory and searches it on demand. Add **STM** (`memtomem-stm`) only when an MCP workflow needs response compression, caching, or proactive memory surfacing.

| Need | LTM | STM |
|---|---:|---:|
| Save a decision across sessions | Yes | No |
| Search notes, docs, and code | Yes | No |
| Share one local store across AI clients | Yes | No |
| Compress an MCP tool response | No | Yes |
| Attach relevant LTM memory to a proxied call | Provides the memory | Performs the surfacing |
| Required for the first successful setup | Yes | No |

STM does not replace LTM and does not write every proxied response back into durable memory. The two packages run independently and communicate through MCP when surfacing is enabled.

## What Does Not Happen Automatically

Installing a plugin or registering the MCP server does **not** automatically:

- index your whole project;
- watch every file in the background;
- import all Claude Code, Codex, or Gemini/Antigravity memory;
- save entire conversations or every tool response;
- synchronize databases between different computers.

Use an explicit indexing, import, save, or synchronization workflow when you want one of those outcomes.

## A Good First Week

1. Complete [Quick Start](/guides/quickstart/) without an MCP client.
2. Connect one AI client and verify `mem_status`.
3. Save one confirmed decision and retrieve it in a new session.
4. Index one small, non-sensitive docs directory and verify a source-backed result.
5. Add STM only if you can name the MCP server whose responses you want to proxy.

Keep permanent project rules in `CLAUDE.md`, `AGENTS.md`, or the equivalent runtime instruction file. Put decisions, findings, and repeatable procedures in memtomem when you want to retrieve them later.

## Reference and Advanced Features

Task guides recommend one safe path. The reference pages retain the full released command and configuration surfaces:

- [LTM CLI Reference](/ltm/cli/)
- [LTM MCP Tools](/ltm/mcp-tools/)
- [STM CLI Reference](/stm/cli/)
- [STM MCP Tools](/stm/mcp-tools/)
- [Environment Variables](/reference/configuration/)
