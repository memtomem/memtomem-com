---
title: Local-First & Privacy
description: How memtomem keeps local-first defaults, protects secrets, and makes optional network boundaries explicit.
---

memtomem is local-first: its default stores and search indexes live on your machine. Network communication occurs only across boundaries you configure, such as a remote embedding/LLM/rerank provider, remote MCP/LTM transport, webhook, Toolgraph server, or Langfuse tracing.

## Local-First Defaults

- **Storage** — The default store is local SQLite (`~/.memtomem/`). The MCP stdio path exposes no network port; `mm web` binds to loopback by default.
- **Embeddings** — Keyword-only mode needs no embedding service. The built-in ONNX (fastembed) provider runs locally; Ollama and OpenAI-compatible providers are optional configured boundaries.
- **Reranking** — When you enable reranking, the default provider is local ONNX (fastembed) — no external API required.
- **STM proxy** — The default client transport is stdio. Persisted response cache, metrics, and feedback are local SQLite files under `~/.memtomem/`; configured upstream MCP servers and remote LTM transports retain their own network boundaries.
- **No account** — It works without any login or sign-up.
- **Opt-in external paths** — OpenAI-compatible embeddings, Cohere reranking, non-loopback Ollama, external compression/extraction LLMs, remote MCP/LTM, webhooks, Toolgraph, and Langfuse may transmit data to their configured endpoint. On STM's external-LLM path, `privacy_scan_enabled` (default on) checks credentials before the call and falls back locally on a hit; disabling it sends the upstream response unscanned and triggers a startup warning for external destinations.

## Filesystem Protection

The data directory (`~/.memtomem/`) is created with `0o700` permissions and its files are written `0o600` (owner read/write only). Separately, the runtime directory that holds the server's pid/lock files (`$XDG_RUNTIME_DIR/memtomem`, or `/tmp/memtomem-<uid>`) is created `0o700` and startup refuses it if group/other access has been left open.

## Secret Protection

memtomem blocks credential-, token-, and key-shaped content from flowing into your stores or wider scopes at several points.

- **STM sensitive-content detection** — Responses containing credential patterns (for example `sk-…`, `ghp_…`, AWS `AKIA…`, JWTs, private keys) are excluded from the response cache and selection telemetry. External LLM compression falls back to local truncation when its privacy scan finds a hit. The bundled STM runtime does not write responses into LTM.
- **Indexing credential exclusion** — LTM indexing applies a built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, …). A user `!negation` pattern cannot re-enable these built-in patterns.
- **Re-scan on share** — When `mem_agent_share` copies a memory into a wider namespace, the redaction guard re-scans it, and secret-looking content is blocked at share time.
- **Context Gateway** — Writing or moving to the `project_shared` tier (git-tracked) hard-refuses on a detected secret, with no `--force` valve (git history is permanent). The `user` and `project_local` tiers allow an override after review.

## Query Privacy (STM Surfacing)

STM surfacing extracts a query from each tool call to search LTM. You control how that query text is retained.

- `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT=false` — Store a `sha256:<16-hex>` digest instead of the raw text.
- `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` (default `30`) — Clear raw query text retained in the feedback DB after the given number of days.
- Queries matching the persistence-sensitive set (credentials and email addresses) are hashed before persistence regardless of the setting.
- **Write-tool skip** — Surfacing is automatically disabled for upstream tools that mutate state.

## No Lock-In

STM imports your existing MCP servers and proxies them in front — but the move is reversible. `mms eject` restores an imported server to its original host MCP client config, and only removes the STM entry once the restore is verified.

## Trust Boundary & Best Practices

- STM trusts your local AI client and the upstream MCP servers you configure. **Only proxy upstreams you trust.**
- The optional surfacing daemon binds to loopback (`127.0.0.1`) and authenticates with a per-start random token. Do not point `MEMTOMEM_STM_DAEMON__HOST` at a non-loopback address.
- The LTM web UI (`mm web`) binds to `127.0.0.1` by default.
- Report vulnerabilities via [GitHub security advisory](https://github.com/memtomem/memtomem/security/advisories/new) or contact@dapada.co.kr — not public issues.

## Related

- [Environment Variables](/reference/configuration/) — full privacy-related settings
- [Proactive Surfacing](/stm/surfacing/) — query privacy and gating
- [Context Gateway](/ltm/context-gateway/) — per-tier secret blocking
- [Multi-Agent Collaboration](/ltm/multi-agent/) — redaction on share
