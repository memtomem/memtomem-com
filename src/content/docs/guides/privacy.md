---
title: Local-First & Privacy
description: How memtomem keeps your data on your machine and protects secrets — fully local, 0600 file permissions, automatic secret detection, and query privacy.
---

memtomem never sends your memory data anywhere. Storage, embedding, search, and reranking all run on your machine, and content that looks like a secret is filtered out automatically at the cache, index, and share boundaries.

## Fully Local

- **Storage** — The default store is local SQLite (`~/.memtomem/`). No network port is exposed.
- **Embeddings** — Embeddings run locally via the built-in ONNX (fastembed) provider. No GPU, no external API, no cloud, and no cost. (Ollama and OpenAI providers are optional.)
- **Reranking** — When you enable reranking, the default provider is local ONNX (fastembed) — no external API required.
- **STM proxy** — STM speaks stdio to your AI client; the proxy server itself opens no network port. Persisted stores — the response cache, metrics, and feedback — are all local-only SQLite files under `~/.memtomem/`, never remote or shared across hosts.
- **No account** — It works without any login or sign-up.

## Filesystem Protection

The runtime directory (`~/.memtomem/`) is created with `0o700` permissions, and startup refuses it if group/other access has been left open. Files inside are written with `0o600` (owner read/write only).

## Secret Protection

memtomem blocks credential-, token-, and key-shaped content from flowing into your stores or wider scopes at several points.

- **STM sensitive-content detection** — Responses containing patterns that look like secrets (e.g. `sk-…`, `ghp_…`, AWS `AKIA…`, JWTs, `BEGIN … PRIVATE KEY`) are excluded from the response cache and from being indexed into LTM.
- **Indexing credential exclusion** — LTM indexing applies a built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, …). A user `!negation` pattern cannot re-enable these built-in patterns.
- **Re-scan on share** — When `mem_agent_share` copies a memory into a wider namespace, the redaction guard re-scans it, and secret-looking content is blocked at share time.
- **Context Gateway** — Writing or moving to the `project_shared` tier (git-tracked) hard-refuses on a detected secret, with no `--force` valve (git history is permanent). The `user` and `project_local` tiers allow an override after review.

## Query Privacy (STM Surfacing)

STM surfacing extracts a query from each tool call to search LTM. You control how that query text is retained.

- `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT=false` — Store a `sha256:<16-hex>` digest instead of the raw text.
- `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` (default `30`) — Clear raw query text retained in the feedback DB after the given number of days.
- Sensitive content (credentials, PII) is always hashed before persistence, regardless of the setting.
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
