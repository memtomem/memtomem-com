---
title: 문서를 MCP로 사용하기
description: memtomem 문서를 AI 에이전트가 직접 읽게 하는 방법 — llms.txt와 로컬 MCP 서버(mcpdoc).
---

memtomem 문서는 AI 에이전트가 직접 읽을 수 있도록 두 가지 방식을 제공합니다. 모두 호스팅 서버 없이 동작합니다.

## llms.txt

빌드 시 정적으로 생성되는 LLM 친화 문서 인덱스입니다.

| 파일 | 용도 |
|---|---|
| [`/llms.txt`](https://memtomem.com/llms.txt) | 인덱스 — 사용 가능한 문서 세트 안내 |
| [`/llms-full.txt`](https://memtomem.com/llms-full.txt) | 전체 문서를 한 파일로 |
| [`/llms-small.txt`](https://memtomem.com/llms-small.txt) | 작은 컨텍스트 창용 축약본 |

Claude·ChatGPT·Cursor 등 대부분의 도구는 이 URL을 직접 가져와 읽을 수 있습니다.

## 로컬 MCP 서버 (mcpdoc)

[`mcpdoc`](https://github.com/langchain-ai/mcpdoc)는 llms.txt를 MCP 도구로 노출하는 오픈소스 MCP 서버입니다. **내 컴퓨터에서 실행**되므로 호스팅이 필요 없고, 에이전트는 `list_doc_sources`·`fetch_docs` 도구로 memtomem 문서를 검색합니다.

### 사전 준비

```bash
# uv 설치 (이미 있으면 생략)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 실행

```bash
uvx --from mcpdoc mcpdoc --urls "memtomem:https://memtomem.com/llms.txt" --transport stdio
```

### Claude Code 연결

```bash
claude mcp add memtomem-docs -s user -- \
  uvx --from mcpdoc mcpdoc --urls "memtomem:https://memtomem.com/llms.txt" --transport stdio
```

### Cursor · Windsurf · Antigravity · 기타 MCP 클라이언트

MCP 설정 파일에 추가합니다.

```json
{
  "mcpServers": {
    "memtomem-docs": {
      "command": "uvx",
      "args": ["--from", "mcpdoc", "mcpdoc", "--urls", "memtomem:https://memtomem.com/llms.txt", "--transport", "stdio"]
    }
  }
}
```

Codex CLI 등 stdio 기반 MCP 클라이언트도 동일한 `command`/`args`로 등록합니다.

### 에이전트에게 사용을 안내

에이전트가 도구를 자동으로 쓰지 않으면, 규칙/시스템 프롬프트에 한 줄 추가합니다.

> memtomem 관련 질문에는 `memtomem-docs` MCP 서버를 사용하라 — 먼저 `list_doc_sources`를 호출하고, 이어 `fetch_docs`로 관련 문서를 읽어라.

:::note[도메인 허용 범위]
원격 llms.txt URL을 지정하면 mcpdoc은 해당 도메인(`memtomem.com`)만 자동으로 허용합니다. 로컬 파일을 쓰려면 `--allowed-domains`로 도메인을 명시해야 합니다.
:::

## memtomem으로 직접 기억하기

memtomem 자체가 메모리 MCP 서버이므로, 문서를 내려받아 색인하면 하이브리드 검색으로 활용할 수 있습니다.

```bash
curl -sL https://memtomem.com/llms-full.txt -o memtomem-docs.md
mm index ./memtomem-docs.md
```

이후 에이전트는 `mem_search`로 문서를 검색합니다. 자세한 내용은 [하이브리드 검색](/ko/ltm/hybrid-search/)을 참고하세요.

## 관련 문서

- [Quick Start](/ko/guides/quickstart/)
- [하이브리드 검색](/ko/ltm/hybrid-search/)
