---
title: 다시 열어도 기억을 찾는 LangGraph
description: LLM 없이 대화 상태·표준 Store·Core 검색을 구분하는 한국어 노트북 두 편.
---

**대상:** LangGraph 기억을 처음 연결하는 Python 개발자. **노트북 언어:** 한국어, 코드 식별자는 영어입니다.

## 이런 문제를 해결합니다

한 대화 스레드의 상태와 여러 대화에서 재사용할 지식은 역할이 다릅니다. 체크포인터(checkpointer)는 스레드의 그래프 상태를 추적하고, Store는 애플리케이션이 선택한 기억을 여러 스레드에 걸쳐 명시적으로 조회·저장하도록 해 줍니다. 두 구성 요소는 서로를 대체하지 않습니다.

이 노트북들은 합성 데이터 기반 학습 예제이며, 기본 응답은 결정론적 템플릿으로 동작하고 실시간 LLM 응답을 흉내 내지 않습니다.

## 독립 실행 가능한 노트북 두 편

| 노트북 | 만드는 흐름 | 확인할 증거 |
|---|---|---|
| 05: 기억 기초 | `compile(store=...)`로 사용자 선호 저장 | 같은 사용자의 새 thread에서 조회, 다른 namespace에서 미조회, 새 store 객체에서 파일 재개방 |
| 06: 검색 기반 기억 | 검색 → 초안 → 승인 → 저장 | 미승인 초안은 결과 기억을 저장하지 않음, 승인 결과의 Markdown 원본과 재개방 후 검색 |

