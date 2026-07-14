---
title: CLI Reference
description: mm CLI commands for memtomem LTM server management.
---

The `mm` command is installed with the `memtomem` package. It provides setup, search, indexing, session tracking, and cross-project context sync. Run `mm --help` for the full command list or `mm --version` to print the installed version (the `mm version` subcommand also works).

> This page targets memtomem v0.3.10. Commands are grouped by function, but it's a single reference — scan top to bottom.

## Setup

### `mm init`

Run the interactive setup wizard. Configures embedding provider, database path, tokenizer, reranker, and default namespace.

At startup, the setup wizard offers a **preset picker** (Minimal / English / Korean) that applies a curated bundle of embedding, reranker, tokenizer, and namespace defaults. Pass `--preset <name>` to pick one non-interactively, or `--advanced` to force the full 10-step wizard.

```bash
mm init                              # interactive setup with preset picker
mm init --non-interactive            # auto-accept; behaves as `--preset minimal --non-interactive`
mm init --preset korean              # apply Korean preset non-interactively
mm init --preset english --non-interactive   # English preset, no prompts
mm init --advanced                   # skip picker, run full 10-step wizard
mm init --fresh                      # bulk-clean accumulated config, then re-run wizard
```

On a reinstall path, `mm init` compares the embedding provider / model / dimension stored in the existing `~/.memtomem/memtomem.db` against the new preset. On mismatch, the interactive wizard offers an in-place rebuild of the vector index (`chunks_vec`); under `--non-interactive`, it prints a recovery hint pointing at `mm embedding-reset --mode apply-current`. The chunks table itself is preserved, so re-running `mm index <path>` afterwards restores the working set.

`--fresh` drops every wizard-untouched config key whose value differs from the built-in default, then re-runs the wizard. A safe cleanup option when the config has accumulated leftovers from older versions; the previous `config.json` is backed up to `config.json.bak-<unix-ts>` before rewriting.

### Running the MCP server

memtomem's MCP server ships as the `memtomem-server` console script. You normally don't launch it by hand — your MCP client (Claude Desktop, Claude Code, Cursor, etc.) starts it automatically from its config file. See [Quick Start](/guides/quickstart/) for the config snippets.

To filter which tools the server advertises, set `MEMTOMEM_TOOL_MODE` (`core` / `standard` / `full`) in the client's MCP config. The default is `core` (8 core tools + the `mem_do` router, 9 total); `full` exposes 96 current tools plus one deprecated alias. See the [MCP Tools](/ltm/mcp-tools/) page for modes and tool catalogs.

Since v0.1.25, an MCP handshake alone no longer creates `~/.memtomem/memtomem.db` — the DB opens on the first tool call, and the server pid/flock file moved to `$XDG_RUNTIME_DIR/memtomem/server.pid` (or `$TMPDIR/memtomem-$UID/` on platforms without one). A client that connects but never calls a tool leaves the home directory untouched.

### `mm config show / set / unset`

`mm config show` displays the current configuration with API keys masked. `--json` (or `--format json`) emits the full config as machine-readable JSON. `mm config set <key> <value>` writes a user override on top of built-in defaults; `mm config unset <keys...>` removes those overrides so the field reverts to its built-in default (or whatever a `config.d/*.json` fragment resolves to).

```bash
mm config show                       # human-readable table
mm config show --json                # JSON for scripting
mm config set search.default_top_k 20
mm config set rerank.model bge-reranker-base
mm config unset indexing.memory_dirs
mm config unset rerank.model search.default_top_k
```

`mm config unset` is idempotent — removing a key that isn't there is a silent no-op. Useful for clearing stale cross-machine paths in `indexing.memory_dirs`, or a single field that's shadowing a `config.d` fragment.

## Search & Recall

### `mm search <query>`

