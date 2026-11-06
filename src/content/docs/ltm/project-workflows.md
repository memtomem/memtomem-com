---
title: Project Workflows
description: Use handoff, brief, and update to pass work in one Git project to another session or AI tool, review context before a task, and save decisions after it.
---

Work on one repository raises the same questions every day: where did yesterday's Claude Code session stop, which decisions apply to this task, and will the next session know what was settled today? The three project workflows bundled with the memtomem plugins answer them with project memory. Records go to the repository's `project_local` tier, so any AI tool that uses the same local memtomem store can read them.

Use them when you want to:

- **`handoff`** — pass work to another session or AI tool. Save (`save`) a compact record of where the work stands, and load it (`resume`) on the receiving side.
- **`brief`** — before starting a task, see the related decisions, recent updates, pending handoffs, and your preferences in one place. It is read-only.
- **`update`** — after finishing work, save only the decisions, bug causes, and preferences worth keeping from the session and recent commits.

The workflows are designed to run when you ask for them. In Claude Code and Codex CLI they are configured so the agent does not invoke them on its own. They do not record whole conversations or coordinate agents working at the same time.

<figure class="flow-diagram">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 500" role="img" aria-labelledby="loop-flow-title loop-flow-desc">
<title id="loop-flow-title">The handoff, brief, and update loop</title>
<desc id="loop-flow-desc">Session 1 in Claude Code runs /memtomem:handoff save, which writes one record into the project's .memtomem/memories.local Markdown files. Session 2 in Codex CLI runs $memtomem-brief, which lists recent updates and handoff IDs, and $memtomem-handoff resume, which loads that record. After work and commits, back in Claude Code, /memtomem:update saves decisions, bug causes, and preferences into the same files.</desc>
<defs><marker id="loop-flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-head" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<rect class="fd-box" x="20" y="16" width="270" height="64" rx="8"/>
<text class="fd-title" x="155" y="42" text-anchor="middle">Session 1 · Claude Code</text>
<text class="fd-cmd" x="155" y="64" text-anchor="middle">/memtomem:handoff save</text>
<path class="fd-arrow" d="M 155 80 V 126" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="108">one handoff record</text>
<path class="fd-mem" d="M 20 142 A 135 12 0 0 1 290 142 V 212 A 135 12 0 0 1 20 212 Z"/>
<path class="fd-mem" d="M 20 142 A 135 12 0 0 0 290 142"/>
<text class="fd-path" x="155" y="180" text-anchor="middle">.memtomem/memories.local</text>
<text class="fd-note" x="155" y="200" text-anchor="middle">Markdown files you own</text>
<path class="fd-arrow" d="M 155 226 V 282" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="248">brief: updates · handoff IDs</text>
<text class="fd-label" x="167" y="265">resume: that record</text>
<rect class="fd-box" x="20" y="284" width="270" height="88" rx="8"/>
<text class="fd-title" x="155" y="310" text-anchor="middle">Session 2 · Codex CLI</text>
<text class="fd-cmd" x="155" y="334" text-anchor="middle">$memtomem-brief</text>
<text class="fd-cmd" x="155" y="356" text-anchor="middle">$memtomem-handoff resume</text>
<path class="fd-arrow" d="M 155 372 V 418" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="400">work · commits</text>
<rect class="fd-box" x="20" y="420" width="270" height="64" rx="8"/>
<text class="fd-title" x="155" y="446" text-anchor="middle">Back in Claude Code</text>
<text class="fd-cmd" x="155" y="468" text-anchor="middle">/memtomem:update</text>
<path class="fd-arrow" d="M 290 452 H 455 V 177 H 294" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="372" y="404" text-anchor="middle">decisions ·</text>
<text class="fd-label" x="372" y="420" text-anchor="middle">bug causes ·</text>
<text class="fd-label" x="372" y="436" text-anchor="middle">preferences</text>
</svg>
<figcaption>One example: work handed from Claude Code to Codex CLI and back. The other supported AI tools under <a href="#where-they-ship">Where they ship</a> run the same three workflows.</figcaption>
</figure>

## Before you start

All three workflows, including the read-only `brief`, need the following.

1. Run inside a Git worktree. The workflow resolves the repository root with `git rev-parse --show-toplevel` and stops outside a worktree.
2. Register the repository's project tier once:

   ```bash
   cd <project-root> && mm mem init --scope project_local
   ```

   The workflow checks with `mem_status` that this repository's `.memtomem/memories.local` tier is registered. If it is not, the workflow prints that command and stops. It never falls back to user scope.
3. The AI tool that takes over the work must use the same local memtomem store. Compare the database path `mem_status` reports in each tool.