- [한국어 노트북 05 읽기](https://github.com/memtomem/memtomem/blob/v0.7.9/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [노트북 05 다운로드](https://raw.githubusercontent.com/memtomem/memtomem/v0.7.9/examples/notebooks/05_langgraph_memory_basics.ipynb)
- [한국어 노트북 06 읽기](https://github.com/memtomem/memtomem/blob/v0.7.9/examples/notebooks/06_langgraph_retrieval_memory.ipynb)
- [노트북 06 다운로드](https://raw.githubusercontent.com/memtomem/memtomem/v0.7.9/examples/notebooks/06_langgraph_retrieval_memory.ipynb)

브라우저에서 JSON이 표시되면 링크를 “다른 이름으로 저장”하세요. 각 파일에 입력·코드·검증·해석·복구·연습이 모두 포함되어 있습니다. private 저장소나 이전 노트북 실행은 필요하지 않습니다.

## 모델 없이 시작

Python 3.12 이상에서 격리 환경을 만듭니다.

```bash
uv venv .venv
uv pip install --python .venv/bin/python "memtomem[langgraph]==0.7.9" jupyterlab ipykernel
uv run --python .venv/bin/python --no-project jupyter lab
```

Windows에서는 `.venv/bin/python` 대신 `.venv/Scripts/python.exe`를 사용합니다. 해당 환경의 Python 커널을 선택하고 모든 셀을 실행하세요. 최초 패키지 설치에는 인터넷이 필요하지만, 필수 예제에는 API 키·임베딩 모델 다운로드·STM 서버가 필요하지 않습니다.

각 노트북에서 `PASS` 6줄이 출력되어야 합니다. 06의 `SKIP LLM`은 기본 설정의 정상 동작입니다.

## 두 어댑터를 구분하세요

`MemtomemBaseStore`는 LangGraph 표준 Store 인터페이스를 구현하며, tuple 형태의 namespace를 검사 가능한 JSON 파일에 저장합니다. 임베딩이 없을 때 어휘 겹침으로 검색하며 Core의 BM25/RRF 파이프라인과 다릅니다. TTL은 지원하지 않습니다.

:::caution[0.7.4 이상으로 업그레이드할 때]
0.7.4 이상이 `MemtomemBaseStore`를 처음 열면 잠금 파일(`<root>/.layout.lock`)을 잡고 레코드 파일을 `<root>/records.v2/`로 옮깁니다. 이를 통해 macOS와 Windows처럼 대소문자를 구분하지 않는 파일 시스템에서 대소문자만 다른 이름이 같은 파일로 충돌하는 문제를 방지합니다. 먼저 같은 저장소를 사용하는 이전 버전 memtomem 프로세스를 모두 중지하세요. 이전 버전 프로세스가 나중에 구형 형식으로 쓴 레코드는 키가 새로우면 다음에 열 때 옮겨지고, 내용이 다른 기존 레코드와 충돌하면 이전 프로세스의 사본을 `<root>/quarantine.v2/`로 격리하므로 직접 정리해야 합니다. 마이그레이션은 자동으로 되돌릴 수 없으며, 되돌리려면 업그레이드 전에 백업한 저장소 루트 사본을 복원합니다.
:::

`MemtomemStore`는 Core의 Markdown 작성·색인·검색과 세션·작업 기억을 노드에서 명시적으로 호출하는 비동기 어댑터입니다. `compile(store=...)`에 전달하지 않습니다. `file=`을 지정하지 않으면 `add()`는 쓰는 네임스페이스의 날짜별 기억 파일([데이 파일](/ko/ltm/cli/#mm-add), day file)에 덧붙입니다. 대상 파일에 다른 네임스페이스의 항목이 있거나, 0.7.5부터는 파일 이름이 다른 네임스페이스의 데이 파일 규칙으로 해석되는 경우 `add()`가 `{"error": "namespace_mix_refused", ...}`를 반환하며, 이를 우회하는 옵션은 없습니다. 다른 파일에 쓰거나 해당 파일의 네임스페이스로 씁니다. 06에서는 키워드 검색만 사용합니다. 두 예제 간에, 또는 코딩 클라이언트와 DB를 자동으로 공유하는 구성은 아닙니다.

`MemtomemStore`의 `config_overrides`는 주변 환경의 설정을 읽은 뒤에 적용됩니다. 그래프 전용 DB를 명시적으로 지정해 테스트 데이터가 사용자 기본 저장소에 저장되지 않도록 할 수 있습니다. 알 수 없는 섹션이나 키를 지정하면 기본 저장소로 넘어가지 않고 첫 호출에서 오류가 발생합니다.

`InMemorySaver`는 프로세스 안의 학습용 checkpointer이며 영속 체크포인트 복구를 보장하지 않습니다. namespace 선택도 인증·인가 시스템이 아닙니다.

## Core 검색 파이프라인으로 순위를 매기는 Store

`compile(store=...)`에 넘길 Store가 Core의 검색 파이프라인(BM25와 벡터 검색 결합, 선택적 재정렬)으로 순위를 매기게 하려면 별도 패키지 [`langchain-memtomem`](https://pypi.org/project/langchain-memtomem/0.2.0/)의 `MemtomemPipelineStore`를 사용합니다. Python 3.12 이상, `langgraph>=1.0,<2`, `memtomem>=0.7.4,<0.8`이 필요합니다. 위에서 만든 환경에 추가하려면 다음 명령을 실행합니다(Windows에서는 `.venv/Scripts/python.exe` 사용).

```bash
uv pip install --python .venv/bin/python langchain-memtomem
```

```python
from langchain_memtomem import MemtomemPipelineStore

store = await MemtomemPipelineStore.open("/var/app/memory")
graph = builder.compile(store=store)  # builder: StateGraph
```

- 색인은 지정한 루트 아래에 Store가 직접 만듭니다. 개인 `~/.memtomem` 설정과 `MEMTOMEM_*` 환경 변수는 이 Store의 설정에 적용되지 않습니다. 이 Store에는 개발자의 기억이 아니라 애플리케이션의 기억(사용자, 스레드)이 담깁니다. 다만 프로젝트 계층(tier) 등록 정보를 한 번 읽으며, ONNX 모델 캐시처럼 루트 밖의 memtomem 공용 경로를 사용할 수 있습니다.
- 기본값에서는 임베딩을 사용하지 않습니다(BM25만 사용, 모델 다운로드 없음). 벡터 검색을 쓰려면 `memtomem[onnx]`를 함께 설치하고 `config={"embedding": {...}}`를 지정합니다.
- `MemtomemPipelineStore.open(...)`에 별도 키워드 인자 `retrieval={"mode": "hybrid" | "bm25" | "dense", "weights": [bm25, dense], "rrf_k": 60}`를 전달해 실행할 검색 경로를 선택합니다(이 외의 키는 `ValueError`로 거부됨). `weights`는 `"hybrid"` 모드에서만 적용되며, `"dense"`는 임베더가 필수입니다(임베더가 없으면 `open` 시점에 거부되고, 질의 중 벡터 검색을 실행할 수 없으면 `DenseSearchUnavailable` 발생). `search`나 `rerank` 같은 나머지 파이프라인 설정은 `config={...}`에 지정합니다.
- `index=False`로 저장한 항목은 목록 조회와 필터 대상이지만 검색 순위에는 오르지 않습니다. TTL은 지원하지 않습니다.
- 위의 두 노트북은 이 패키지를 사용하지 않습니다.

자세한 동작은 [PyPI 배포 페이지](https://pypi.org/project/langchain-memtomem/0.2.0/)를 참고하세요.

## 선택: 초안 노드를 실제 LLM으로 교체

06의 OpenAI Responses API 확장 셀은 `RUN_LLM=True`, `OPENAI_API_KEY`, 명시적 `OPENAI_MODEL`이 모두 필요합니다. 검색한 가상 데이터만 전송하며 API 요금이 발생할 수 있습니다. 응답은 저장하지 않은 검토용 초안으로 남깁니다. 설정이 부족하면 건너뛰고, 실제로 시도한 요청이 실패하면 오류로 처리합니다.

모델 접근 권한·과금·외부 추적·프로덕션 체크포인트 복구·범용 MCP 어댑터 호환성은 기본 검증 범위 밖입니다.

**다음:** [Core 기억 개념](/ko/ltm/overview/), [검색 동작](/ko/ltm/hybrid-search/), [코딩 에이전트 활용 사례](/ko/use-cases/vibe-coding/).

참고: [LangGraph 메모리](https://docs.langchain.com/oss/python/langgraph/add-memory) · [OpenAI API 설정](https://developers.openai.com/api/docs/quickstart).
