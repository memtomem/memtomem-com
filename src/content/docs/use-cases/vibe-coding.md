---
title: Pick Up Coding Without Re-explaining Decisions
description: "A synthetic project walkthrough for coding-agent users: save a decision, reopen a session, and retrieve its reason and source."
---

**For:** coding-agent and vibe-coding users. **Format:** prompts and a small sample project, not a Python notebook.

## The problem

You agreed on a retry policy yesterday. Today you open a new chat and need its reason again. Permanent rules still belong in `AGENTS.md` or `CLAUDE.md`; memtomem gives you an explicit way to save and retrieve past decisions and evidence.

This is a **synthetic demonstration**, not a customer testimonial or a measured productivity claim.

## The working example

Our sample keeps an old authentication callback during a staged rollout. Its ADR names the compatibility reason, rollback flag, and retry settings.

1. Complete [Quick Start](/guides/quickstart/) and [Connect an AI Client](/guides/connect-ai-client/).
2. Explicitly save the sample retry decision and reason.
3. Open a genuinely new session and request memory search.
4. Check the returned decision, reason, and original source path.

Use [Memory Across Sessions](/guides/memory-persistence/) for the full save/reopen/recall procedure. Claude Code and Codex have separate copyable instructions there; other clients can request `mem_add` and `mem_search` directly.

## Try the sample

[Open the sample project and Korean instructions](https://github.com/memtomem/memtomem/tree/main/examples/onboarding/retry-policy)

The isolated `demo.py` verifies an empty store, a saved decision, source-backed ADR retrieval, and cleanup. It uses no API key or embedding model, does not register a client, and leaves your normal memory store untouched. Initial package installation still needs internet.

Its four success markers are:

```text
PASS empty-store
PASS decision-round-trip
PASS adr-source
PASS fixture-preserved-and-state-cleaned
```

These markers prove CLI persistence, **not** that an AI client called memory in a new session. Perform that separate check yourself.

## A practical follow-up: consult the ADR before changing code

From the sample directory:

```bash
mm index docs/auth-callback-adr.md
mm search "legacy callback" --format context
```

Then ask your coding agent:

> Do not edit code yet. Search memtomem for "legacy callback".
> Show the compatibility reason, rollback flag, and source path.
> Propose a change only after checking that evidence.

The result should identify `/api/auth/legacy-callback`, older-client compatibility, and `AUTH_CALLBACK_V2_ENABLED`. The sample also has a small standard-library test; passing it does not certify a real service.

## What counts as success?

- The new session actually uses the memory tool.
- The result includes the saved reason and source, not just a plausible answer.
- The ADR can be retrieved after explicit indexing.
- If two clients are compared, both show the same store and compatible project context.

This does not demonstrate automatic conversation capture, cross-machine synchronization, or a measured reduction in coding errors. Agent subscriptions are separate from the no-API CLI sample. For a failed step, use [Troubleshooting](/guides/troubleshooting/).

**Next:** [Index existing content](/guides/index-and-import/) or [learn the LangGraph path](/use-cases/langgraph/).
