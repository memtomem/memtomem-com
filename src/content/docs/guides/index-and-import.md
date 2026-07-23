---
title: Index and Import Existing Content
description: Make a notes folder or built-in Claude, Codex, and Gemini/Antigravity memory searchable with a verified, reversible workflow.
---

**Estimated time:** 10 minutes

**Goal:** bring in one small source, search a known phrase, and verify the returned source path.

Complete [Quick Start](/guides/quickstart/) first.

## Choose the Right Operation

| Source | Use | What happens |
|---|---|---|
| Notes, docs, code, Obsidian vault, exported Notion files | `mm index PATH` | indexes the selected file or directory in place |
| Claude Code auto-memory directory | `mm ingest claude-memory` | creates a read-only snapshot under `claude-memory:<slug>` |
| Codex memories directory | `mm ingest codex-memory` | creates a read-only snapshot under `codex-memory:<slug>` |
| Gemini or Antigravity `GEMINI.md` | `mm ingest gemini-memory` | creates a read-only snapshot under `gemini-memory:<slug>` |

Neither operation deletes or rewrites the source files. They do not start background watching. Run the operation again when you intentionally want to pick up changes.

## Path A: Index a Notes or Code Folder

Start with a small directory that contains no credentials or personal data. Create `memtomem-demo-notes/deployment.md` in an editor with this content:

```markdown
# Deployment decision

Use blue-green deployment. Run the smoke suite before traffic cutover.
```

Index and verify it:

```bash
mm index ./memtomem-demo-notes
mm status
mm search "smoke suite traffic cutover"
```

Success means the result includes the sentence and a source path ending in `memtomem-demo-notes/deployment.md`.

Edit one sentence, then run the same index command again. Unchanged chunks are skipped; only changed chunks are updated.

```bash
mm index ./memtomem-demo-notes
mm search "smoke suite traffic cutover"
```

Use the same `mm index` flow for Markdown, Python, JavaScript, TypeScript, JSON, YAML, or TOML sources. The full supported formats and indexing flags remain in the [LTM CLI Reference](/ltm/cli/#mm-index-path).

## Path B: Import Built-In AI Memory

Always preview first. Replace each example path only with a source that exists on your machine.

### Claude Code

```bash
mm ingest claude-memory --source ~/.claude/projects/PROJECT_SLUG/memory/ --dry-run
mm ingest claude-memory --source ~/.claude/projects/PROJECT_SLUG/memory/
mm search "KNOWN_PHRASE_FROM_CLAUDE_MEMORY" --namespace claude-memory:PROJECT_SLUG
```

The source may also be `~/.claude/projects/` to discover multiple project memory directories.

### Codex CLI

```bash
mm ingest codex-memory --source ~/.codex/memories/ --dry-run
mm ingest codex-memory --source ~/.codex/memories/
mm search "KNOWN_PHRASE_FROM_CODEX_MEMORY"
```

### Gemini or Antigravity

```bash
mm ingest gemini-memory --source ~/.gemini/GEMINI.md --dry-run
mm ingest gemini-memory --source ~/.gemini/GEMINI.md
mm search "KNOWN_PHRASE_FROM_GEMINI_MEMORY"
```

`--dry-run` must list files without changing chunk counts. The apply command indexes the content under the source-specific namespace. Running the apply command again skips unchanged content by hash.

## Verify Before You Continue

For each imported source:

1. Copy a distinctive, non-sensitive phrase from the source.
2. Search that exact phrase.
3. Confirm the result contains the expected namespace and absolute source path.
4. Run the same import again and confirm unchanged files are skipped.

If search is empty, run:

```bash
mm status
mm search "EXACT_PHRASE_FROM_THE_FILE"
```

Minimal preset uses keyword search, so the first verification query should reuse words that actually appear in the source. Add semantic search later by rerunning `mm init` with the English or Korean-optimized preset.

## Safety Boundaries

- Do not index API keys, tokens, passwords, private keys, personal data, or raw conversation archives.
- Built-in credential exclusions remain active even if a user exclude pattern tries to negate them.
- `mm ingest` is an explicit read-only snapshot. Installing a plugin, connecting MCP, or enabling STM does not run it automatically.
- Review paths and counts in `--dry-run` output before applying an import.
- Use [Local-First & Privacy](/guides/privacy/) to check which optional providers can send content to another service.

## Next

- [Connect an AI Client](/guides/connect-ai-client/)
- [Hybrid Search](/ltm/hybrid-search/)
- [Multi-Agent Collaboration](/ltm/multi-agent/)
- [Troubleshooting](/guides/troubleshooting/)
