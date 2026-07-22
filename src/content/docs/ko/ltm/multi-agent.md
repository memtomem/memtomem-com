---
title: 멀티 에이전트 협업
description: 네임스페이스 기반 격리와 공유로 에이전트 간 지식을 교환하는 방법.
---

memtomem은 **네임스페이스**로 AI 도구마다 기억을 나누고 필요한 내용만 공유합니다. 네임스페이스는 기억을 구분해 담는 이름 있는 공간입니다. 각 AI 도구의 작업 내용은 따로 보관하고, 함께 써야 할 내용은 `shared` 공간에 복사할 수 있습니다.

## 네임스페이스 구조

```
agent-runtime:{agent-id}     # 에이전트 전용 — 해당 에이전트만 접근
shared                       # 공유 — 모든 에이전트에서 접근 가능
```

각 에이전트는 자신의 전용 네임스페이스에서 작업하되, 다른 에이전트에게 유용한 지식은 공유 네임스페이스로 내보낼 수 있습니다.

## 5단계 워크플로우

여러 AI 도구가 하나의 저장소를 함께 사용하는 기본 흐름입니다. AI 도구를 등록하고 세션을 시작한 뒤 자기 공간과 공유 공간을 검색합니다. 함께 쓸 기억은 `shared`로 복사하고, 작업이 끝나면 세션을 닫습니다.

### 1단계: 에이전트 등록

```
mem_agent_register(agent_id="analyzer", description="코드 분석 에이전트")
```

### 2단계: 세션 시작

```
mem_session_start(agent_id="analyzer")
```

세션의 네임스페이스는 `agent-runtime:analyzer`로 자동 설정됩니다. 세션에 AI 도구를 명시적으로 연결하면 이후 쓰기에서 `agent_id`를 다시 전달하지 않아도 같은 범위를 사용합니다. AI 도구를 연결하지 않은 기본 세션은 전용 네임스페이스를 자동으로 사용하지 않습니다.

- **쓰기** — `mem_add(content="...")`와 `mem_batch_add(...)`는 `agent-runtime:analyzer`에 자동으로 기록됩니다. 공유 공간처럼 다른 범위에 쓰려면 해당 호출에 `namespace="shared"`를 지정하세요.
- **읽기** — `mem_agent_search`와 `mem_agent_share`는 `agent_id=`가 없어도 세션에 연결된 AI 도구의 범위를 사용합니다. 일반 `mem_search`의 동작은 바뀌지 않습니다. AI 도구 전용 공간을 검색하려면 `mem_agent_search`를 사용하세요.

### 3단계: 지식 검색

```
mem_agent_search(query="인증 모듈 구조", include_shared=true)
```

`include_shared=true`로 자신의 네임스페이스 + 공유 네임스페이스를 동시에 검색합니다.

### 4단계: 지식 공유

```
mem_agent_share(chunk_id="...", target="shared")
```

기억을 더 넓은 공간으로 복사하기 전에 민감 정보를 다시 검사합니다. 비밀값으로 보이는 내용은 공유하지 않으며 차단 횟수를 감사 기록에 남깁니다.

### 5단계: 세션 종료

```
mem_session_end(summary="...")
```

## `agent_id` 설정하기

`agent_id`는 자동으로 감지되지 않습니다. **세션을 시작할 때 직접 지정**해야 합니다. 이후 호출은 세션에 저장된 값을 사용합니다.

### Claude Code · Codex (MCP)

MCP 서버는 호출 클라이언트를 구분하지 않으므로, **에이전트 지침(CLAUDE.md · AGENTS.md · 시스템 프롬프트)에 세션 시작 규칙을 고정**해 두어야 합니다.

예시 지침:

> 대화 시작 시 `mem_session_start(agent_id="claude-code")`를 먼저 호출하여 세션을 등록하세요. 새 에이전트 역할로 작업할 때는 `mem_agent_register(agent_id="planner", description="...")`를 사용합니다.

세션을 AI 도구에 연결하면 이후 `mem_add`와 `mem_batch_add`는 `agent-runtime:{agent-id}`에 기록됩니다. 읽기 범위는 자동으로 바뀌지 않습니다. 전용 공간을 검색할 때는 `mem_agent_search`를 사용하고, 일반 `mem_search`에는 네임스페이스를 직접 지정하세요.

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

`mm session`의 전체 하위 명령(`start`, `end`, `list`, `events`, `wrap`)은 [CLI 레퍼런스의 `mm session` 섹션](/ko/ltm/cli/#mm-session)을 참고하세요.

### CLI (`mm agent`)

MCP 클라이언트 없이 셸에서 에이전트를 등록·조회하거나 청크를 공유할 때 사용합니다. 각 명령은 위의 `mem_agent_register`·`mem_agent_share` MCP 도구를 그대로 반영합니다.

```bash
mm agent register analyzer --description "코드 분석 에이전트" --color "#534AB7"
mm agent list                 # 등록된 agent-runtime: 네임스페이스 + shared 조회 (--json 지원)
mm agent share <chunk_id> --target shared
```

`mm agent share`도 복사 전에 민감 정보를 다시 검사합니다. 비밀값으로 보이는 내용은 `--force-unsafe`로 다시 확인하지 않는 한 공유하지 않습니다. 전체 플래그는 [CLI 레퍼런스](/ko/ltm/cli/)를 참고하세요.

### `mm ingest`와의 차이

`mm ingest claude-memory`·`mm ingest gemini-memory`·`mm ingest codex-memory`는 `agent_id`를 할당하는 명령이 **아닙니다**. 각각 `claude-memory:<slug>`·`gemini-memory:<slug>`·`codex-memory:<slug>` 고정 네임스페이스에 적재하여 AI 에디터별 기억을 통합 인덱싱합니다. 에이전트별 격리가 목적이라면 위의 MCP/어댑터/CLI 경로로 `agent_id`를 명시해야 합니다.

## 상호작용 패턴

<a id="human--agent"></a>
### 사람 → AI 도구

MCP로 연결된 클라이언트에서는 저장해 둔 설계 결정, 코딩 방식, 디버깅 이력을 직접 검색할 수 있습니다. 자동 서피싱을 사용하려면 STM 프록시를 거치거나 지원되는 클라이언트 훅을 설정해야 합니다.

<a id="agent--agent"></a>
### AI 도구 → AI 도구

LangGraph나 CrewAI에서 여러 AI 도구를 연결할 수 있습니다. 예를 들어 코드 분석 도구가 `mem_agent_share`로 코드 구조를 공유하면 테스트 생성 도구가 그 내용을 검색합니다. 중간 결과와 결정 사항은 공유 LTM 저장소를 통해 명시적으로 전달합니다.

<a id="agent--human"></a>
### AI 도구 → 사람

AI 도구가 저장한 프로젝트 지식은 Web UI에서 검색하고 읽을 수 있습니다. 새 팀원은 설계 결정, 버그 해결 방법, 코딩 규칙을 한곳에서 확인할 수 있습니다.

## 관련 — AI 도구 기억 수집

`mm ingest {claude,gemini,codex}-memory`는 에이전트별 격리와 별개의 기능입니다. 각 AI 도구의 기억 디렉터리를 고정 네임스페이스(`*-memory:<slug>`)에 모아 색인합니다. 자세한 차이는 [위의 `mm ingest`와의 차이](#mm-ingest와의-차이)를, 소스 경로와 슬러그 등 전체 옵션은 [설치 가이드](/ko/guides/installation/)를 참고하세요.