Search the knowledge base from the command line.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --top-k 5
```

`--top-k` / `-k` caps results (default 10). Other filters: `--source-filter` / `-s`, `--tag-filter` / `-t`, `--namespace` / `-n`, `--as-of` (point-in-time bound, `YYYY-MM-DD` / `YYYY-QN`), and `--format` (`table` / `json` / `plain` / `context` / `smart`).

### `mm tags list / rename / delete / merge`

Curate the tags on your chunks — the CLI equivalent of the Web UI Tags tab. Every mutating subcommand is a dry-run by default; pass `--apply` to actually write.

```bash
mm tags list                                 # tags in use and how often
mm tags rename ops infra                      # dry-run preview
mm tags rename ops infra --apply              # perform the rename
mm tags delete deprecated --apply             # drop a tag (chunks stay indexed)
mm tags merge py python --into python --apply # fold several tags into one
```

Without `--apply`, each command first shows the affected chunk count and samples. `delete` only strips the tag — the chunks themselves stay in the index.

### `mm recall`

Browse recent memory chunks chronologically. Unlike `mm search`, no query needed — filter by date range, source path, or namespace instead.

```bash
mm recall                                    # most recent 20 chunks (default table)
mm recall --since 2026-04 --limit 50
mm recall --source-filter "postmortems/" --format json
mm recall --namespace project-x --format plain
```

`--format` picks `table` (default, human), `json` (scripting), or `plain` (text pipe). Date arguments accept `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, and ISO datetimes.

### `mm web`

Launch the Web UI dashboard for browser-based search and memory management.

On launch, `mm web` opens the dashboard at `http://127.0.0.1:8080` with these tabs: **Home · Search · Sources · Index · Tags · Timeline · More**. The **More** tab holds Settings, Dedup, Age-out, Export/Import, and Reset Database.

The Context Gateway tab opens in a **Simple view** by default — for each artifact kind (skills / commands / subagents) it shows a one-line status ("already in your AI tools" or "still needs to be pushed out") and, on any row that needs action, a single button: **Sync** or **Import**. The full control grid is one click away as **Advanced**.

Pass `--dev` (or set `MEMTOMEM_WEB__MODE=dev`) to unlock maintainer pages: **Namespaces, Sessions, Working Memory, Health Report**. Most users won't need these.

```bash
mm web                               # default: http://localhost:8080 (prod tier)
mm web --port 9000
mm web --open                        # also open the URL in your default browser
mm web --dev                         # shortcut for --mode dev
mm web --mode dev                    # expose opt-in maintainer pages
```

### `mm shell`

Start an interactive REPL — search, add, recall, tag counts, and index stats all from a single prompt. Handy for browsing memory from a terminal without an MCP client, or for a quick post-install feel-check of the DB.

```bash
mm shell
mm> search deployment checklist
mm> ask summarize last week's migration rollback decision
mm> add "new fact I just learned"
mm> stats
mm> quit
```

Bare text (no command) is treated as an implicit `search`. Exit with Ctrl+D or `quit` / `exit` / `q`.

## Adding & Indexing

### `mm add`

Add a memory entry and index it. Without `--file`, the content is appended to `~/.memtomem/memories/<today-UTC>.md`.

```bash
mm add "apply tree-sitter AST parser to hallway-door PR"
mm add "API timeout policy" --title "API timeout" --tags "ops,api"
mm add "postmortem summary" --file postmortems/2026-04-auth.md
```

Tags passed via `--tags` are merged onto the appended file's chunk metadata right after indexing — the chunker doesn't parse tag text from the body, so the merge is explicit. `--file` only accepts paths relative to `~/.memtomem/memories/` and rejects `..` components.

### `mm index <path>`

One-shot command that **seeds** the index with files already on disk. Re-runs are safe — chunks are content-hashed, so unchanged files are skipped.

```bash
mm index .                           # index current directory
mm index ~/docs/architecture         # index a specific directory
mm index README.md                   # index a single file
```

Paths listed in `indexing.memory_dirs` are additionally watched by the file watcher that `mm server` starts — but the watcher is **reactive only**. It reindexes on modify/create/move events that fire after it starts, so **pre-existing files at boot time are not auto-scanned**. The normal flow is to seed once with `mm index <dir>` (or `mem_index(path="<dir>")`) and then let the watcher handle further edits. This is why the `mm init` wizard prints `mm index {memory_dir}` as step 1 of its `Next steps`.

### `mm ingest`

Consolidate memories from other AI tools into memtomem. The `--source` path is required; re-runs are incremental via content-hash matching.

```bash
mm ingest claude-memory --source ~/.claude/projects/    # import Claude Code memories
mm ingest gemini-memory --source ~/.gemini/GEMINI.md    # import Antigravity CLI GEMINI.md
mm ingest codex-memory --source ~/.codex/memories/      # import Codex CLI memories
```

## Context Gateway

