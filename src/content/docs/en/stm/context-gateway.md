---
title: Context Gateway
description: Auto-sync agent definitions, skills, and commands across 6 runtimes.
---

Context Gateway automatically synchronizes agent definitions, skills, and commands from a single canonical source (`.memtomem/`) to multiple AI editor runtimes. Define an agent once — it works identically across 6 AI editors.

## Sync Structure

```
.memtomem/                  # Canonical source
├── agents/                 # Agent definitions
├── skills/                 # Skill definitions
└── commands/               # Command definitions

     ↕ Auto-sync

.claude/agents/             # Claude Code
.claude/skills/             # Claude Code
.gemini/agents/             # Gemini CLI
.gemini/skills/             # Gemini CLI
~/.codex/agents/            # Codex CLI
```

## Bidirectional Extraction

If you already have agent/skill files from Claude Code or Gemini CLI, you can reverse-extract them to the canonical source:

```bash
mm context import            # runtime files → .memtomem/
mm context sync              # .memtomem/ → all runtimes
```

## Format Conversion

Each runtime uses different configuration formats. Context Gateway converts automatically:

| Runtime | Format |
|---|---|
| Claude Code / Gemini CLI | Markdown + YAML frontmatter |
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
| Gemini CLI | Yes | Yes | — |
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
