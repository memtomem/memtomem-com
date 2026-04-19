---
title: 개요
description: memtomem이란 — AI 에이전트를 위한 MCP 네이티브 장기 기억 서버.
---

## memtomem이란?

memtomem은 AI 에이전트의 기억을 영속적으로 보존합니다. 노트·문서·코드를 대상으로 인덱싱해 두면, MCP 호환 에이전트가 세션과 에이전트 경계를 넘어 동일한 기억을 검색할 수 있습니다.

**memtomem**은 Model Context Protocol(MCP)을 사용하는 장기 기억(LTM) 서버입니다. 로컬 프로세스로 실행되며, AI 클라이언트가 연결하여 검색 가능한 기억을 도구 세트(`mem_search`, `mem_add` 등)로 호출하는 방식으로 동작합니다.

## 주요 기능

- **하이브리드 검색** — 키워드 검색(BM25)과 의미 기반 벡터 검색을 병행하고, Reciprocal Rank Fusion(RRF)으로 두 순위를 결합하여 양쪽 결과를 모두 반영합니다.
- **시맨틱 청킹** — 문서의 실제 구조적 경계를 기준으로 분할하는 7종 전략(Markdown, Python, JS/TS, JSON, YAML/TOML, reStructuredText, 일반 텍스트)을 제공합니다.
- **로컬 리랭킹** — 선택 기능인 cross-encoder 리랭킹이 FastEmbed ONNX를 통해 완전히 로컬에서 동작합니다. 외부 API가 필요하지 않으며, `memtomem[onnx]` 이외의 추가 설치도 필요하지 않습니다.
- **증분 인덱싱** — 해시 기반 변경 감지로, 변경된 청크만 재인덱싱합니다.
- **프로바이더 기억 opt-in** — `mm init`에서 Claude Code 기억(`~/.claude/projects/<project>/memory/`), Claude Code 플랜(`~/.claude/plans/`), Codex CLI 기억(`~/.codex/memories/`)을 `memory_dirs`에 등록할지 선택할 수 있습니다. `indexing.auto_discover=false` 설정 시 프롬프트 비활성화.
- **네임스페이스 정책 규칙** — 경로 패턴 기반 규칙으로 인덱싱 시점에 네임스페이스를 자동 할당할 수 있어, 호출마다 `namespace=`를 지정할 필요가 없습니다.
- **수명 주기 정책** — `auto_archive` / `auto_promote` / `auto_expire` / `auto_tag`가 백그라운드 스케줄러로 실행됩니다.
- **기억 가져오기** — `mm ingest claude-memory` / `gemini-memory` / `codex-memory`로 다른 AI 도구의 기억을 일괄 가져올 수 있습니다.
- **네임스페이스 격리** — `agent/{id}` 개인 네임스페이스와 에이전트 간 지식 공유용 `shared` 네임스페이스를 함께 제공합니다.
- **멀티 에이전트 협업** — 에이전트 간 기억 등록, 검색, 공유를 지원합니다.
- **Web UI 대시보드** — `mm web`을 통한 브라우저 기반 검색 및 기억 관리를 제공합니다.
- **데이터베이스 초기화** — `mm reset` / `mem_reset` / `POST /api/reset`으로 전체 상태를 초기화할 수 있습니다.

## 아키텍처

```
AI Agent (Claude Code, Cursor, Gemini CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

memtomem은 로컬 MCP 서버로 실행됩니다. 모든 데이터는 사용자의 머신에 저장되며, 스토리지는 SQLite, 임베딩은 ONNX를 사용합니다. GPU나 외부 서비스가 필요 없습니다.

선택적으로, [memtomem-stm](/ko/stm/overview/)을 프록시로 앞단에 배치하여 실시간 압축과 선제적 기억 서피싱 기능을 추가할 수 있습니다.

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **CLI** | `mm` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 5분 만에 설치하고 첫 기억 저장하기
- [하이브리드 검색](/ko/ltm/hybrid-search/) — 검색 엔진 작동 원리
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 네임스페이스 설계와 공유 워크플로우
- [MCP 도구](/ko/ltm/mcp-tools/) — 전체 도구 레퍼런스 (74개 도구)
- [CLI 레퍼런스](/ko/ltm/cli/) — `mm` 명령어 레퍼런스