The Context Gateway syncs the agent definitions, skills, and commands you store in canonical form out to each AI runtime. The basic flow within one project is detect → init → sync → diff; v0.3.0 adds cross-project / cross-tier transfer and fleet-wide operations.

Tiers are addressed by friendly labels: **User** (`--scope user`, personal, visible in every project), **Project (shared)** (`--scope project_shared`, git-tracked), and **Project (local)** (`--scope project_local`, local drafts).

### `mm context sync`

Sync your stored canonical files out to the detected runtime files.

```bash
mm context detect
mm context init --scope project_shared --confirm-project-shared
mm context sync --scope project_shared
mm context diff --scope project_shared
```

**Project (shared)** is git-tracked, so it requires explicit confirmation and should not contain secrets. Syncing to the **User** tier (`--scope user`) places the canonical files under `~/.memtomem/` so they show up in every project — because that writes outside the project (your home directory), the gateway shows exactly which file paths it will touch and asks for confirmation. In non-interactive contexts, `--yes` skips the prompt.

MCP server definitions move through the same flow. `mm context sync --include=mcp-servers` syncs canonical MCP server definitions into a project's `.mcp.json` (with secret-safety checks) — an opt-in path that only runs when you ask for it.

### Reuse a skill from another project (`mm context move` / `copy`)

Use this when you want to bring a skill, agent, or command you already built in another project into this one, or shift it between tiers. `copy` leaves the original in place (rename it with `--as` if needed); `move` cleans up the source.

```bash
# copy another project's skill into the current one (preview first)
mm context copy skills my-skill --to-project ~/work/other-app
mm context copy skills my-skill --to-project ~/work/other-app --apply

# copy to your user tier under a new name
mm context copy agents reviewer --to user --as reviewer-strict --apply

# tier move: promote a local draft to the shared tier
mm context move commands deploy --to project_shared --confirm-project-shared --apply

# copy an MCP server definition to another project
mm context copy mcp-servers github --to-project ~/work/other-app --apply
```

Both default to a dry-run preview; pass `--apply` to execute. A destination collision always refuses (no `--force` valve). A landing in **Project (shared)** runs a privacy scan and additionally requires `--confirm-project-shared`. After a transfer the command prints the follow-up that pushes the artifact out to your AI tools at the destination (e.g. `mm context sync`) so you can run it next.

### Operate across many projects (`mm context projects`)

Register the projects you work across, then push shared artifacts out to all of them in one call (`sync --all-projects`) or ask read-only which projects have drifted (`status --all-projects`).

```bash
mm context projects add ~/work/app-a          # register in the registry
mm context projects list                      # registered projects + health/enrollment
mm context projects pause ~/work/app-a        # exclude from batch operations
mm context projects resume ~/work/app-a       # include again

mm context sync --all-projects                # bulk-sync every eligible project
mm context status --all-projects              # read-only: which projects drifted
```

The bulk sync targets the **Project (shared)** tier only, and one project's failure does not abort the batch. A `pause`d project is skipped by every `--all-projects` operation.

### Seeding from existing runtime files

There is no separate `mm context import` command. To seed canonical files from runtime-specific files, run `mm context init` with the artifact kinds and destination tier.

```bash
mm context detect --include agents,skills
mm context init --include agents,skills --scope project_shared --confirm-project-shared
mm context diff --include agents,skills --scope project_shared
```

This is useful when you already authored files directly in Claude Code, Codex CLI, Antigravity CLI, or another runtime and want memtomem to manage them going forward. For reuse across projects see `move`/`copy` above; to install from a host-global library see `mm wiki`.

## Wiki — a canonical artifact library

Collect canonical versions of your skills, agents, and commands in a host-global wiki (`~/.memtomem-wiki/`) and install them into projects on demand. The wiki is a normal git repo, so changes are recorded as isolated commits and backed up / synced across machines via remote/push/pull — no separate sync tooling needed.

```bash
mm wiki init                          # create ~/.memtomem-wiki/ (skills/ agents/ commands/)
mm wiki init --from git@host:me/wiki  # clone an existing wiki from a git URL
mm wiki list                          # list the skills / agents / commands you hold
mm wiki list --type skills

mm wiki remote git@host:me/wiki       # configure the backup remote (origin)
mm wiki push                          # back up to the remote
mm wiki pull                          # restore on another machine
```

Each artifact kind (`skill` / `agent` / `command`) has a subgroup to seed per-runtime overrides and to diff, lint, and commit them. The Commit button in the dev-mode browser does the same, so no raw git is required.

