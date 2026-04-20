---
title: Context Gateway
description: Auto-sync agent definitions, skills, and commands across 5 runtimes.
---

If you use multiple AI runtimes (Claude Code, Cursor, Codex CLI, ...), each one stores agent definitions, skills, and commands in its own format and its own directory. Context Gateway keeps them in sync from a single canonical source (`.memtomem/`) — edit one file and every runtime sees the update. Define an agent once; it works identically across 5 AI editors.

## Sync Structure

```
.memtomem/                  # Canonical source
├── agents/                 # Agent definitions
├── skills/                 # Skill definitions
└── commands/               # Command definitions

     ↕ Auto-sync

.claude/agents/             # Claude Code
.claude/skills/             # Claude Code
~/.codex/agents/            # Codex CLI
```

## Bidirectional Extraction

If you already have agent/skill files from Claude Code, you can reverse-extract them to the canonical source:

```bash
mm context import            # runtime files → .memtomem/
mm context sync              # .memtomem/ → all runtimes
```

## Format Conversion

Each runtime uses different configuration formats. Context Gateway converts automatically:

| Runtime | Format |
|---|---|
| Claude Code | Markdown + YAML frontmatter |
| Codex CLI | TOML |

Field loss during conversion is tracked by severity:

| Severity | Behavior |
|---|---|
| `ignore` | Skip (field not supported in target runtime) |
| `warn` | Print warning, continue |
| `error` | Abort conversion |

## Supported Runtimes

| Runtime | Agents | Skills | Commands |
|---|---|---|---|
| Claude Code | Yes | Yes | Yes |
| Codex CLI | Yes | — | — |
| Cursor | Yes | — | — |
| Windsurf | Yes | — | — |
| Claude Desktop | Yes | — | — |

## LangGraph Adapter

Load agent definitions and skills through Context Gateway in LangGraph/CrewAI agents:

```python
from memtomem.context import load_agent_definition

# Load agent definition from .memtomem/agents/
agent_def = load_agent_definition("analyzer")
```
