---
title: Context Gateway
description: Define agents, skills, and commands once, then sync them across AI runtimes.
---

Context Gateway keeps runtime-specific agent files in sync from one canonical `.memtomem/` source. It is useful when a project uses more than one AI runtime, or when you want the same skill/command set available in every checkout.

## What It Solves

AI runtimes store context in different places and formats:

| Runtime | Example runtime files |
|---|---|
| Claude Code | `.claude/agents/*.md`, `.claude/skills/*/SKILL.md`, `.claude/commands/*.md` |
| Codex CLI | `.agents/agents/*.toml`, `.agents/skills/*/SKILL.md` |
| Gemini CLI | `.gemini/agents/*.md`, `.gemini/skills/*/SKILL.md`, `.gemini/commands/*.toml` |
| Cursor / Windsurf / Claude Desktop | Agent definition surfaces vary by runtime |

Without a canonical layer, every runtime copy drifts. With Context Gateway, you edit the canonical file and sync outward.

## First Workflow

From your project root:

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

What each command does:

| Command | Purpose |
|---|---|
| `detect` | Shows existing runtime files memtomem can see |
| `init` | Creates canonical files under `.memtomem/` |
| `sync` | Fans canonical files out to runtime-specific paths |
| `diff` | Shows whether canonical and runtime copies still match |

## Canonical Tiers

Context Gateway uses the same three tier names as memory writes:

| Tier | Canonical location | Good for | Runtime fan-out |
|---|---|---|---|
| `user` | `~/.memtomem/<artifact>/...` | Personal agents, skills, commands reused across projects | User-level runtime paths |
| `project_shared` | `<project>/.memtomem/<artifact>/...` | Team-shared project context committed to git | Project runtime paths |
| `project_local` | `<project>/.memtomem/<artifact>.local/...` | Private drafts for one checkout | No fan-out for agents, skills, commands |

`project_shared` means "git-tracked". Do not put secrets, credentials, private scratch notes, or unreviewed prompts there. Use `user` or `project_local` when the content should stay local.

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

This writes the canonical skill under `~/.memtomem/skills/` and fans it out to supported user-level runtime paths.

### Draft Locally Before Sharing

```bash
mm context init --include agents --scope project_local
mm context status --scope project_local
```

`project_local` canonical files are gitignored and do not fan out to runtime agent / skill / command paths. Promote the file to `project_shared` when it is ready, then run `mm context sync --scope project_shared`.

### Seed Canonical Files From Existing Runtime Files

If you already authored agents or skills directly in a runtime, run `init` with the destination tier. `init` seeds canonical files and imports detected runtime files when possible:

```bash
mm context detect --include agents,skills
mm context init --include agents,skills --scope project_shared --confirm-project-shared
mm context diff --include agents,skills --scope project_shared
```

Review the generated canonical files before committing.

## How Sync Works

```
.memtomem/                  # canonical source
├── agents/
├── skills/
└── commands/

     mm context sync

.claude/                    # Claude Code runtime files
.agents/                    # Codex-compatible runtime files
.gemini/                    # Gemini runtime files
```

Conversion is one-way during `sync`: canonical to runtime. Use `mm context init` with `--include` when you intentionally want to seed canonical files from existing runtime files.

When a target runtime cannot represent a field exactly, memtomem classifies the loss:

| Severity | Behavior |
|---|---|
| `ignore` | Field is unsupported and skipped |
| `warn` | Continue, but print a warning |
| `error` | Abort conversion |

## Web UI & Context Portal

Run the Web UI dashboard:

```bash
mm web --open
```

By default, the Context Gateway lands on the **Context Portal** (Projects Portal). It provides:
- A unified view of registered MCP clients and active project/tier selection.
- Clear indicators of client/runtime registration and active files.
- A **Sync All** flow that syncs canonical configurations to all enrolled runtimes in one pass with phase-by-phase progress tooltips.

## Sync Enrollment

Context Gateway decouples project detection from sync. Pre-existing projects are automatically detected, but they will not be synced until you explicitly **enroll** them:
- **Enroll, Pause, and Resume**: You can manage the sync status of any project in the UI.
- **Write-Gating**: Paused or non-enrolled projects are gated from writing. Any attempt by a runtime or API to write canonical files will be blocked with a `409 Conflict` response.

## Artifact Versioning (ADR-0022)

Canonical agents and commands can maintain Git-style version snapshots and label pointers instead of a single flat file.

- **Version snapshots**: Writable canonical files can be frozen as immutable snapshots (e.g. `v1`, `v2`) with notes.
- **Labels**: Movable pointers (e.g. `production` or `staging`) target specific version snapshots.
- **Reserved `latest` Label**: The label `latest` is reserved and read-only. It always points to the active working canonical file and cannot be targeted by promote actions.
- **Versioned Sync**: Pass `--label <name>` to CLI commands (e.g. `mm context sync --label production` or `mm context generate --label production`) to deploy a specific version instead of the active working canonical.
- **Direct Tools**: Version snapshots and promotions are exposed as the direct MCP tools `mem_context_version` and `mem_context_promote` respectively in `full` mode.

## Next

- [CLI Reference](/ltm/cli/) — full `mm context` command list
- [MCP Tools](/ltm/mcp-tools/) — context actions
- [Multi-Agent Collaboration](/ltm/multi-agent/) — memory namespaces for multiple agents
