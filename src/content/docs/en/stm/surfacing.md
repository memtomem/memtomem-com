---
title: Proactive Surfacing
description: Real-time surfacing per tool call, 5-level relevance gating, feedback-based auto-tuning.
---

Traditional RAG systems only provide relevant information when the agent explicitly requests a search. memtomem-stm's proactive surfacing observes every tool call the agent makes and **automatically** searches for and injects relevant memories into responses.

## How It Works

When an agent calls an MCP tool, the STM proxy runs this pipeline:

```
Tool call → Context extraction → LTM search → Relevance gating → Inject into response
```

No agent code changes needed — just routing through the STM proxy enables automatic memory injection for all MCP communication.

## 5-Level Context Extraction

How search queries are extracted from tool calls, by priority:

| Priority | Method | Description |
|---|---|---|
| 1 | Tool-specific query template | Pre-defined query patterns mapped to tool names |
| 2 | `_context_query` argument | Explicit search query passed by the agent |
| 3 | Path arguments | Context extracted from file paths, URLs, etc. |
| 4 | Semantic keys | Semantic keyword combination from tool arguments |
| 5 | Tool name | Last resort — use the tool name itself as query |

## Relevance Gating

Surfaced memories are filtered through 5 stages to ensure usefulness:

1. **Context extraction** — Can a meaningful query be generated from the tool call?
2. **Relevance assessment** — Is the extracted query suitable for memory search?
3. **LTM search** — Hybrid search for candidate memories
4. **Score filtering** — Remove results below the `min_score` threshold
5. **Deduplication** — In-session + cross-session (7-day) duplicate prevention

## Model-Aware Defaults

Automatically scales based on the agent's context window size:

| Context window | Compression | Injection size | Result count |
|---|---|---|---|
| ≤ 32K | High compression | Small | Few |
| 32K – 200K | Default | Medium | Default |
| > 200K | Low compression | Large | Many |

## Feedback Loop

When an agent evaluates surfacing quality, the auto-tuner continuously optimizes per-tool relevance thresholds:

- **helpful** → Maintain or lower `min_score` for that tool
- **not_relevant** → Raise `min_score` (stricter filtering)
- **already_known** → Expand deduplication window

## Safety Mechanisms

- **Circuit breaker** (3-state) — Temporarily suspend surfacing after consecutive failures
- **Write-tool skip** — Disable surfacing for tools with side effects (file writes, deletes)
- **Query cooldown** — Prevent rapid repeated searches of the same query
- **Sensitive data detection** — Auto-detect and filter API keys, passwords, PII
