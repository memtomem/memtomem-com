---
title: Context Gateway
description: Define agents, skills, and commands once, then sync them across AI runtimes.
---

You wrote a skill in Claude Code and want the same one in Codex and Cursor, or you want the same command set across several projects. Context Gateway keeps master copies in a **Store** (`.memtomem/` or the user Store), **Pushes** Store artifacts to selected runtimes, and **Pulls** runtime copies back into the Store through a preview-first flow.

In LTM 0.3.0 the Context Gateway grew beyond a single-project, one-way model: it is now the central surface for moving and copying artifacts across projects and tiers, bulk-syncing many projects, and authoring a canonical wiki.

## What It Solves

AI runtimes store context in different places and formats:

| Runtime | Example runtime files |
|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md` |
| Codex CLI | `.agents/skills/*/SKILL.md`, `.codex/agents/*` |
| Antigravity CLI | `.gemini/agents/*`, `.gemini/skills/*`, `.gemini/commands/*` |
| Other MCP clients / frameworks | Agent definition surfaces vary by runtime |

Without a canonical layer, every runtime copy drifts. With Context Gateway, you edit the canonical file once and sync it out to each AI runtime path.

## First Workflow

From your project root:

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

| Command | Purpose |
|---|---|
| `detect` | Shows existing runtime files memtomem can see |
| `init` | Creates canonical files under `.memtomem/` |
| `sync` | Pushes Store files out to each runtime path; use `--runtime` to restrict fan-out |
| `diff` | Shows whether canonical and runtime copies still match |

For the full command list — move/copy, multi-project, versions — see the [CLI Reference](/ltm/cli/).

## Canonical Tiers

Context Gateway uses the same three tiers as memory writes. The UI shows friendly labels (User / Project (shared) / Project (local)); the scope values below are the CLI flag values:

| Tier (CLI scope) | UI label | Canonical location | Good for |
|---|---|---|---|
| `user` | User | `~/.memtomem/<artifact>/...` | Personal agents, skills, commands reused across projects |
| `project_shared` | Project (shared) | `<project>/.memtomem/<artifact>/...` | Team-shared project context committed to git |
| `project_local` | Project (local) | `<project>/.memtomem/<artifact>.local/...` | Private drafts for one checkout |

The `user` tier is an actively managed global library. Because these paths live outside the project in your home directory, every user-tier write goes through a "Write outside the project?" confirmation: the gateway first shows the exact home-directory files it will touch and writes only after approval. This confirmation is a host-write safety boundary, not a feature flag.

`project_local` canonical files are gitignored and do not sync to runtime agent / skill / command paths.

`project_shared` is git-tracked, so do not put secrets there. In 0.3.0 sync and transfer hard-refuse a `project_shared` write when a secret is detected, with no `--force` valve (because git history is permanent). The `user` and `project_local` tiers allow an override after review, but `project_shared` refuses in every case.

## Common Recipes

### Share a Project Agent With the Team

```bash
mm context init --include agents --scope project_shared --confirm-project-shared
mm context sync --include agents --scope project_shared
```

Commit the generated `.memtomem/agents/` file after review.

### Keep a Personal Skill Across Projects

```bash
mm context init --include skills --scope user
mm context sync --include skills --scope user
```

This writes the canonical skill under `~/.memtomem/skills/` and syncs it out to supported user-level runtime paths (the first write goes through the host-write confirmation).

### Draft Locally Before Sharing

```bash
mm context init --include agents --scope project_local
mm context diff --include agents --scope project_local
```

`project_local` canonical files are gitignored and do not sync to runtime paths. When the draft is ready, use `mm context move` to shift it to `project_shared`, then run `mm context sync --scope project_shared`.

### Pull Existing Runtime Files Into the Store

If you already authored an agent or skill directly in a runtime, Pull it into the Store. A single-artifact Pull previews by default and lets you select the source runtime:

```bash
mm context detect --include agents,skills
mm context pull skills reviewer --from claude
mm context pull skills reviewer --from claude --diff
mm context pull skills reviewer --from claude --scope project_shared --apply
```

If the Store already owns the artifact, add `--overwrite`; memtomem snapshots the current Store payload under its version history before replacement. Review generated files before committing. Section-level batch Pull and `mm context init` remain available for initial discovery, but a named Pull is the unambiguous path when several runtimes contain the same artifact.

## Move or Copy Across Projects and Tiers

0.3.0 goes beyond the one-way model with a transfer engine that moves or copies a single canonical artifact (`agents` / `commands` / `skills`) between tiers or between projects:

```bash
# Move one skill to the user tier (source is cleaned up)
mm context move skills my-skill --to user

# Copy to another project (source untouched, can be renamed)
mm context copy agents reviewer --to-project <project> --as reviewer-v2
```

- `move` consumes the source and cleans up its stale runtime copies.
- `copy` never touches the source and can rename the copy with `--as`.
- Every transfer is a dry-run preview by default; pass `--apply` to execute.
- Destination collisions always refuse, with no `--force` valve.
- A transfer landing in `project_shared` runs the secret scan and requires `--confirm-project-shared`.
- Every successful transfer prints the follow-up `mm context sync` command to run.

The `mem_context_artifact_transfer` MCP action performs the same operation headlessly.

## Manage Multiple Projects

Register several projects to bulk-sync shared artifacts, or check drift across all of them at once. All multi-project operations target the `project_shared` tier:

```bash
mm context projects list
mm context projects add <path>
mm context projects pause <selector>
mm context projects resume <selector>

# Bulk-sync every registered project (one lock window)
mm context sync --all-projects

# Read-only check of which projects drifted
mm context status --all-projects
```

Paused projects and projects not enrolled for sync are skipped. In the web UI, opting a project into sync is shown as **Activate** ("Project activated for sync").

## MCP Server Definitions

Beyond agents / skills / commands, the gateway also manages MCP server definitions. Keep canonical definitions in `.memtomem/mcp-servers/<name>.json` and sync them into the project's `.mcp.json`:

```bash
# Sync canonical MCP server definitions into .mcp.json (opt-in)
mm context sync --include=mcp-servers

# Copy a definition to another project
mm context copy mcp-servers <name> --to-project <project>
```

The `mcp-servers` sync is opt-in (a bare `mm context sync` never touches `.mcp.json`). The same secret-safety checks apply, so put secrets in `${VAR}` references rather than directly in an `env` block. v1 supports only stdio servers on the `project_shared` tier.

## Version Snapshots

Agents and commands can carry a version history with movable labels (production / staging, etc.):

```bash
mm context version create agents reviewer --note "initial version"
mm context version promote agents reviewer --label production
mm context version list agents reviewer
```

You can configure sync to use the version a label points to. See the [CLI Reference](/ltm/cli/) for the full flag list.

## Canonical Wiki

Author reusable artifacts once in a host-global wiki (`~/.memtomem-wiki/`), then install them into a project with `mm context install`. Each artifact is stored as an isolated git commit, and `remote`/`push`/`pull` back it up and sync it across devices:

```bash
mm wiki init
mm wiki skill commit my-skill --canonical
mm wiki remote <url>
mm wiki push
```

You can also edit in the browser; saved-but-uncommitted edits are flagged with a nav badge.

## Conversion Loss Handling

When a target runtime cannot represent a field exactly, memtomem classifies the loss:

| Severity | Behavior |
|---|---|
| `ignore` | Field is unsupported and skipped |
| `warn` | Continue, but print a warning |
| `error` | Abort conversion |

## Web UI

```bash
mm web --open
```

The Web UI exposes Context Gateway under **Gateway**, with Overview, Projects, Skills, Commands, Subagents, MCP Servers, Hooks, and Wiki surfaces. Rows use the same Store model as the CLI:

- **Push** sends the Store copy to one or more runtimes after confirmation.
- **Pull** previews a runtime copy before it enters the Store; source selection is explicit when candidates conflict.

Project and tier filters, runtime targeting, drift status, and multi-project activation remain visible in the detailed grid. Treat the Store as the source of truth after a Pull: edit there, then Push the reviewed version back out.

## Next

- [CLI Reference](/ltm/cli/) — full `mm context` and `mm wiki` command list
- [MCP Tools](/ltm/mcp-tools/) — context actions through `mem_do`
- [Multi-Agent Collaboration](/ltm/multi-agent/) — memory namespaces for multiple agents
