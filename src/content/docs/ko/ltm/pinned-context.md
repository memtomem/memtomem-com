---
title: 고정 컨텍스트와 검토 우선 기억
description: 검색 전에 제한된 지침을 합성하고, 제안된 기억을 영구 저장 전에 검토합니다.
---

고정 컨텍스트(Pinned Context)는 일반 검색 결과보다 먼저 포함해야 하는
짧은 Markdown 사실·지침을 저장합니다. 사용자, 프로젝트 로컬,
프로젝트 공유 블록은 다른 memtomem 쓰기와 같은 privacy 및 확인 규칙을
사용합니다.

```bash
mm pinned set response-style \
  --content "실행 가능한 명령과 함께 간결하게 답합니다." --priority 10
mm pinned get response-style --scope user
mm pinned compose "배포 체크리스트"
mm pinned delete response-style --scope user
```

정확한 작업에는 `--scope user|project_local|project_shared`를 사용합니다.
Git 추적 공유 티어 쓰기에는 `--confirm-project-shared`가 필요합니다.

블록 하나는 2,000자까지입니다. 6,000자는 전체 저장 한도가 아니라
한 번의 compose에서 고정 블록에 배정되는 예산입니다. 기본 전체 묶음은
12,000자이며 블록 중간을 자르지 않습니다.

`mem_context_compose` schema 4는 검색 적중 항목의 우선순위를 유지하면서
인접 context-window 청크를 함께 반환합니다. 검색 결과가 비어 있지 않으면
`score_scale`(`rrf`, `bm25`, `dense`, `none`, `rerank`)을 표시하고, rerank
결과에는 사용한 reranker 모델도 포함합니다.

## 검토 우선 제안

`mem_candidate_propose(content, source, source_ref, idempotency_key)`는
privacy scan을 거친 검토 대기 후보를 만들며 장기 기억을 바로 쓰지
않습니다. 후보는 30일 후 만료되고, 같은 idempotency key와 동일한
내용은 기존 후보를 반환합니다. 같은 key를 다른 내용에 재사용하면
거부됩니다. 명시적 승인만 일반 영구 쓰기 경로를 실행합니다.

```bash
mm review list
mm review show CANDIDATE_ID
mm review approve CANDIDATE_ID --reviewer "$USER"
mm review recover --stale-after-minutes 15 --actor "$USER"
```

## LangGraph 어댑터

`MemtomemBaseStore`는 LangGraph tuple-namespace JSON Store를 구현합니다.
`MemtomemStore`는 검색·쓰기·세션·working memory용 상위 비동기
어댑터입니다. `config_overrides`는 ambient 설정보다 나중에 적용되므로
그래프별 DB를 분리하고 테스트 쓰기가 사용자 기본 저장소로 들어가는
문제를 막을 수 있습니다.
