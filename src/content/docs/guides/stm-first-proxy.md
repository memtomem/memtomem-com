---
title: Add STM to an MCP Server
description: Verify the STM proxy with the bundled demo, route a real MCP server through it, inspect evidence, and restore the original registration.
---

**Estimated time:** 10–15 minutes

**Goal:** call one tool through STM, confirm the call in durable metrics, and know how to undo the change.

## Is STM the Right Layer?

Use STM when you already have an MCP server and want response compression, caching, or proactive LTM memory surfacing. You do not need STM to store or search durable memory.

Calls through built-in client tools such as `Read`, `Bash`, or `apply_patch` do not cross the MCP proxy. This guide verifies an actual proxied MCP alias.

## 1. Install and Run the Local Demo

```bash
python --version
uv tool install memtomem-stm
mms --version
mms init --demo --client auto
mms doctor
```

The bundled demo is deterministic, read-only, and needs no Node.js or network. `mms doctor` is successful when it exits 0; WARNs are allowed. An LTM warning only disables proactive surfacing, not proxying, compression, or caching.

If automatic client detection did not register STM, choose one:

```bash
mms register --client claude
mms register --client codex
mms register --client auto
```

For another JSON-based client:

```json
{
  "mcpServers": {
    "memtomem-stm": {
      "command": "memtomem-stm"
    }
  }
}
```

Restart the client after registration.

## 2. Call the Proxied Demo Tool

Ask the AI client:

```text
Use the memtomem-stm MCP tool demo__demo_search with topic="privacy".
Do not use a built-in file or shell tool.
```

The client may display the fully composed name as `mcp__memtomem-stm__demo__demo_search`. The important part is that the tool appears under `memtomem-stm` and includes the `demo__` prefix.

Check the durable evidence:

```bash
mms doctor
mms stats --source mcp
```

The demo is complete when:

- `mms doctor` exits 0;
- the client lists `memtomem-stm` and `demo__demo_search`;
- the call returns the deterministic privacy result;
- `mms stats --source mcp` contains that MCP call.

## 3. Add a Real MCP Server

The safest path discovers existing client registrations and lets you select which ones to import:

```bash
mms add --from-clients --validate
mms list
mms doctor
```

Importing leaves the original client registration in place unless you explicitly prune it. Verify the STM path before removing a direct path.

For a new stdio server, register it directly. Use a short prefix so the final client-composed name stays under MCP's 64-character limit:

```bash
mms add filesystem \
  --command npx \
  --args "-y @modelcontextprotocol/server-filesystem /ABSOLUTE/PROJECT/PATH" \
  --prefix fs \
  --validate
```

Restart the client, ask it to call an `fs__...` tool, and check `mms stats --source mcp` again. A client may display the final name as `mcp__<server>__<prefix>__<tool>`.

## 4. Remove the Duplicate Direct Path

When the original MCP server and STM alias both appear, preview the cleanup before applying it:

```bash
mms prune --all --dry-run
mms prune --all
```

After pruning, restart the client and verify that the tool is reachable only through the STM prefix.

## 5. Restore the Original Registration

For an imported server, preview and apply the reverse operation:

```bash
mms eject SERVER_NAME --dry-run
mms eject SERVER_NAME
```

`mms eject` restores the recorded host entry, verifies it, and only then removes the STM entry. If restoration fails, the STM entry remains so the server is not silently lost.

For the bundled demo, no host entry existed before setup. Remove it from STM with the regular server-removal command instead:

```bash
mms remove demo
```

## If Verification Fails

- **STM is missing in the client:** rerun `mms register --client ...`, then restart the client.
- **No proxied tools are listed:** run `mms health` and compare discovered and advertised counts.
- **A tool disappears:** shorten both the STM server name and upstream prefix; the final composed name must stay within 64 characters.
- **Metrics stay empty:** confirm the client called the MCP alias, not a built-in tool.
- **Only LTM surfacing fails:** run `mms health`; proxying can remain healthy while the optional LTM link is unavailable.

## Next

- [STM Overview](/stm/overview/)
- [Proactive Surfacing](/stm/surfacing/)
- [Compression Strategies](/stm/compression/)
- [STM CLI Reference](/stm/cli/)
- [Troubleshooting](/guides/troubleshooting/)
