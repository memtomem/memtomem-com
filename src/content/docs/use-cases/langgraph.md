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

- [Read Korean notebook 05](https://github.com/memtomem/memtomem/blob/main/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [Download notebook 05](https://raw.githubusercontent.com/memtomem/memtomem/main/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [Read Korean notebook 06](https://github.com/memtomem/memtomem/blob/main/examples/notebooks/06_langgraph_retrieval_memory.ipynb)
- [Download notebook 06](https://raw.githubusercontent.com/memtomem/memtomem/main/examples/notebooks/06_langgraph_retrieval_memory.ipynb)

Download each raw file using “Save link as” if your browser displays JSON. Each notebook includes its own input, code, assertions, explanation, recovery steps, and exercise. No private repository or previous notebook run is required.

## Start without a model

Use Python 3.12 or newer in an isolated environment:

```bash
uv venv .venv
uv pip install --python .venv/bin/python "memtomem[langgraph]==0.5.0" jupyterlab ipykernel
uv run --python .venv/bin/python --no-project jupyter lab
```

On Windows, replace `.venv/bin/python` with `.venv/Scripts/python.exe`. Select that environment's Python kernel and run all cells. Initial package installation needs internet, but the required examples use no API key, embedding model download, or STM server.

Each notebook should print six `PASS` markers. Notebook 06 additionally prints `SKIP LLM` by default.

## Do not confuse the two adapters

`MemtomemBaseStore` implements LangGraph's standard Store interface and uses inspectable JSON files. Its no-embedding search uses lexical overlap, not Core's BM25/RRF pipeline. It does not support TTL.

`MemtomemStore` exposes Core's Markdown write/index/search operations and is used explicitly inside nodes, not passed as `compile(store=...)`. Notebook 06 uses keyword-only search. The two examples do not automatically share a database with each other or with a coding client.

`InMemorySaver` is an in-process teaching checkpointer, not durable checkpoint recovery. Namespace selection is not an authentication or authorization system.

## Optional: replace the draft node with an LLM

Notebook 06 contains an opt-in OpenAI Responses API cell. It requires `RUN_LLM=True`, `OPENAI_API_KEY`, and an explicit `OPENAI_MODEL`. It sends only synthetic retrieved text, may incur API charges, and leaves the response as an unsaved draft. Missing configuration is a skip; an attempted request failure is an error.

Model access, billing, remote tracing, production checkpoint recovery, and broad MCP-adapter compatibility are outside the default proof.

**Next:** [Core memory concepts](/ltm/overview/), [search behavior](/ltm/hybrid-search/), or [the coding-agent case](/use-cases/vibe-coding/).

References: [LangGraph memory](https://docs.langchain.com/oss/python/langgraph/add-memory) · [OpenAI API setup](https://developers.openai.com/api/docs/quickstart).
