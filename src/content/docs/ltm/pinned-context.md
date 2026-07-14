---
title: Pinned Context and Review-First Memory
description: Compose bounded instructions before retrieval and review proposed memories before durable writes.
---

Pinned Context stores small Markdown facts or instructions that must appear
before ordinary retrieval. User, project-local, and project-shared blocks use
the same privacy and confirmation rules as other memtomem writes.

```bash
mm pinned set response-style \
  --content "Prefer concise answers with runnable commands." --priority 10
mm pinned get response-style --scope user
mm pinned compose "deployment checklist"
mm pinned delete response-style --scope user
```

Use `--scope user|project_local|project_shared` for exact operations. A
Git-tracked shared write requires `--confirm-project-shared`.

Each block is limited to 2,000 characters. The 6,000-character value is the
pinned budget for one compose request, not a global storage limit. The default
complete bundle is 12,000 characters and never cuts a block in half.

`mem_context_compose` schema 3 preserves adjacent context-window chunks while
keeping matched hits ahead of neighboring context in the shared budget.

## Review-first proposals

`mem_candidate_propose(content, source, source_ref, idempotency_key)` creates a
privacy-scanned pending candidate and never writes durable memory. Pending
candidates expire after 30 days. Reusing an idempotency key with the same
proposal returns the original candidate; different content is rejected. Only
an explicit approve decision invokes the normal durable write path.

```bash
mm review list
mm review show CANDIDATE_ID
mm review approve CANDIDATE_ID --reviewer "$USER"
mm review recover --stale-after-minutes 15 --actor "$USER"
```

## LangGraph adapters

`MemtomemBaseStore` implements LangGraph's tuple-namespace JSON store.
`MemtomemStore` is the higher-level async adapter for search, writes, sessions,
and working memory. Its `config_overrides` apply after ambient config, making
isolated graph databases explicit and preventing test writes from landing in
the user's default store.
