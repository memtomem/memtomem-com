---
title: 멀티 에이전트 협업
description: 네임스페이스 기반 격리와 공유로 에이전트 간 지식을 교환하는 방법.
---

memtomem은 에이전트 간 지식 공유를 네임스페이스 기반으로 지원합니다. 특정 에이전트에 종속되지 않는 범용 기억 계층으로, Human→Agent, Agent→Agent, Agent→Human 전방향 지식 흐름을 구현합니다.

## 네임스페이스 구조

```
agent-runtime:{agent-id}     # 에이전트 전용 — 해당 에이전트만 접근
shared                       # 공유 — 모든 에이전트에서 접근 가능
```

각 에이전트는 자신의 전용 네임스페이스에서 작업하되, 다른 에이전트에게 유용한 지식은 공유 네임스페이스로 내보낼 수 있습니다.

## 5단계 워크플로우

### 1단계: 에이전트 등록

```
mem_agent_register(agent_id="analyzer", description="코드 분석 에이전트")
```

### 2단계: 세션 시작

```
mem_session_start(agent_id="analyzer")
```

세션 레코드의 네임스페이스는 `agent-runtime:analyzer`로 자동 파생됩니다. 같은 세션 안에서 호출되는 다음 명령들은 `agent_id`를 다시 전달하지 않아도 에이전트 스코프를 자동 상속합니다:

- **쓰기** — `mem_add(content="...")` / `mem_batch_add(...)`는 `agent-runtime:analyzer`로 자동 기록됩니다. 다른 스코프(예: 공유)로 보내려면 한 번의 호출에 `namespace="shared"`를 명시하세요.
- **읽기** — `mem_agent_search` / `mem_agent_share`는 `agent_id=` 없이도 에이전트 스코프로 결정됩니다. (단일 에이전트 환경의 `mem_search`는 변경되지 않으므로, 에이전트 스코프 안에서 검색하려면 `mem_agent_search`를 사용하세요.)

### 3단계: 지식 검색

```
mem_agent_search(query="인증 모듈 구조", include_shared=true)
```

`include_shared=true`로 자신의 네임스페이스 + 공유 네임스페이스를 동시에 검색합니다.

### 4단계: 지식 공유

```
mem_agent_share(chunk_id="...", target="shared")
```

공유는 더 넓은 네임스페이스로 복사본을 기록하기 전에 trust-boundary redaction guard로 콘텐츠를 다시 스캔합니다. 비밀처럼 보이는 콘텐츠는 공유 시점에 차단되며(차단 결과는 audit 카운터에 기록됨), 따라서 민감한 청크가 더 넓은 네임스페이스로 조용히 전파되지 않습니다.

### 5단계: 세션 종료

```
mem_session_end(summary="...")
```

## `agent_id` 설정하기

`agent_id`는 자동으로 감지되지 않습니다. 런타임이 달라도 원칙은 동일합니다 — **세션 시작 시점에 명시적으로 전달**하고, 이후 호출에는 세션 컨텍스트로 자동 상속됩니다.

### Claude Code · Codex (MCP)

MCP 서버는 호출 클라이언트를 구분하지 않으므로, **에이전트 지침(CLAUDE.md · AGENTS.md · 시스템 프롬프트)에 세션 시작 규칙을 고정**해 두어야 합니다.

예시 지침:

> 대화 시작 시 `mem_session_start(agent_id="claude-code")`를 먼저 호출하여 세션을 등록하세요. 새 에이전트 역할로 작업할 때는 `mem_agent_register(agent_id="planner", description="...")`를 사용합니다.

한 번 등록하면 이후의 `mem_search`, `mem_add` 등은 `agent_id`를 재전달하지 않아도 해당 에이전트 네임스페이스(`agent-runtime:{agent-id}`)에 기록됩니다.

### LangGraph · CrewAI (Python 어댑터)

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
await store.start_agent_session(agent_id="analyzer")
# 이후 store.search / store.add 호출은 analyzer 네임스페이스로 격리
```

멀티 에이전트 그래프에서는 각 노드가 자신의 `agent_id`로 별도 세션을 시작합니다. 공유가 필요한 산출물은 `mem_agent_share`로 `shared` 네임스페이스에 내보냅니다.

### CLI (`mm session`)

서버 프로세스 밖에서 세션을 선등록할 때 사용합니다.

```bash
mm session start --agent-id planner
```

`mm session`의 전체 서브명령(`start`, `end`, `list`, `events`, `wrap`)은 [CLI 레퍼런스의 `mm session` 섹션](/ko/ltm/cli/#mm-session)을 참조하세요.

### CLI (`mm agent`)

MCP 클라이언트 없이 셸에서 에이전트를 등록·조회하거나 청크를 공유할 때 사용합니다. 각 명령은 위의 `mem_agent_register`·`mem_agent_share` MCP 도구를 그대로 반영합니다.

```bash
mm agent register analyzer --description "코드 분석 에이전트" --color "#534AB7"
mm agent list                 # 등록된 agent-runtime: 네임스페이스 + shared 조회 (--json 지원)
mm agent share <chunk_id> --target shared
```

`mm agent share`도 복사 전에 redaction guard를 다시 실행하며, 비밀처럼 보이는 콘텐츠는 `--force-unsafe`로 재확인하지 않는 한 차단됩니다. 전체 플래그는 [CLI 레퍼런스](/ko/ltm/cli/)를 참조하세요.

### `mm ingest`와의 차이

`mm ingest claude-memory`·`mm ingest gemini-memory`·`mm ingest codex-memory`는 `agent_id`를 할당하는 명령이 **아닙니다**. 각각 `claude-memory:<slug>`·`gemini-memory:<slug>`·`codex-memory:<slug>` 고정 네임스페이스에 적재하여 AI 에디터별 기억을 통합 인덱싱합니다. 에이전트별 격리가 목적이라면 위의 MCP/어댑터/CLI 경로로 `agent_id`를 명시해야 합니다.

## 상호작용 패턴

### Human → Agent

개발자가 Claude Code, Cursor에서 작업할 때, 이전 세션의 아키텍처 결정·코딩 패턴·디버깅 이력이 자동으로 서피싱됩니다.

### Agent → Agent

LangGraph/CrewAI 워크플로우에서 에이전트 체인이 동작할 때, "테스트 생성 에이전트"는 "코드 분석 에이전트"가 `mem_agent_share`로 공유 네임스페이스에 게시한 코드베이스 구조를 참조합니다. 공유 LTM 저장소가 에이전트 간 핸드오프 지점이 되며, 게시할 중간 산출물과 결정 이력은 명시적 공유 단계로 전달합니다.

### Agent → Human

에이전트가 축적한 프로젝트 지식을 웹 UI 대시보드에서 검색·열람할 수 있습니다. 새 팀원 온보딩 시 에이전트가 학습한 아키텍처 결정 이력, 버그 해결 패턴, 코딩 컨벤션을 한눈에 파악할 수 있습니다.

## 관련 — AI 도구 기억 수집

`mm ingest {claude,gemini,codex}-memory`는 에이전트별 격리와는 별개의 기능으로, 각 AI 에디터의 기억 디렉토리를 고정 네임스페이스(`*-memory:<slug>`)로 통합 인덱싱합니다([위의 `mm ingest`와의 차이](#mm-ingest와의-차이) 참조). 소스 경로·슬러그 동작 등 전체 옵션은 [설치 가이드](/ko/guides/installation/)를 참조하세요.
