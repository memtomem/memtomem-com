---
title: Operations and Web API
description: Readiness, API validation, indexing outcomes, upgrades, and production safety.
---

## Readiness and API documentation

Run `mm web` and open `/api/docs` for the local OpenAPI interface. Automation
should probe `GET /api/readiness`: it returns `200` when ready and `503` with
`startup_unavailable` while required startup components are unavailable.

Search supports `source_exact`, `chunk_type`, `created_from`, and
`created_before`. Timestamps require a timezone and invalid or reversed ranges
return `422`. Export supports namespace filtering. Initial indexing reports
`success`, `partial`, or `failed` rather than collapsing every outcome into one
success response.

## Operational checks

```bash
mm status
mm status --json
mm warmup
mm web status
```

For CI, treat a top-level `error` field in `mm status --json` as failure; the
command keeps JSON output stable and may still exit zero for initialization
errors. `mm status` also reports any configured remote embedding, LLM, or
reranker endpoints so non-local inference destinations remain visible.

`mm upgrade` manages `uv tool` installs. Use `pipx upgrade memtomem` for pipx,
update the lockfile and run `uv sync` for project dependencies, or update Git
and run `uv sync --extra all` for a source checkout.

The Web UI binds to loopback by default and rejects browser cross-origin
`/api/*` requests (`GET` and writes) with `403` when `Origin` (or `Referer` when
`Origin` is absent) does not match the UI's own origin (scheme, host, and port).
Pass `--trusted-origin <hostname>` when a cross-origin browser frontend
intentionally calls `/api/*`; non-browser HTTP clients that send neither
`Origin` nor `Referer` are unaffected. Off-loopback access requires the
explicit remote UI, trusted-origin, and trusted-host flags and should remain
behind an authenticating reverse proxy.