```bash
mm wiki skill override my-skill --vendor claude --editor   # seed an override from canonical content
mm wiki skill diff my-skill --vendor claude                # diff against the canonical render
mm wiki skill lint my-skill                                # validate it is installable (usable as a CI gate)
mm wiki skill commit my-skill --vendor claude              # record as an isolated commit
```

Install an artifact you've collected with `mm context install <type> <name>`.

## Sessions & Multi-Agent

### `mm session`

Manage agent sessions — start, end, list, events, and wrap. Sessions group activity events and tie them to an agent runtime.

```bash
mm session start --agent-id claude-code --title "refactor auth"
mm session list --json                           # scriptable list output
mm session events <session-id> --json            # event timeline as JSON
mm session wrap -- <command...>                  # auto start/end around a command
mm session end
```

The current session ID is stored in `~/.memtomem/.current_session`, so `mm activity log` and other commands pick it up automatically.

### `mm activity log`

Log an activity event (tool call, decision, error, subagent lifecycle) to the current session. Silent by default so hook callers never fail; `--json` emits an ack shape for scripting.

```bash
mm activity log --type tool_call --content "ran tests"
mm activity log --type decision --content "picked strategy X" --meta '{"k":"v"}' --json
```

With `--json`, a successful write returns `{"ok": true, ...}` on stdout; no active session or a write failure returns `{"ok": false, "reason": ...}`. Exit code is always 0.

### `mm agent register / list / share`

CLI mirrors of the MCP `mem_agent_*` tools — register agents, inspect the registry, and copy chunks between scopes.

```bash
mm agent register planner --description "Planning subagent" --color "#6c5ce7"
mm agent list                        # registered agents + the shared namespace
mm agent list --json
mm agent share <chunk-id>                          # copy into the shared namespace
mm agent share <chunk-id> --target agent-runtime:reviewer
```

`mm agent register` creates the `agent-runtime:{agent_id}` namespace; re-registering with the same id only updates metadata. `agent_id` must match `[A-Za-z0-9._-]` — IDs outside the allowed pattern are rejected.

`mm agent share` is a **copy**, not a reference link. The new chunk gets a fresh UUID and source updates do not propagate; provenance is recorded only via a `shared-from=<source-uuid>` tag on the copy.

## Diagnostics

### `mm status`

Terminal mirror of the MCP `mem_status` tool. Use it as a post-install sanity check: confirms the binary runs, the config parses, the DB is reachable, and the embedding config is in sync — without needing to launch an MCP client. Sits between `mm config show` (config only) and `mm watchdog status` (periodic snapshots).

```bash
mm status                            # indexing stats + config summary (same output as mem_status)
mm status --json                     # machine-readable, for scripts / `jq` pipelines
```

Added in v0.1.25; `--json` / `--format json` added in v0.3.4. Good fit for a one-liner "is the DB open and how many entries are in it" check before wiring an MCP client.

### `mm warmup`

Preload the local embedder / reranker models so the **first** query doesn't pay the one-time model load. Optional — without it the models load lazily on first use.

```bash
mm warmup                            # load models now (one-shot)
```

To warm up automatically when the MCP server starts, set `MEMTOMEM_WARMUP__ENABLED=true`. Remote providers (Ollama / OpenAI / Cohere) are skipped — there's nothing local to preload.

### `mm memory doctor`

Inspect memory-store consistency read-only — it reports 3-way drift between the notes folder on disk, the index file, and the searchable DB (e.g. files added while the server was off and never indexed, or dead index links). The default report is read-only and changes nothing.

```bash
mm memory doctor                     # inspect every memory_dir (read-only)
mm memory doctor ~/notes             # scope to one configured memory_dir
mm memory doctor --fix               # preview removal of broken index links (dry-run)
mm memory doctor --fix --apply       # actually remove broken links
```

`--fix` only removes index pointer lines whose target is missing on disk, and it is a dry-run unless `--apply` is also passed. It exits 1 when any error-severity finding exists, so it works as a CI check.

### `mm watchdog`

Periodic health-check command group. Read back snapshots left by the background scheduler, or run every check once on demand.

```bash
mm watchdog status                           # latest results summary
mm watchdog status --json                    # JSON output
mm watchdog run                              # run all checks now
mm watchdog history db_size --hours 48       # 48h trend for a specific check
```

