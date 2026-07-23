---
title: 개요
description: 세션이나 AI 도구가 바뀌어도 기억을 저장하고 검색할 수 있는 로컬 MCP 서버.
---

## memtomem이란?

memtomem은 **세션이나 AI 도구가 바뀌어도 남는 기억**을 제공합니다. 내 컴퓨터에서 실행되는 MCP 서버이며, AI 도구는 다른 도구를 호출하는 것과 같은 방식으로 이전 정보를 저장하고 검색합니다. MCP는 AI 도구를 외부 도구·데이터와 연결하는 표준 규격입니다.

## 이럴 때 씁니다

- **어제 정한 내용을 새 세션에서 다시 설명해야 할 때** — 세션이 끝나도 중요한 내용을 저장해 두고 다시 찾을 수 있습니다. [세션을 넘나드는 기억](/ko/guides/memory-persistence/)에서 직접 확인해 보세요.
- **노트·문서를 AI 도구가 검색하게 만들고 싶을 때** — Markdown이나 구조화 파일이 있는 폴더를 `mm index ~/notes`로 색인하면 MCP를 지원하는 AI 도구에서 검색할 수 있습니다.
- **여러 AI 도구가 같은 지식을 공유해야 할 때** — Claude Code, Cursor, Codex CLI 등이 하나의 기억 저장소를 함께 사용할 수 있습니다.

## 저장·검색으로 먼저 확인

```bash
uv tool install 'memtomem[all]'
mm init --preset minimal --non-interactive --mcp skip
mm status
mm add "전환 전에 릴리스 smoke test를 실행한다" --tags release,decision
mm search "릴리스 smoke test"
```

클라이언트를 연결하기 전에 저장과 검색이 동작하는지 확인하는 흐름입니다. [빠른 시작](/ko/guides/quickstart/)을 완료한 뒤 [AI 클라이언트 연결](/ko/guides/connect-ai-client/)로 이어가세요.

## 핵심 개념

- **하이브리드 검색** — BM25 키워드 검색과 벡터 검색을 RRF로 결합합니다. 정확한 이름과 의미가 비슷한 표현을 모두 찾을 수 있습니다. 자세한 내용은 [하이브리드 검색](/ko/ltm/hybrid-search/)을 참고하세요.
- **네임스페이스** — 기억의 검색·쓰기 대상을 나누는 범위입니다. AI 도구별 라우팅 범위(`agent-runtime:{id}`)와 공용 범위(`shared`)를 사용하며 접근 제어 경계는 아닙니다. 자세한 내용은 [멀티 에이전트 협업](/ko/ltm/multi-agent/)을 참고하세요.
- **수명 주기 정책** — 오래된 기억을 자동으로 보관·만료·승격·태깅합니다. 백그라운드에서 주기적으로 실행되는 정책(`auto_archive` / `auto_expire` / `auto_promote` / `auto_tag`)이 이를 처리합니다.

## 아키텍처

AI 도구와는 MCP로 연결하고, 기억은 로컬 SQLite에 저장합니다.

```
AI Agent (Claude Code, Cursor, Antigravity CLI, …)
    ↕  MCP protocol
memtomem server
    ↕
SQLite (FTS5 + sqlite-vec)
```

SQLite 저장과 ONNX 임베딩은 내 컴퓨터에서 처리하므로 GPU나 계정이 필요하지 않습니다. 원격 임베딩·리랭커·LLM·관측 서비스를 선택하면 사용자가 설정한 주소로 데이터를 보낼 수 있습니다.

## STM과의 관계

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 |
| **동작 방식** | AI 도구가 필요할 때 `mem_search` 호출 | STM 프록시나 지원 훅을 거친 응답에 관련 기억 추가 |

먼저 LTM만으로 시작할 수 있습니다. 토큰을 줄이거나 관련 기억을 자동으로 붙이고 싶다면 [memtomem-stm](/ko/stm/overview/)을 프록시로 추가하세요.

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem`](https://pypi.org/project/memtomem/) |
| **최신 릴리스** | `0.3.12` |
| **CLI** | `mm` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem](https://github.com/memtomem/memtomem) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 10분 안에 설치하고 첫 기억 저장·검색 확인
- [세션을 넘나드는 기억](/ko/guides/memory-persistence/) — 세션 A에서 저장 → 세션 B에서 불러오기
- [하이브리드 검색](/ko/ltm/hybrid-search/) — 검색 엔진 작동 원리
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 네임스페이스 설계와 공유 워크플로우
- [Context Gateway](/ko/ltm/context-gateway/) — 에이전트·스킬·명령의 기준본을 프로젝트와 실행 환경 사이에서 관리
- [MCP 도구](/ko/ltm/mcp-tools/) — 전체 도구 레퍼런스
- [CLI 레퍼런스](/ko/ltm/cli/) — `mm` 명령 전체 목록