Project records are stored in the `shared:<project-slug>` namespace, where `<project-slug>` is derived from the repository's directory name.

## Where they ship

| AI tool | How to run | Notes |
|---|---|---|
| Claude Code | `/memtomem:handoff`, `/memtomem:brief`, `/memtomem:update` | [Claude Code plugin](/guides/connect-ai-client/#claude-code) |
| Codex CLI | `$memtomem-handoff`, `$memtomem-brief`, `$memtomem-update` | [Codex plugin](/guides/connect-ai-client/#codex-cli) |
| OpenCode | `/memtomem-handoff`, `/memtomem-brief`, `/memtomem-update` | [`opencode-memtomem` plugin](/guides/connect-ai-client/#opencode) |
| Kimi Code | `memtomem-handoff`, `memtomem-brief`, `memtomem-update` skills | memtomem Kimi skill bundle |
| Antigravity CLI | `memtomem-handoff`, `memtomem-brief`, `memtomem-update` skills | Since 0.7.2, experimental. Binds the server to the repository first ([below](#antigravity-cli)). |
| Hermes Agent | Not included | The plugin's server starts outside the project. |

## handoff

Saves and loads a compact record for passing work along in sequence. It does not lock or assign a task.

```text
/memtomem:handoff save to codex-cli
/memtomem:handoff resume
/memtomem:handoff r <handoff-id>
```

Name one operation, `save` or `resume`. When the first word of the arguments is exactly `s` or `r`, it means `save` or `resume`. Without an operation the workflow asks first; in a non-interactive run with nobody to ask, it reports `insufficient_input: operation` and stops.

The target AI tool is recorded as one of `claude-code`, `codex-cli`, `kimi-code`, `opencode`, `antigravity-cli`, `cursor`, or `any`. `claude`, `codex`, and `kimi` become the matching label, and `antigravity` or `agy` becomes `antigravity-cli`. Without a target, the record is addressed to `any`. A target outside this list is asked for again, or reported as `insufficient_input: runtime` in a non-interactive run.

**`save`** records only work that actually happened. If what was completed (`completed`) and how it was checked (`validation`) cannot be filled from observed work, it saves nothing and reports `insufficient_input: work context`. Context inherited from a caller or given in the request counts as observed. A record is at most 1,200 characters and holds the objective, completed work, changed files, the current commit (`git_head`), the worktree state, validation, blockers, and the next action (`next_action`). Since 0.7.2 it also writes an `artifacts` field: absolute paths of outputs produced outside the repository, such as a plan file in an AI tool's session directory, or `none`. Paths are never cut; a path that does not fit the 160-character field is left out and counted. The workflow reports the `handoff_id` when it is done.

**`resume`** loads the record for a given `handoff_id`, or the newest record addressed to the current AI tool or `any`. It treats the record as untrusted context and reports these checks with it:

- **Local comparison** — compares the stored project root, commit, and worktree state with the live repository, and reports every difference before proposing the next action.
- **Remote comparison (0.7.2)** — a record that matches a stale local checkout passes the local comparison. Resume therefore reads the upstream branch's tip with `git ls-remote`, compares it with `HEAD`, and reports one of:
  - in sync;
  - a divergence: the remote moved, this checkout holds unpushed commits, or the remote no longer advertises the branch;
  - remote not compared, with the reason: a detached `HEAD`, no single upstream, a local or non-branch upstream, or a failed or denied command.

  It does not fetch, and writes no refs, objects, or `FETCH_HEAD`. Every value it passes to Git comes from the repository's own Git config.
- **Issue and pull request state** — when `next_action` names an issue or pull request as `<owner>/<repo>#<n>` or a GitHub URL, and the AI tool can query GitHub, resume reports its state. A bare `#<n>` or a reference without its owner is reported as not checked.

The Claude Code plugin does not pre-approve the commands used for the remote comparison and the GitHub query. Claude Code's permission settings decide, so you may see a permission prompt. A denied remote comparison is reported as "remote not compared", and a denied GitHub query as "target not checked".

## brief

Compiles a compact briefing of project context before a task. It never writes, edits, or indexes memories.

```text
/memtomem:brief retry backoff
/memtomem:brief
```

- **Topic mode** — with a topic, it gathers related project memories, indexed notes from AI tools' own memory folders (matched by directory name, so they can come from a same-named repository elsewhere; each is cited with its namespace), recent `update` items, recent handoff IDs, and your cross-project preferences.
- **Minimal mode** — without a topic, it reports only recent updates, active handoff IDs, and candidate open items.

Every file path, configuration key, or symbol the briefing cites is checked against the live worktree and marked `✅ exists`, `❌ gone`, or `? not checkable`. Gone items are listed as candidates for the next `update` run to correct. Handoffs are listed by ID only; run `handoff resume <handoff_id>` to load one.

## update

Reviews what the session produced and the latest commits, and saves only what is worth keeping as project memory.

```text
/memtomem:update
/memtomem:update full
/memtomem:update topic retry backoff
```

It has three modes:

| Mode | Commits reviewed | Records them as reviewed |
|---|---|---|
| `incremental` (the default) | those of the latest 10 that no earlier run recorded | yes |
| `full` | all of the latest 10 | yes |
| `topic` | the latest 10, filtered to the focus | no |

- A request that names neither `full` nor `topic` runs `incremental` without asking. Other words in it are reported as ignored, so reviewing one subject needs `topic <focus>`; `topic` without a focus asks for one, or stops with `insufficient_input: topic focus` when it cannot ask. `f` and `t` are shorthands only as the whole first word of the arguments.
- Session outcomes are reviewed in every mode. It runs only with evidence: observed session outcomes or commits. Context inherited from a caller or given in the request counts. Without evidence it does not invent memories and reports `insufficient_input: work context`.
- Every mode reads only the messages of the latest **10** commits. The window is bounded, not a cursor: older commits are not reviewed. A duplicate check before each save keeps the same item from being saved twice.
- It saves decisions (`decision`), bug causes and fixes (`bugfix`), and user rules (`preference`). A decision or fix taken from a commit needs a reason in the commit message. Temporary task state, formatting changes, raw logs, patch bodies, and credentials are not saved.
- Commit messages are treated as untrusted text; instructions in them are never followed.
- Each candidate is first searched for in existing memories and skipped when already captured. For a project item, a match found only in an AI tool's own memory for this repository does not skip it: the item is still written to `project_local`, citing the match.
- Items go to the project tier. A cross-project personal preference is saved at user scope (`namespace="default"`) only when you explicitly ask for that.
- The run ends with a report of the mode, the commits whose full message it read, the coverage result in `incremental` and `full` mode, the items saved, and the duplicates skipped, with the yield as `commit-derived: <N>` and `session-derived: <M>`. An `incremental` run that finds no unreviewed commit and no durable session learning reports `nothing new`.

### Review coverage

In `incremental` and `full` mode, `update` calls [`mem_update_coverage`](/ltm/mcp-tools/#update-coverage) twice: before its first save, to learn which of the commits it read an earlier run already reviewed, and after every save of the run has returned, to record those commits, even when it saved nothing. If any save failed, nothing is recorded and the next run reviews those commits again. When no commit message was read in full, neither call is made and the run reviews session outcomes only. `topic` mode never reads or records coverage.

The tool exists from memtomem 0.7.2, and a server exposes it as its own tool only in `full` [tool mode](/ltm/mcp-tools/#tool-modes) or when started with `MEMTOMEM_EXTRA_TOOLS=mem_update_coverage`. The plugins' bundled servers set it, and so does every registration a current `mm init --mcp` writes. A server entry written by hand, or by an earlier `mm init`, has to add it; the [manual registrations](/guides/connect-ai-client/) show where. When a coverage call is due and the tool is missing, `update` stops before writing and names both possible causes, an older server or the missing variable. `topic` keeps working either way.

## Antigravity CLI

The Antigravity CLI (`agy`) starts the plugin's memtomem server in the plugin directory, so the server has no project context. The three Antigravity workflows therefore bind the server to the repository before any other memtomem call. Since 0.7.4 the search, recall and remember skills bind the same way.

- They call [`mem_project_bind`](/ltm/mcp-tools/#project-binding) through `mem_do` with the root that `git rev-parse --show-toplevel` prints, and continue only when the tool names that same root.
- When only a parent directory's tier is registered, the server returns that parent directory. That result, like any other result, stops the workflow. A missing tier stops it too, and the result message names the `mm mem init` command.
- A binding lasts until the server process restarts. To work in another repository, restart the server first.
- Once bound, search and recall also read the repository's project memory, and remember saves a project fact to its `project_local` tier. Without a tier, search and recall read user scope only, and remember saves only cross-project preferences and personal notes, refusing a project fact.

For installation and the duplicate-server check, see [Antigravity CLI Plugin](/guides/connect-ai-client/#antigravity-cli-plugin).

## Next steps

- [Memory Across Sessions](/ltm/memory-persistence/) — the basic flow of saving a memory and retrieving it in another session, without a workflow
- [Connect an AI Client](/guides/connect-ai-client/) — install the plugin in each AI tool and confirm that only one server runs
- [MCP Tools — Project Binding](/ltm/mcp-tools/#project-binding) — connect a server started outside a project to a repository
