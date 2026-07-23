---
title: 멀티 에이전트 협업
description: 네임스페이스, 세션, 명시적 공유로 검토한 기억을 에이전트 사이에 전달합니다.
---

memtomem은 각 에이전트가 쓰는 기억을 이름 있는 네임스페이스로 보내고, 선택한 기억만 `shared`에 복사할 수 있습니다. 여러 AI 클라이언트나 에이전트 역할이 같은 로컬 저장소를 사용하되 모든 중간 결과를 한 공간에 공개하고 싶지 않을 때 유용합니다.

## 네임스페이스 구조

```text
agent-runtime:{agent-id}     # 에이전트별 라우팅 범위
shared                       # 에이전트 간 공유 범위
```

네임스페이스는 검색 결과와 쓰기 대상을 정리하는 기능입니다. **인증이나 접근 제어 경계가 아닙니다.** 같은 데이터베이스를 열 수 있는 프로세스는 신뢰하는 로컬 참여자로 다뤄야 합니다.

## 기본 Core 모드 워크플로

기본 MCP 화면에는 Core 도구 9개가 보입니다. 멀티에이전트 작업은 `mem_do`를 통해 실행하며, 이 모드에서는 개별 `mem_agent_*` 도구가 보이지 않습니다.

### 1단계: 사용할 수 있는 작업 확인

```text
mem_do(action="help", params={"category": "multi_agent"})
```

상태를 바꾸기 전에 현재 릴리스가 지원하는 작업 이름과 매개변수를 확인합니다.

### 2단계: 에이전트 세션 시작

```text
mem_do(action="session_start", params={"agent_id": "analyzer"})
```

세션 네임스페이스는 `agent-runtime:analyzer`가 됩니다. 세션이 연결된 동안 `mem_add`와 `mem_batch_add` 쓰기는 이 범위를 물려받습니다. 연결되지 않은 일반 세션은 쓰기 대상을 자동으로 바꾸지 않습니다.

### 3단계: 에이전트 기억 저장·검색

```text
mem_add(content="인증 모듈은 수명이 짧은 access token을 사용한다.")
mem_do(
  action="agent_search",
  params={"query": "인증 모듈 token", "include_shared": true}
)
```

`include_shared=true`는 에이전트 전용 범위와 `shared`를 함께 검색합니다. 일반 `mem_search`의 동작은 바뀌지 않으며 에이전트 범위로 자동 전환되지 않습니다.

### 4단계: 검토한 기억 공유

추가 또는 검색 결과에서 받은 청크 ID를 사용합니다.

```text
mem_do(
  action="agent_share",
  params={"chunk_id": "CHUNK_ID", "target": "shared"}
)
```

더 넓은 범위로 복사하기 전에 비밀값 형태의 내용을 다시 검사합니다. 차단된 기억은 공유하지 않으며 차단 사실을 기록합니다.

### 5단계: 세션 종료

```text
mem_do(action="session_end", params={"summary": "인증 분석 완료"})
```

에이전트 A가 자기 범위에서 기억을 찾고, 기본 상태에서는 다른 에이전트에 보이지 않으며, `shared`로 명시적으로 공유한 뒤에만 에이전트 B가 찾을 수 있으면 성공입니다.

## 도구 모드에 따른 차이

| `MEMTOMEM_TOOL_MODE` | 세션 작업 | 에이전트 검색·공유 |
|---|---|---|
| `core`(기본) | `mem_do(action="session_start" | "session_end")` | `mem_do(action="agent_search" | "agent_share")` |
| `standard` | 개별 `mem_session_start` / `mem_session_end` | `mem_do(action="agent_search" | "agent_share")` |
| `full` | 개별 세션 도구 | 개별 `mem_agent_search` / `mem_agent_share` |

클라이언트가 더 큰 도구 목록을 꼭 필요로 하지 않는다면 `core`를 유지하세요. dispatcher는 모델에 99개 개별 도구를 모두 보여 주지 않으면서 현재 릴리스의 전체 작업을 제공합니다.

## `agent_id` 설정

MCP 서버는 호출한 클라이언트에서 `agent_id`를 자동으로 알아내지 않습니다. 세션을 시작할 때 직접 전달하면 이후 세션 인식 호출이 같은 값을 사용합니다.

### Claude Code · Codex

`CLAUDE.md`, `AGENTS.md`, 시스템 지침에 다음과 같은 규칙을 둡니다.

> 에이전트별 기억 분리를 요청받았을 때 먼저 `mem_do(action="help", params={"category":"multi_agent"})`를 호출하고, `mem_do(action="session_start", ...)`로 지정한 세션을 시작한다. 검토한 결과만 공유한다.

일반 검색마다 에이전트 세션을 만들 필요는 없습니다. 에이전트별 라우팅이나 명시적 공유가 필요한 작업에서만 이 흐름을 사용하세요.

### LangGraph · CrewAI

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
await store.start_agent_session(agent_id="analyzer")
# 이후 store.search / store.add는 analyzer 세션 범위를 사용합니다.
```

그래프 노드마다 다른 `agent_id`로 세션을 시작할 수 있습니다. 다른 노드가 실제로 필요로 하는 결과만 공유하세요.

### CLI 세션

```bash
mm session start --agent-id planner
mm session list
mm session end --summary "계획 완료"
```

`start`, `end`, `list`, `events`, `wrap` 전체 옵션은 [`mm session`](/ko/ltm/cli/#mm-session)을 참고하세요.

### CLI 에이전트 관리

```bash
mm agent register analyzer --description "코드 분석 에이전트" --color "#534AB7"
mm agent list
mm agent share CHUNK_ID --target shared
```

`mm agent share`도 비밀값 검사를 실행합니다. [CLI 레퍼런스](/ko/ltm/cli/)에는 등록, 조회, 마이그레이션, 공유 전체 옵션을 유지합니다.

## 내장 기억 가져오기와 차이

`mm ingest claude-memory`, `mm ingest codex-memory`, `mm ingest gemini-memory`는 외부 파일을 자료별 고정 네임스페이스에 넣습니다. `agent_id`를 지정하거나 세션을 시작하지 않습니다. 자세한 절차는 [기존 자료 색인·가져오기](/ko/guides/index-and-import/)를 참고하세요.

## 상호작용 패턴

<a id="human--agent"></a>
### 사람 → AI 도구

MCP로 연결한 클라이언트에 검증된 결정을 검색하거나 결과를 명시적으로 저장하도록 요청합니다. 자동 제시는 STM 프록시 경로나 지원되는 호스트 hook이 필요합니다.

<a id="agent--agent"></a>
### AI 도구 → AI 도구

에이전트 A는 자기 범위에서 작업하고, 유용한 결과를 검토한 뒤 해당 청크만 `shared`에 공유합니다. 에이전트 B는 자기 범위와 `shared`를 함께 검색합니다. 중간 추론은 명시적으로 공유하지 않는 한 전파되지 않습니다.

<a id="agent--human"></a>
### AI 도구 → 사람

Web UI나 CLI 검색에서 공유한 결정, 출처, 네임스페이스를 확인합니다. 모델의 요약만 믿지 말고 원본 출처를 검증 기준으로 사용하세요.

## 다음 단계

- [세션을 넘나드는 기억](/ko/guides/memory-persistence/)
- [기존 자료 색인·가져오기](/ko/guides/index-and-import/)
- [Context Gateway](/ko/ltm/context-gateway/)
- [LTM MCP 도구](/ko/ltm/mcp-tools/)
