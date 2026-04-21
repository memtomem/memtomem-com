---
title: Quick Start
description: 5분 안에 memtomem을 설치하고 첫 기억을 저장해 보세요.
---

5분 안에 memtomem 설치, MCP 클라이언트 연동, 그리고 노트·코드에 대한 질의 응답까지 완료합니다. GPU, 외부 계정, 별도 데이터베이스 설정이 모두 필요 없습니다.

## 1. 설치

```bash
uv tool install memtomem          # 또는: pipx install memtomem
```

STM 프록시도 함께 사용하려면:

```bash
uv tool install memtomem-stm      # 또는: pip install memtomem-stm
```

> memtomem은 설치 직후 키워드 검색(BM25)만으로 동작합니다. 시맨틱 검색을 사용하려면 설정 마법사에서 임베딩 프로바이더를 선택합니다 — ONNX(내장, 로컬), Ollama(로컬), 또는 OpenAI. [임베딩 가이드](https://github.com/memtomem/memtomem/blob/main/docs/guides/embeddings.md)를 참고하세요.

## 2. 초기 설정

대화형 설정 마법사를 실행합니다. 임베딩 프로바이더(ONNX / Ollama / OpenAI), 데이터베이스 저장 위치, 기본 네임스페이스를 질의합니다. `-y` 플래그로 모든 기본값을 일괄 수락할 수 있습니다.

```bash
mm init                            # 대화형 설정
mm init -y                         # 기본값 자동 수락 (CI 용)
```

`mm init` 단계에서 AI 에이전트 기억 디렉터리 인덱싱 여부를 선택할 수 있습니다 — Claude Code 기억(`~/.claude/projects/<project>/memory/`), Claude Code 플랜(`~/.claude/plans/`), Codex CLI 기억(`~/.codex/memories/`)이 대상입니다.

STM 프록시도 설치한 경우 초기 설정을 수행합니다:

```bash
mms init --mcp claude              # STM 마법사 + Claude Code 자동 등록
mms health                         # 등록된 업스트림 서버 연결 상태 점검
```

Cursor/Windsurf 같은 에디터에는 `--mcp json`으로 `.mcp.json`을 생성하거나, 직접 등록하려면 `--mcp skip`을 사용합니다. 등록은 언제든 `mms register`로 다시 실행할 수 있습니다.

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

각 에디터의 MCP 설정에서 `memtomem-server` 또는 `memtomem-stm`을 stdio 서버로 등록합니다. 자세한 내용은 [MCP 클라이언트 설정](https://github.com/memtomem/memtomem/blob/main/docs/guides/mcp-client-setup.md)을 참고하세요.

## 4. 사용

도구를 직접 호출할 필요는 없습니다. 에이전트에 자연어로 지시하면 적절한 도구가 자동으로 선택됩니다.

| 에이전트에 지시 | 호출되는 MCP 도구 | 반환되는 정보 |
|---|---|---|
| "서버 상태 확인" | `mem_status` | 연결 정보, 네임스페이스 목록, 전체 기억 수 |
| "~/notes 폴더 인덱싱" | `mem_index(path="~/notes")` | 인덱싱된 파일 수, 생성된 청크 수 |
| "배포 관련 내용 검색" | `mem_search(query="deployment checklist")` | 순위가 매겨진 기억 목록과 발췌문 |
| "이 인사이트 기록" | `mem_add(content="...", tags=["ops"])` | 신규 기억의 네임스페이스 및 ID 확인 |

## 다음 단계

- [설치](/ko/guides/installation/) — 선택 확장, 임베딩 프로바이더, 전체 CLI
- [LTM 개요](/ko/ltm/overview/) — LTM 서버의 역할과 검색 동작 방식
- [STM 개요](/ko/stm/overview/) — 선택 사항인 STM 프록시를 추가할 시점
- [하이브리드 검색](/ko/ltm/hybrid-search/) — BM25 + 벡터 + RRF 융합 검색의 원리

## 패키지 구성

| 패키지 | 설명 |
|--------|------|
| **memtomem** | 코어 — MCP 서버, CLI (`mm`), Web UI, 하이브리드 검색, 스토리지 |
| **memtomem-stm** | STM 프록시 — 투명 MCP 프록시 기반 능동적 기억 서피싱 |

두 패키지는 Python 레벨 의존성이 없습니다. STM과 LTM 간 통신은 MCP 프로토콜로 이루어지며, 독립적으로 배포·업그레이드할 수 있습니다.
