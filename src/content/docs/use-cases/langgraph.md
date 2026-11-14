---
title: Give a LangGraph Workflow Memory It Can Reopen
description: Two Korean notebooks distinguish thread state, a standard persistent Store, and source-backed Core retrieval without requiring an LLM.
---

**For:** Python developers learning LangGraph memory. **Notebook language:** Korean; code identifiers remain English.

## The problem

A conversation's state and reusable knowledge are different. A checkpointer tracks a thread's graph state; a Store lets your application explicitly select memory across threads. One does not replace the other.

These are synthetic learning examples. The default responses are deterministic templates, not simulated claims of live LLM behavior.

## Two short, independent notebooks

| Notebook | What you build | Evidence |
|---|---|---|
| 05: Memory basics | Store a preference through `compile(store=...)` | Same-user new thread reads it; another namespace does not; a new store object reopens the file |
| 06: Retrieval memory | Retrieve → compose → approve → save | Unapproved draft creates no output memory; approved result has a Markdown source and can be searched after reopening |

- [Read Korean notebook 05](https://github.com/memtomem/memtomem/blob/v0.7.9/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [Download notebook 05](https://raw.githubusercontent.com/memtomem/memtomem/v0.7.9/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [Read Korean notebook 06](https://github.com/memtomem/memtomem/blob/v0.7.9/examples/notebooks/06_langgraph_retrieval_memory.ipynb)
- [Download notebook 06](https://raw.githubusercontent.com/memtomem/memtomem/v0.7.9/examples/notebooks/06_langgraph_retrieval_memory.ipynb)

Download each raw file using “Save link as” if your browser displays JSON. Each notebook includes its own input, code, assertions, explanation, recovery steps, and exercise. No private repository or previous notebook run is required.

## Start without a model

Use Python 3.12 or newer in an isolated environment:

```bash
uv venv .venv
uv pip install --python .venv/bin/python "memtomem[langgraph]==0.7.9" jupyterlab ipykernel
uv run --python .venv/bin/python --no-project jupyter lab
```

On Windows, replace `.venv/bin/python` with `.venv/Scripts/python.exe`. Select that environment's Python kernel and run all cells. Initial package installation needs internet, but the required examples use no API key, embedding model download, or STM server.

Each notebook should print six `PASS` markers. Notebook 06 additionally prints `SKIP LLM` by default.

## Do not confuse the two adapters

`MemtomemBaseStore` implements LangGraph's standard Store interface, with tuple namespaces stored in inspectable JSON files. Its no-embedding search uses lexical overlap, not Core's BM25/RRF pipeline. It does not support TTL.

:::caution[Upgrading to 0.7.4 or later]
The first time 0.7.4 or later opens a `MemtomemBaseStore`, it moves the record files to `<root>/records.v2/` under a lock file (`<root>/.layout.lock`), so names that differ only in case no longer share a file on macOS and Windows. Stop every process running an older memtomem on that store first. A record an older process writes later in the old layout is moved on the next open when its key is new; if it conflicts with a different existing record, the older process's copy goes to `<root>/quarantine.v2/` to be resolved by hand. The move is not undone automatically; to go back, restore a copy of the store root taken before the upgrade.
:::

`MemtomemStore` is an async adapter that exposes Core's Markdown write/index/search operations, sessions, and working memory, and is used explicitly inside nodes, not passed as `compile(store=...)`. Without `file=`, its `add()` appends to the [day file](/ltm/cli/#mm-add) of the write's namespace. An `add()` whose target already holds entries in another namespace, or, since 0.7.5, has a day-file name that decodes to another namespace, returns `{"error": "namespace_mix_refused", ...}` and has no override: write to another file or under that file's namespace. Notebook 06 uses keyword-only search. The two examples do not automatically share a database with each other or with a coding client.

`MemtomemStore`'s `config_overrides` apply after ambient config. Use them to point a graph at its own database so test writes do not land in the user's default store. An unknown section or key raises an error on the first call instead of falling back to the default store.

`InMemorySaver` is an in-process teaching checkpointer, not durable checkpoint recovery. Namespace selection is not an authentication or authorization system.

## A Store Ranked by Core's Search Pipeline

When the Store you pass to `compile(store=...)` should rank items with Core's search pipeline (BM25 and dense fusion, optional rerank), use `MemtomemPipelineStore` from the separate [`langchain-memtomem`](https://pypi.org/project/langchain-memtomem/0.2.0/) package. It requires Python 3.12+, `langgraph>=1.0,<2`, and `memtomem>=0.7.4,<0.8`. To add it to the environment above (on Windows, use `.venv/Scripts/python.exe`):

```bash
uv pip install --python .venv/bin/python langchain-memtomem
```

```python
from langchain_memtomem import MemtomemPipelineStore

store = await MemtomemPipelineStore.open("/var/app/memory")
graph = builder.compile(store=store)  # builder: StateGraph
```

- The store builds its own index under the root you choose. Your personal `~/.memtomem` configuration and `MEMTOMEM_*` variables do not reach its configuration: it holds the application's memory (users, threads), not yours. It does read your project-tier registry once, and it can use memtomem's shared paths outside the root, such as the ONNX model cache.
- Embedding is off by default (BM25 only, no model download). Install `memtomem[onnx]` alongside it and pass `config={"embedding": {...}}` to turn it on.
- Pass `retrieval={"mode": "hybrid" | "bm25" | "dense", "weights": [bm25, dense], "rrf_k": 60}` to `MemtomemPipelineStore.open(...)` to choose which search legs run (any other key raises `ValueError`). `weights` applies only in `"hybrid"` mode, and `"dense"` requires an embedder (refused at open without one, and raises `DenseSearchUnavailable` if a query's dense leg cannot run). Set retrieval legs either via `retrieval=` or via `config["search"]` (`enable_bm25`, `enable_dense`, `rrf_weights`, `rrf_k`), not both (giving both is refused); other pipeline sections such as `rerank` or `search` (`cache_ttl`, …) belong in `config={...}`.
- An item stored with `index=False` is listed and filtered but never ranked. TTL is not supported.
- The two notebooks above do not use this package.

The [PyPI release page](https://pypi.org/project/langchain-memtomem/0.2.0/) covers the rest of its behavior.

## Optional: replace the draft node with an LLM

Notebook 06 contains an opt-in OpenAI Responses API cell. It requires `RUN_LLM=True`, `OPENAI_API_KEY`, and an explicit `OPENAI_MODEL`. It sends only synthetic retrieved text, may incur API charges, and leaves the response as an unsaved draft. Missing configuration is a skip; an attempted request failure is an error.

Model access, billing, remote tracing, production checkpoint recovery, and broad MCP-adapter compatibility are outside the default proof.

**Next:** [Core memory concepts](/ltm/overview/), [search behavior](/ltm/hybrid-search/), or [the coding-agent case](/use-cases/vibe-coding/).

References: [LangGraph memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · [OpenAI API setup](https://developers.openai.com/api/docs/quickstart).
