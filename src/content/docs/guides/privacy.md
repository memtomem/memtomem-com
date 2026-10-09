---
title: Local-First & Privacy
description: How memtomem keeps local-first defaults, protects secrets, and makes optional network boundaries explicit.
---

memtomem is local-first: its default stores and search indexes live on your machine. Memory content is sent only across boundaries you configure, such as a remote embedding/LLM/rerank provider, remote MCP/LTM transport, webhook, Toolgraph server, or Langfuse tracing. Separately, local ONNX models download their model files over the network (see [Model Downloads](#model-downloads)).

## 30-Second Boundary Check

| Path | Default state | Can content leave this machine? |
|---|---|---|
| SQLite storage, BM25 search, local ONNX embedding/reranking | local | No, unless you separately synchronize or expose the files |
| MCP `stdio`, STM cache/metrics, loopback Web UI | local | No, except for traffic to an upstream MCP server you chose |
| Remote Ollama, OpenAI-compatible embedding/LLM, Cohere reranking | opt-in | Yes, to the configured endpoint |
| Remote MCP/LTM, webhooks, Toolgraph, Langfuse | opt-in | Yes, according to that integration's configuration |

### Model Downloads

Local ONNX embedding and reranking run on your machine, but their model files come from the network. When a model is needed and its Hugging Face snapshot is not in the cache, the files are downloaded from the Hugging Face Hub. If that download fails, fastembed can fall back to its own download URL. A model cached only through that fallback has no Hugging Face snapshot, so while online each load downloads from the Hub again and uses the fallback copy only if that fails. The exception is an embedding model with a non-`fp32` `embedding.onnx_variant`: it loads the locally exported artifact in `embedding.onnx_artifact_path` instead of downloading. Reranker models are unaffected and follow the rule above. What is fetched is model weights; no memory content is sent. memtomem turns huggingface_hub telemetry off for these downloads.

- fastembed models are cached in `~/.memtomem/cache/fastembed/`. Move the cache with `MEMTOMEM_FASTEMBED_CACHE` (checked first) or `FASTEMBED_CACHE_PATH`. `rerank.provider=local` (sentence-transformers) uses the default Hugging Face cache instead.
- While online, `mm warmup` downloads and loads the configured local models ahead of time.
- Keyword-only mode (`embedding.provider=none`, the Minimal preset) downloads no embedding model.

For an all-local setup, use the Minimal path or the local ONNX path (which downloads model files; see [Model Downloads](#model-downloads)), keep Web UI and daemons on loopback, and do not configure optional remote providers.

## Local-First Defaults

- **Storage** — The default store is local SQLite (`~/.memtomem/`). The MCP stdio path exposes no network port; `mm web` binds to loopback by default.
- **Embeddings** — Keyword-only mode needs no embedding service. The built-in ONNX (fastembed) provider runs inference locally and downloads its model files as described in [Model Downloads](#model-downloads); Ollama and OpenAI-compatible providers are optional configured boundaries.
- **Reranking** — When you enable reranking, the default provider is local ONNX (fastembed) — no external API required.
- **ONNX Runtime telemetry** — Official ONNX Runtime builds from 1.29 upload telemetry to Microsoft on Linux and macOS by default. From memtomem 0.6.8, importing the package sets `ORT_DISABLE_TELEMETRY=1`, so the server, the `mm` CLI and the web UI all run with it off. A value already in the environment is left alone; set `ORT_DISABLE_TELEMETRY=0` yourself to allow the upload. The Claude Code, Codex and OpenCode plugins pinned to memtomem 0.6.8, and the [Hermes plugin installed at the 0.6.8 commit](/guides/connect-ai-client/#hermes-agent), also pass the same value in the server's launch environment. A server older than 0.6.8 does not set it, so a Hermes plugin installed from the catalog while the catalog pins an earlier commit runs with telemetry on; reinstall it at the 0.6.8 commit. It does not cover a program that initializes `onnxruntime` before importing memtomem. On Windows, ONNX Runtime does not read this variable and emits ETW events, which Windows records only while a trace session is collecting.
- **STM proxy** — The default client transport is stdio. Persisted response cache, metrics, and feedback are local SQLite files under `~/.memtomem/`; configured upstream MCP servers and remote LTM transports retain their own network boundaries.
- **No account** — It works without any login or sign-up.
- **Opt-in external paths** — OpenAI-compatible embeddings, Cohere reranking, non-loopback Ollama, external compression/extraction LLMs, remote MCP/LTM, webhooks, Toolgraph, and Langfuse may transmit data to their configured endpoint. On STM's external-LLM path, `privacy_scan_enabled` (default on) checks credentials before the call and falls back locally on a hit; disabling it sends the upstream response unscanned and triggers a startup warning for external destinations.

## Filesystem Protection

The data directory (`~/.memtomem/`) is created with `0o700` permissions and its files are written `0o600` (owner read/write only). Separately, the runtime directory that holds the server's pid/lock files (`$XDG_RUNTIME_DIR/memtomem`, or `/tmp/memtomem-<uid>`) is created `0o700` and startup refuses it if group/other access has been left open.

## Secret Protection

memtomem blocks credential-, token-, and key-shaped content from flowing into your stores or wider scopes at several points.

- **STM sensitive-content detection** — Responses containing credential patterns (for example `sk-…`, `ghp_…`, AWS `AKIA…`, JWTs, private keys) are excluded from the response cache and selection telemetry. External LLM compression falls back to local truncation when its privacy scan finds a hit. The bundled STM runtime does not write responses into LTM.
- **STM error-text summaries** — Exception messages can quote a URL query, an argument or part of a header back, so STM does not store or show them.
  - **Calls that raise:** when a proxied call raises, the error the MCP client receives, `proxy_metrics.error_message`, the `startup connect failed` line in `stm_proxy_health` and the `extract_error` / `index_error` columns name the exception type (`ConnectError`, `HTTP 401 (HTTPStatusError)`), as do runtime log lines.
  - **Upstream `isError` results:** these still reach the client unchanged; only their stored row is summarized as `upstream isError (<n> chars)`.
  - **What is kept:** failures STM composes itself (open circuit breaker, oversize response, policy denial) keep their message, and logged tracebacks are unchanged.
- **Indexing credential exclusion** — LTM indexing applies a built-in credential denylist (`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**`, …). A user `!negation` pattern cannot re-enable these built-in patterns.
- **Re-scan on share** — When `mem_agent_share` copies a memory into a wider namespace, the redaction guard re-scans it, and secret-looking content is blocked at share time.
- **Context Gateway** — Writing or moving to the `project_shared` tier (git-tracked) hard-refuses on a detected secret, with no `--force` valve (git history is permanent). The `user` and `project_local` tiers allow an override after review.

## Query Privacy (STM Surfacing)

STM surfacing extracts a query from each tool call to search LTM. You control how that query text is retained.

- `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT=false` — Store a `sha256:<16-hex>` digest instead of the raw text.
- `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` (default `30`) — Clear raw query text retained in the feedback DB after the given number of days.
- Queries matching the persistence-sensitive set (credentials and email addresses) are hashed before persistence regardless of the setting.
- **Opportunity log** — Each call that entered surfacing records how it ended and the shape of its arguments (their number, a path's depth, a common file extension), never their keys or values. Turn it off with `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED=false`.
- **Call identifiers** — Surfacing events store the host's `tool_use_id`, session ID and agent ID, but never the working directory (`cwd`). Delivered memories are recorded only as keyed hashes of their path and preview text.
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
