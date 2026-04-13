---
title: 멀티 에이전트 협업
description: 네임스페이스 기반 격리와 공유로 에이전트 간 지식을 교환하는 방법.
---

memtomem은 에이전트 간 지식 공유를 네임스페이스 기반으로 지원합니다. 특정 에이전트에 종속되지 않는 범용 기억 계층으로, Human→Agent, Agent→Agent, Agent→Human 전방향 지식 흐름을 구현합니다.

## 네임스페이스 구조

```
agent/{agent-id}     # 에이전트 전용 — 해당 에이전트만 접근
shared               # 공유 — 모든 에이전트에서 접근 가능
```

각 에이전트는 자신의 전용 네임스페이스에서 작업하되, 다른 에이전트에게 유용한 지식은 공유 네임스페이스로 내보낼 수 있습니다.

## 3단계 워크플로우

### 1단계: 에이전트 등록

```
mem_agent_register(agent_id="analyzer", description="코드 분석 에이전트")
```

### 2단계: 지식 검색

```
mem_agent_search(query="인증 모듈 구조", include_shared=true)
```

`include_shared=true`로 자신의 네임스페이스 + 공유 네임스페이스를 동시에 검색합니다.

### 3단계: 지식 공유

```
mem_agent_share(memory_id="...", target="shared")
```

## 상호작용 패턴

### Human → Agent

개발자가 Claude Code, Cursor에서 작업할 때, 이전 세션의 아키텍처 결정·코딩 패턴·디버깅 이력이 자동으로 서피싱됩니다.

### Agent → Agent

LangGraph/CrewAI 워크플로우에서 에이전트 체인이 동작할 때, "코드 분석 에이전트"가 발견한 코드베이스 구조를 "테스트 생성 에이전트"가 참조합니다. 공유 LTM 저장소를 통해 중간 산출물과 결정 이력이 자동으로 전달됩니다.

### Agent → Human

에이전트가 축적한 프로젝트 지식을 웹 UI 대시보드에서 검색·열람할 수 있습니다. 새 팀원 온보딩 시 에이전트가 학습한 아키텍처 결정 이력, 버그 해결 패턴, 코딩 컨벤션을 한눈에 파악할 수 있습니다.

## AI 도구 기억 수집

각 AI 에디터의 기억 디렉토리를 자동 탐색하여 통합 인덱싱합니다:

```bash
mm ingest claude-memory     # ~/.claude/projects
mm ingest gemini-memory     # ~/.gemini
mm ingest codex-memory      # ~/.codex/memories
```

분산된 에이전트 기억을 하나의 검색 가능한 지식 베이스로 통합합니다.

## LangGraph 어댑터

`MemtomemStore` 클래스로 LangGraph/CrewAI에서 직접 기억을 검색·저장합니다:

```python
from memtomem.integrations.langgraph import MemtomemStore

store = MemtomemStore()
# LangGraph 워크플로우에서 기억 검색/저장/세션 관리
```
