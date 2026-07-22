---
title: 문서를 MCP로 사용하기
description: memtomem 문서를 AI 에이전트가 직접 읽게 하는 방법 — llms.txt와 로컬 MCP 서버(mcpdoc).
---

AI 도구가 memtomem 문서를 직접 읽게 하는 방법은 두 가지입니다. 별도의 문서 서버를 운영하지 않아도 됩니다.

## llms.txt

사이트를 빌드할 때 함께 만드는 LLM용 문서 목록입니다.

| 파일 | 용도 |
|---|---|
| [`/llms.txt`](https://memtomem.com/llms.txt) | 읽을 수 있는 문서 목록 안내 |
| [`/llms-full.txt`](https://memtomem.com/llms-full.txt) | 전체 문서를 한 파일로 |
| [`/llms-small.txt`](https://memtomem.com/llms-small.txt) | 작은 컨텍스트 창용 축약본 |

Claude·ChatGPT·Cursor 등 대부분의 도구는 이 URL을 직접 가져와 읽을 수 있습니다.

## 로컬 MCP 서버 (mcpdoc)

[`mcpdoc`](https://github.com/langchain-ai/mcpdoc)는 llms.txt를 MCP 도구로 제공하는 오픈소스 서버입니다. **내 컴퓨터에서 실행**되므로 별도 서버가 필요 없습니다. AI 도구는 `list_doc_sources`와 `fetch_docs`로 memtomem 문서를 찾고 읽습니다.

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

AI 도구가 문서 검색 도구를 자동으로 사용하지 않으면 규칙이나 시스템 프롬프트에 다음 문장을 추가하세요.

> memtomem 관련 질문에는 `memtomem-docs` MCP 서버를 사용해. 먼저 `list_doc_sources`를 호출하고 `fetch_docs`로 관련 문서를 읽어.

:::note[도메인 허용 범위]
원격 llms.txt URL을 지정하면 mcpdoc은 해당 도메인(`memtomem.com`)만 자동으로 허용합니다. 로컬 파일을 쓰려면 `--allowed-domains`로 도메인을 명시해야 합니다.
:::

## memtomem으로 직접 기억하기

문서를 내려받아 memtomem으로 색인할 수도 있습니다. 이후에는 하이브리드 검색으로 필요한 내용을 찾을 수 있습니다.

```bash
curl -sL https://memtomem.com/llms-full.txt -o memtomem-docs.md
mm index ./memtomem-docs.md
```

이후 에이전트는 `mem_search`로 문서를 검색합니다. 자세한 내용은 [하이브리드 검색](/ko/ltm/hybrid-search/)을 참고하세요.

## 관련 문서

- [빠른 시작](/ko/guides/quickstart/)
- [하이브리드 검색](/ko/ltm/hybrid-search/)
