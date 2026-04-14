---
title: 개요
description: memtomem이란 — AI 에이전트를 위한 MCP 네이티브 장기 기억 서버.
---

## memtomem이란?

**memtomem**은 AI 에이전트를 위한 MCP 네이티브 장기 기억(LTM) 서버입니다. 마크다운 노트, 문서, 코드를 검색 가능한 지식 베이스로 인덱싱하여, MCP 호환 에이전트라면 누구나 접근할 수 있습니다.

기억은 세션 간에 영속적으로 유지되며 에이전트 간에 공유할 수 있어, 결정 사항, 패턴, 컨텍스트가 절대 유실되지 않습니다.

## 주요 기능

- **하이브리드 검색** — BM25 키워드 + 밀집 벡터 + RRF 융합으로 높은 정밀도의 검색 결과 제공
- **시맨틱 청킹** — 문서 구조를 이해하는 6가지 전략 (Markdown, Python AST, JS/TS AST, JSON, YAML/TOML, 일반 텍스트)
- **증분 인덱싱** — 해시 기반 변경 감지로 변경된 부분만 재인덱싱
- **네임스페이스 격리** — `agent/{id}` 개인 네임스페이스 + `shared` 네임스페이스로 에이전트 간 지식 공유
- **멀티 에이전트 협업** — 에이전트 간 기억 등록, 검색, 공유
- **Web UI 대시보드** — `mm web`을 통한 브라우저 기반 검색 및 기억 관리

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
