---
title: 다시 열어도 기억을 찾는 LangGraph
description: LLM 없이 대화 상태·표준 Store·Core 검색을 구분하는 한국어 노트북 두 편.
---

**대상:** LangGraph 기억을 처음 연결하는 Python 개발자. **노트북 언어:** 한국어, 코드 식별자는 영어입니다.

## 이런 문제를 해결합니다

한 대화의 상태와 다음 대화에서도 재사용할 지식은 다릅니다. checkpointer는 thread의 그래프 상태를 저장하고, Store는 애플리케이션이 선택한 기억을 여러 thread에서 사용하게 합니다. 둘은 서로를 대체하지 않습니다.

합성 데이터 학습 예제이며 기본 응답은 결정적 템플릿입니다. 실제 LLM이 실행된 것처럼 표현하지 않습니다.

## 독립 실행 가능한 노트북 두 편

| 노트북 | 만드는 흐름 | 확인할 증거 |
|---|---|---|
| 05: 기억 기초 | `compile(store=...)`로 사용자 선호 저장 | 같은 사용자의 새 thread에서 조회, 다른 namespace에서 미조회, 새 store 객체에서 파일 재개방 |
| 06: 검색 기반 기억 | 검색 → 초안 → 승인 → 저장 | 미승인 초안은 결과 기억을 쓰지 않음, 승인 결과의 Markdown 원본과 재개방 후 검색 |

- [한국어 노트북 05 읽기](https://github.com/memtomem/memtomem/blob/main/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [노트북 05 다운로드](https://raw.githubusercontent.com/memtomem/memtomem/main/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [한국어 노트북 06 읽기](https://github.com/memtomem/memtomem/blob/main/examples/notebooks/06_langgraph_retrieval_memory.ipynb)
- [노트북 06 다운로드](https://raw.githubusercontent.com/memtomem/memtomem/main/examples/notebooks/06_langgraph_retrieval_memory.ipynb)

브라우저에서 JSON이 보이면 링크를 “다른 이름으로 저장”하세요. 각 파일 안에 입력·코드·검증·해석·복구·연습이 모두 있습니다. private 저장소나 이전 노트북 실행은 필요하지 않습니다.

## 모델 없이 시작

Python 3.12 이상에서 격리 환경을 만듭니다.

```bash
uv venv .venv
uv pip install --python .venv/bin/python "memtomem[langgraph]==0.5.0" jupyterlab ipykernel
uv run --python .venv/bin/python --no-project jupyter lab
```

Windows에서는 `.venv/bin/python` 대신 `.venv/Scripts/python.exe`를 사용합니다. 해당 환경의 Python 커널을 선택하고 모든 셀을 실행하세요. 최초 패키지 설치에는 인터넷이 필요하지만, 필수 예제에는 API 키·임베딩 모델 다운로드·STM 서버가 필요하지 않습니다.

각 노트북에서 `PASS` 6줄이 나와야 합니다. 06의 `SKIP LLM`은 기본 정상 동작입니다.

## 두 어댑터를 구분하세요

`MemtomemBaseStore`는 LangGraph 표준 Store 인터페이스이며 검사 가능한 JSON 파일을 사용합니다. 임베딩이 없을 때 어휘 겹침으로 검색하며 Core의 BM25/RRF 파이프라인과 다릅니다. TTL은 지원하지 않습니다.

`MemtomemStore`는 Core의 Markdown 작성·색인·검색을 노드에서 명시적으로 호출하는 어댑터입니다. `compile(store=...)`에 넣지 않습니다. 06에서는 키워드 검색만 사용합니다. 두 예제끼리 또는 코딩 클라이언트와 DB를 자동 공유하는 구성은 아닙니다.

`InMemorySaver`는 프로세스 안의 학습용 checkpointer이며 영속 체크포인트 복구를 보장하지 않습니다. namespace 선택도 인증·인가 시스템이 아닙니다.

## 선택: 초안 노드를 실제 LLM으로 교체

06의 OpenAI Responses API 확장 셀은 `RUN_LLM=True`, `OPENAI_API_KEY`, 명시적 `OPENAI_MODEL`이 모두 필요합니다. 검색한 가상 데이터만 전송하며 API 요금이 발생할 수 있습니다. 응답은 저장하지 않은 검토용 초안으로 남깁니다. 설정 부족은 건너뛰고, 시도한 요청이 실패하면 오류로 처리합니다.

모델 접근 권한·과금·외부 추적·프로덕션 체크포인트 복구·범용 MCP 어댑터 호환성은 기본 검증 범위 밖입니다.

**다음:** [Core 기억 개념](/ko/ltm/overview/), [검색 동작](/ko/ltm/hybrid-search/), [코딩 에이전트 활용 사례](/ko/use-cases/vibe-coding/).

참고: [LangGraph 메모리](https://docs.langchain.com/oss/python/langgraph/add-memory) · [OpenAI API 설정](https://developers.openai.com/api/docs/quickstart).
