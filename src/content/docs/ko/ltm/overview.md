---
title: 개요
description: memtomem이란 — AI 에이전트를 위한 MCP 네이티브 장기 기억 서버.
---

## memtomem이란?

memtomem은 AI 에이전트에 **세션과 에이전트 경계를 넘어 유지되는 기억**을 제공합니다. 로컬에서 동작하는 MCP 서버로, 에이전트는 기존 도구 호출 방식 그대로 과거 정보를 검색·저장할 수 있습니다.

## 이럴 때 씁니다

- **어제의 결정을 오늘 세션에서 다시 설명해야 할 때** — 세션 종료 시 컨텍스트가 사라지는 문제를 해결합니다. [세션을 넘나드는 기억](/ko/guides/memory-persistence/) 튜토리얼에서 실제 흐름을 확인할 수 있습니다.
- **노트·문서·코드를 에이전트가 검색 가능한 지식으로 만들고 싶을 때** — `mm index ~/notes`로 폴더를 지정하면 이후 모든 MCP 에이전트가 해당 내용을 질의할 수 있습니다.
- **여러 에이전트가 같은 지식을 공유해야 할 때** — Claude Code, Cursor, Codex CLI 등 MCP 지원 클라이언트가 동일한 기억 저장소를 공유합니다.

## 3단계로 시작하기

```bash
uv tool install 'memtomem[all]'                       # 1. 설치
mm init                                               # 2. 초기 설정 (대화형)
claude mcp add memtomem -s user -- memtomem-server    # 3. 에이전트 연결
```

전체 절차와 다른 클라이언트 연결 방법은 [빠른 시작](/ko/guides/quickstart/)에서 확인할 수 있습니다.

## 핵심 개념

- **하이브리드 검색** — BM25 키워드 검색과 벡터 검색을 RRF로 결합하여 정확한 식별자 질의와 의미 기반 질의를 모두 처리합니다. 자세한 내용은 [하이브리드 검색](/ko/ltm/hybrid-search/) 참조.
- **네임스페이스** — `agent-runtime:{id}` 개인 영역과 `shared` 공용 영역으로 에이전트 간 격리·공유를 제어합니다. [멀티 에이전트 협업](/ko/ltm/multi-agent/) 참조.
- **수명 주기 정책** — `auto_archive` / `auto_expire` / `auto_promote` / `auto_tag`가 백그라운드 스케줄러로 실행되어 기억의 보관·만료·승격을 자동 관리합니다.

## 아키텍처

```
AI Agent (Claude Code, Cursor, Gemini CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

로컬 MCP 서버로 실행되며, 모든 데이터는 사용자의 머신에 저장됩니다. 스토리지는 SQLite, 임베딩은 ONNX. GPU·외부 서비스·계정 없이 동작합니다.

## STM과의 관계

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 |
| **동작 방식** | 에이전트가 필요 시 `mem_search` 호출 | 모든 도구 응답에 관련 기억 자동 주입 |

기본 구성은 LTM 단독입니다. 토큰 최적화와 능동적 기억 주입이 필요한 경우 [memtomem-stm](/ko/stm/overview/)을 프록시로 앞단에 배치할 수 있습니다.

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **CLI** | `mm` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 5분 만에 설치하고 첫 기억 저장하기
- [세션을 넘나드는 기억](/ko/guides/memory-persistence/) — 세션 A에서 저장 → 세션 B에서 불러오기
- [하이브리드 검색](/ko/ltm/hybrid-search/) — 검색 엔진 작동 원리
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 네임스페이스 설계와 공유 워크플로우
- [Context Gateway](/ko/ltm/context-gateway/) — 에이전트·스킬·커맨드를 한 번 정의, 모든 런타임에 동기화
- [MCP 도구](/ko/ltm/mcp-tools/) — 전체 도구 레퍼런스
- [CLI 레퍼런스](/ko/ltm/cli/) — `mm` 명령어 레퍼런스
