---
title: 고정 컨텍스트와 검토 우선 기억
description: 검색 결과 앞에 고정 지침을 붙이고, 제안된 기억은 검토 후 저장합니다.
---

고정 컨텍스트(Pinned Context)는 검색 결과보다 앞에 넣을 짧은 Markdown
사실·지침입니다. 사용자, 프로젝트 로컬, 프로젝트 공유 블록에는 다른
memtomem 쓰기와 같은 민감 정보 검사와 확인 규칙이 적용됩니다.

```bash
mm pinned set response-style \
  --content "실행 가능한 명령과 함께 간결하게 답합니다." --priority 10
mm pinned get response-style --scope user
mm pinned compose "배포 체크리스트"
mm pinned delete response-style --scope user
```

대상 계층은 `--scope user|project_local|project_shared`로 지정합니다.
Git으로 추적하는 공유 계층에 쓰려면 `--confirm-project-shared`가 필요합니다.

블록 하나에는 최대 2,000자를 저장할 수 있습니다. 6,000자는 전체 저장
한도가 아니라 한 번의 `compose`에서 고정 블록에 사용할 수 있는 양입니다.
기본 전체 한도는 12,000자이며 블록 중간을 자르지 않습니다.

`mem_context_compose` schema 4는 검색 결과의 우선순위를 유지하면서 인접한
context-window 청크도 함께 반환합니다. 검색 결과가 있으면 `score_scale`
(`rrf`, `bm25`, `dense`, `none`, `rerank`)을 표시합니다. 재정렬한 결과에는
사용한 리랭커 모델도 포함합니다.

## 검토 우선 제안

`mem_candidate_propose(content, source, source_ref, idempotency_key)`는 민감
정보를 검사한 뒤 검토 대기 후보를 만듭니다. 이 단계에서는 장기 기억에
바로 저장하지 않습니다. 후보는 30일 후 만료됩니다. 같은
`idempotency_key`와 같은 내용을 다시 보내면 기존 후보를 반환하고, 같은
키에 다른 내용을 보내면 거부합니다. 승인한 후보만 장기 기억에 저장합니다.

```bash
mm review list
mm review show CANDIDATE_ID
mm review approve CANDIDATE_ID --reviewer "$USER"
mm review recover --stale-after-minutes 15 --actor "$USER"
```

## LangGraph 어댑터

`MemtomemBaseStore`는 LangGraph의 tuple-namespace JSON Store를 구현합니다.
`MemtomemStore`는 검색·쓰기·세션·작업 기억을 다루는 상위 비동기
어댑터입니다. `config_overrides`는 주변 환경의 기본 설정보다 우선합니다.
그래프마다 DB를 분리하고 테스트 데이터가 사용자 기본 저장소에 들어가지
않게 할 수 있습니다.