The scheduler only runs in the background when `health_watchdog.enabled` is on (the MCP server drives it). Even with the scheduler off, `mm watchdog run` works any time for a one-shot offline check.

### `mm schedule add / list / run-now / delete`

Register cron-driven jobs (compaction, importance decay, dead-link cleanup, dedup scans, …) and inspect or run them.

```bash
mm schedule add --cron "0 3 * * *" --job dedup_scan
mm schedule add --cron "0 */6 * * *" --job importance_decay --params '{"max_age_days": 90}'
mm schedule list
mm schedule list --json
mm schedule run-now <sched-id>       # fire immediately, out of band
mm schedule delete <sched-id>
```

`--cron` is a 5-field expression in UTC. `--params` is a JSON dict of job-specific parameters. The dispatcher rides the health-watchdog loop, so registered jobs only fire when both `scheduler.enabled` and `health_watchdog.enabled` are on.

## Maintenance & Lifecycle

### `mm embedding-reset`

Check or resolve mismatches between the embedding model/dimension stored in the DB and the current config (typically after swapping providers or following a reinstall). `--mode` selects the action.

```bash
mm embedding-reset                            # --mode status (default): compare DB vs. config
mm embedding-reset --mode apply-current       # reset DB to current config (destructive — re-index required)
mm embedding-reset --mode revert-to-stored    # switch runtime embedder to DB stored values (non-destructive)
```

`apply-current` rebuilds `chunks_vec` at the current config's dimension. The chunks table itself is preserved, but all vectors are deleted — run `mm index <path>` afterwards to re-index. `revert-to-stored` only flips runtime state; to make it permanent, update the embedding fields in `~/.memtomem/config.json` accordingly.

### `mm purge --matching-excluded`

Remove already-indexed chunks whose source paths match the built-in credential denylist or your `indexing.exclude_patterns`. Runs as a dry-run by default — pass `--apply` to actually delete.

```bash
mm purge --matching-excluded          # dry-run — shows what would be removed
mm purge --matching-excluded --apply  # perform the deletion
```

### `mm reset`

Delete all data (chunks, sessions, activity log, etc.) from the DB and reinitialize the schema. Embedding configuration is preserved — re-index to repopulate, no re-config needed. A confirmation prompt shows the row count; pass `-y` to skip.

```bash
mm reset                             # confirm, then delete
mm reset -y                          # skip prompt
```

Where `mm embedding-reset --mode apply-current` rebuilds vectors only, `mm reset` drops the whole index. It doesn't touch the config file — for a full wipe, pair it with `mm init --fresh` or `mm uninstall`.

### `mm upgrade`

Stop a running memtomem-server, then reinstall via `uv tool`. `uv tool install --reinstall memtomem` alone only swaps the on-disk bytes — a server already imported by an MCP client keeps running the previous version — so this adds the process-cleanup step around it.

```bash
mm upgrade                           # reinstall to the latest version (extras auto-detected)
mm upgrade --version 0.3.10           # pin a specific version
mm upgrade --extras all              # name the extras to install (default: auto-detect)
mm upgrade --dry-run                 # print the plan, change nothing
```

Extras are auto-detected from the current uv-tool install by default, so a `memtomem[all]` user keeps `[all]`.

### `mm uninstall`

Clean up `~/.memtomem/` state (config, DB, fragments, backups, uploads) separately from removing the binary. Package-manager commands like `uv tool uninstall memtomem` only remove the executable, which leaves stale state behind on reinstall — since v0.1.23 this subcommand closes the gap.

```bash
mm uninstall                  # interactive, removes everything
mm uninstall -y               # skip the confirmation prompt
mm uninstall --keep-config    # preserve config.json + config.d/* + backups
mm uninstall --keep-data      # preserve the SQLite DB + ~/.memtomem/memories/
mm uninstall --force          # bypass the running-server safety check
```

Custom `storage.sqlite_path` values outside the default directory are included in the inventory. The command refuses to run while the MCP server is alive (open WAL handles risk corruption); stop it first or pass `--force`. External editor MCP entries (`~/.claude.json`, `~/.codex/config.toml`, etc.) are **detected and reported**, never modified. At the end it prints the exact binary-removal command for your install context (`uv tool uninstall memtomem`, `pip uninstall memtomem`, etc.) so you can follow through.

> See [Quick Start](/guides/quickstart/) for the full getting-started walkthrough.
