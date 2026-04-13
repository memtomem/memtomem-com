---
title: Quick Start
description: 5분 안에 memtomem을 설치하고 첫 기억을 저장해 보세요.
---

## 1. 설치

로컬 임베딩을 사용하려면 먼저 Ollama 모델을 준비합니다 (~270MB, 무료, GPU 불필요).

```bash
ollama pull nomic-embed-text
```

그리고 memtomem을 설치합니다.

```bash
uv tool install memtomem          # 또는: pipx install memtomem
```

STM 프록시도 함께 사용하려면:

```bash
uv tool install memtomem-stm      # 또는: pip install memtomem-stm
```

> GPU가 없다면? 설정 마법사에서 OpenAI를 선택하세요 — [임베딩 가이드](https://github.com/memtomem/memtomem/blob/main/docs/guides/embeddings.md) 참고.

## 2. 초기 설정

8단계 대화형 마법사로 설정합니다.

```bash
mm init                            # 대화형 설정
mm init -y                         # CI용 자동 설정
```

## 3. MCP 클라이언트 연동

### Claude Code

```bash
claude mcp add memtomem -s user -- memtomem-server
```

STM 프록시 사용 시:

```bash
claude mcp add memtomem-stm -s user -- memtomem-stm
```

### Cursor / Windsurf / Claude Desktop

각 에디터의 MCP 설정에서 `memtomem-server` 또는 `memtomem-stm` 명령을 stdio 서버로 등록합니다. 자세한 내용은 [MCP 클라이언트 설정](https://github.com/memtomem/memtomem/blob/main/docs/guides/mcp-client-setup.md)을 참고하세요.

## 4. 사용

에이전트에서 다음과 같이 기억을 활용합니다:

| 에이전트에게 | 호출되는 MCP 도구 |
|---|---|
| "서버 상태 확인해줘" | `mem_status` |
| "~/notes 폴더 인덱싱해줘" | `mem_index(path="~/notes")` |
| "배포 관련 내용 검색해줘" | `mem_search(query="deployment checklist")` |
| "이 인사이트 기억해둬" | `mem_add(content="...", tags=["ops"])` |

## 패키지 구성

| 패키지 | 설명 |
|--------|------|
| **memtomem** | 코어 — MCP 서버, CLI (`mm`), 웹 UI, 하이브리드 검색, 스토리지 |
| **memtomem-stm** | STM 프록시 — 도구 호출 가로채기를 통한 능동적 기억 서피싱 |

두 패키지는 Python 레벨 의존성이 없습니다. STM과 LTM 사이의 통신은 전적으로 MCP 프로토콜로 이루어지며, 독립적으로 배포·업그레이드할 수 있습니다.
