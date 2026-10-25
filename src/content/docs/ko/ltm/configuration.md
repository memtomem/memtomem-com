---
title: LTM 환경 변수
description: memtomem(LTM) 환경 변수 설정 레퍼런스.
---

memtomem(LTM)은 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)를 사용합니다. 환경 변수 이름은 `env_prefix` 뒤에 필드명을 붙이며, 중첩된 필드는 `env_nested_delimiter="__"`에 따라 **밑줄 두 개**로 구분합니다. 예를 들어 `MEMTOMEM_EMBEDDING__PROVIDER`는 유효하지만 `MEMTOMEM_EMBEDDING_PROVIDER`는 유효하지 않습니다.

값이 겹치면 CLI 옵션, 환경 변수, 설정 파일, 내장 기본값 순으로 앞의 값을 우선합니다.

이 레퍼런스는 `memtomem` 0.6.12가 지원하는 설정을 빠짐없이 문서화합니다. 추천 항목만 추린 목록이 아니며, upstream이 제공하는 모든 옵션을 그대로 유지합니다. STM 설정(접두사 `MEMTOMEM_STM_`)은 [STM 환경 변수](/ko/stm/configuration/)에 정리되어 있습니다.

## LTM (memtomem) — 접두사 `MEMTOMEM_`

<a id="storage"></a>

### 저장소

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | 저장 방식 | `"sqlite"` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite 데이터베이스 파일 경로 | `"~/.memtomem/memtomem.db"` |
| `MEMTOMEM_STORAGE__COLLECTION_NAME` | 논리 컬렉션 이름 | `"memories"` |

<a id="embedding"></a>

### 임베딩

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `"none"` |
| `MEMTOMEM_EMBEDDING__MODEL` | 선택한 제공자의 모델명 | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | 벡터 차원 수. 모델과 일치해야 함 | `0` |
| `MEMTOMEM_EMBEDDING__ONNX_VARIANT` | 로컬 ONNX 정밀도: `fp32`, `int8-arm64`, `int8-avx2`, `int8-avx512`, `int8-avx512-vnni`. 변경하려면 재시작과 명시적인 인덱스 이전이 필요합니다. | `"fp32"` |
| `MEMTOMEM_EMBEDDING__ONNX_ARTIFACT_PATH` | 체크섬이 포함된 `manifest.json`과 함께 로컬에서 내보낸 양자화 아티팩트 디렉터리. `fp32`가 아닌 모든 변형에 필요하며 자동 대체 경로는 없습니다. | `""` |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI 호환 엔드포인트 | `""` |
| `MEMTOMEM_EMBEDDING__API_KEY` | 유료 제공자의 API 키 | `""` |
| `MEMTOMEM_EMBEDDING__BATCH_SIZE` | 임베딩 배치당 텍스트 수 | `64` |
| `MEMTOMEM_EMBEDDING__ONNX_BATCH_SIZE` | 로컬 FastEmbed/ONNX 추론에서 한 번에 처리할 텍스트 수. 실행 중에도 변경 가능 | `8` |
| `MEMTOMEM_EMBEDDING__MAX_SEQUENCE_TOKENS` | 로컬 ONNX 입력의 실제 토큰 상한. `0`이면 모델 상한을 사용하지만, 아래 E5 프로필에서는 예외입니다. 변경 후 재시작하고 기존 콘텐츠를 강제 재인덱싱해야 합니다. | `1024` |
| `MEMTOMEM_EMBEDDING__ONNX_CPU_MEM_ARENA` | ONNX CPU 할당을 재사용합니다. 재시작은 필요하지만 할당자 설정이므로 재인덱싱은 필요하지 않습니다. | `false` |
| `MEMTOMEM_EMBEDDING__MAX_CONCURRENT_BATCHES` | 병렬 임베딩 배치 상한 | `4` |
| `MEMTOMEM_EMBEDDING__THREADS` | ONNX Runtime 스레드 상한 (`0` = ORT 기본값) | `4` |
| `MEMTOMEM_EMBEDDING__PROGRESS_THRESHOLD` | 한 파일이 이 값보다 많은 청크를 만들 때만 청크별 진행 이벤트를 보냄. `0`은 항상 보냄 | `32` |

**ONNX E5 프로필에서 실제로 적용되는 값.** `PROVIDER=onnx`이고 `MODEL`을 비워 두면 Core가 `multilingual-e5-small`을 선택하고, 직접 지정하지 않은 항목에 `DIMENSION=384`, `MAX_SEQUENCE_TOKENS=512`, `THREADS=2`, `ONNX_BATCH_SIZE=4`를 채웁니다. 위 표의 기본값은 *선언된* 기본값이며 이 프로필 밖에서 적용됩니다. 프로필 안에서는 `DIMENSION`이 `384`가 아니거나 `MAX_SEQUENCE_TOKENS`가 `512`가 아니면 값을 조정하지 않고 시작 시 거부합니다. 표에 적힌 `0`이나 `1024`를 명시적으로 지정한 경우도 마찬가지입니다.

<a id="indexing"></a>

### 색인

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | 장기 실행 중인 `memtomem-server`가 파일 변경을 감지해 다시 색인할 디렉터리(JSON 목록). 기존 파일은 자동으로 훑지 않으므로 `mm index <dir>`로 처음 한 번 색인한 뒤 감시 기능에 맡기세요. `mm init`에서 AI 에이전트 기억 등록을 선택하면 이 경로가 채워집니다. | `["~/.memtomem/memories"]` |
| `MEMTOMEM_INDEXING__PROJECT_MEMORY_DIRS` | `.memtomem/memories` 또는 `.memtomem/memories.local` 아래에 있는 프로젝트 계층 기억의 루트 | `[]` |
| `MEMTOMEM_INDEXING__READ_ONLY_MEMORY_DIRS` | 색인과 검색에는 사용하지만 memtomem이 절대 다시 쓰지 않는 루트. 쓰기 가능한 루트와 겹치지 않아야 합니다. | `[]` |
| `MEMTOMEM_INDEXING__RETAIN_MISSING_DIRS` | 다른 도구가 파일을 스스로 지우는 디렉터리(Claude Code plan, Codex memories 등). 색인된 chunk가 유일한 사본이므로, 이 디렉터리 아래이면서 색인 루트 아래에 있는 원본 파일이 사라져도 보류(hold)되지 않고 계속 검색되며 삭제 대상으로도 제시되지 않습니다. 색인 루트 자체는 아니며, `redaction_blocked`나 `scan_unavailable`처럼 다른 이유로 보류된 출처는 그대로 보류됩니다. (JSON 리스트, APPEND 병합) | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | 인덱싱 대상 파일 확장자 (JSON 리스트) | `[".js",".json",".jsx",".md",".py",".toml",".ts",".tsx",".yaml",".yml"]` |
| `MEMTOMEM_INDEXING__MAX_CHUNK_TOKENS` | 청크당 최대 토큰 수 | `512` |
| `MEMTOMEM_INDEXING__MIN_CHUNK_TOKENS` | 짧은 청크 병합 임계값 | `128` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | 폐기 예정인 일회성 이전 기능. 기존 설정의 제공자 디렉터리를 명시적인 `memory_dirs`로 바꿔 저장한 뒤 이 값을 `false`로 변경합니다. 새 설치에서는 실행하지 않으며 새 설정에는 `mm init --include-provider ...`를 사용합니다. | `true` |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | 기본 자격 증명 제외 목록(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**` 등)에 추가할 `.gitignore` 형식의 패턴(JSON 목록). 사용자 `!negation`으로 기본 패턴을 해제할 수 없음 | `[]` |
| `MEMTOMEM_INDEXING__INDEX_MASKING_MANIFEST_PATH` | 소유자가 검토한 마스킹 매니페스트 경로. 정확한 소스 경로와 콘텐츠 SHA-256, 완결된 블록의 줄 범위를 지정합니다. 소스가 바뀌었거나 매니페스트가 유효하지 않으면 일반 개인정보 보호 장치로 되돌아가며, 마스킹된 청크는 읽기 전용입니다. 자동 마스킹을 켜는 설정은 아닙니다. | `""` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | 짧은 형제 섹션을 결합할 때의 목표 토큰 수. `0` 설정 시 결합 단계 비활성화. | `384` |
| `MEMTOMEM_INDEXING__CHUNK_OVERLAP_TOKENS` | 인접 청크 간 토큰 오버랩 | `0` |
| `MEMTOMEM_INDEXING__CHUNK_MODEL_TOKENS` | 특수 토큰을 포함한 검색 입력 전체의 상한 | `8192` |
| `MEMTOMEM_INDEXING__CHUNK_CONTEXT_TOKENS` | 제목과 설명 접두부에 배정하는 별도 예산 | `512` |
| `MEMTOMEM_INDEXING__HARD_MAX_CHUNK_TOKENS` | 본문의 정확한 상한. `0`이면 하드 예산 모드를 사용하지 않습니다. 동일한 로컬 토크나이저가 필요합니다. | `0` |
| `MEMTOMEM_INDEXING__CHUNK_TOKENIZER_PATH` | 임베딩 모델의 로컬 `tokenizer.json` 경로. 지정하면 하드 예산 모드에서 모델을 내려받지 않습니다. | `""` |
| `MEMTOMEM_INDEXING__CHUNK_INPUT_PREFIX` | 최종 입력 토큰 계산에 포함하는 모델 역할 접두사(E5는 `passage: `). 변경 후 재시작이 필요합니다. | `""` |
| `MEMTOMEM_INDEXING__ENRICH_CHUNK_CONTEXT` | 청크 컨텍스트에 캐시된 LLM 설명을 추가합니다. 하드 예산 모드가 필요합니다. | `false` |
| `MEMTOMEM_INDEXING__STRUCTURED_CHUNK_MODE` | JSON/YAML/TOML 청킹 모드: `original` 또는 `recursive` | `"original"` |
| `MEMTOMEM_INDEXING__PARAGRAPH_SPLIT_THRESHOLD` | 긴 산문을 문단 단위로 나누는 토큰 임계값 | `800` |
| `MEMTOMEM_INDEXING__STARTUP_BACKFILL` | 서버 시작 시 `memory_dirs`를 한 번 스캔해 서버가 꺼져 있던 동안 추가된 파일을 반영 | `false` |
| `MEMTOMEM_INDEXING__WATCHER_BACKEND` | 감시 백엔드. `auto`는 macOS에서 폴링을, 그 외 환경에서 네이티브 이벤트를 사용하며 `native` 또는 `polling`으로 지정할 수 있습니다. | `"auto"` |
| `MEMTOMEM_INDEXING__WATCHER_DEBOUNCE_MS` | 자동 재색인 전 대기하는 안정화 시간(1–30000 ms) | `5000` |
| `MEMTOMEM_INDEXING__WATCHER_MAX_WAIT_MS` | 편집이 계속되어도 이벤트를 모으는 최대 시간(1–30000 ms) | `30000` |
| `MEMTOMEM_INDEXING__AUTO_SUMMARIZE` | LLM 설정 시 소스별 AI 요약 생성 | `false` |
| `MEMTOMEM_INDEXING__SUMMARY_LANGUAGE` | AI 소스 요약 출력 언어 | `"en"` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_INPUT_CHARS` | 요약 LLM에 전달하는 소스 문자 상한 | `3000` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_TOKENS` | 요약 출력 토큰 상한 | `256` |

<a id="namespace-policy-rules"></a>

### 네임스페이스 규칙

파일 경로 패턴을 네임스페이스에 연결하는 규칙입니다. 색인할 때 네임스페이스를 자동으로 정하므로 `mem_index`를 호출할 때마다 `namespace=`를 지정할 필요가 없습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | `{path_glob, namespace}` 객체로 구성된 JSON 리스트. `pathspec.GitIgnoreSpec` 패턴, 대소문자 구분 없음. `{parent}`와 `{ancestor:N}` 플레이스홀더는 일치한 파일 경로에서 치환됨. 해석 순서: 명시적 `namespace=` 인자 → 규칙(최초 매칭) → `enable_auto_ns` → `default_namespace`. | `[]` |
| `MEMTOMEM_NAMESPACE__DEFAULT_NAMESPACE` | 새 청크의 기본 네임스페이스 | `"default"` |
| `MEMTOMEM_NAMESPACE__ENABLE_AUTO_NS` | 명시 네임스페이스나 규칙이 없을 때 파일의 직계 부모 폴더명으로 네임스페이스 유도 | `false` |

예시 (`config.d/namespace.json`, APPEND 병합):

```json
{"namespace": {"rules": [
  {"path_glob": "docs/**", "namespace": "docs"},
  {"path_glob": "projects/{parent}/**", "namespace": "proj/{parent}"}
]}}
```

<a id="reranking"></a>

### 재순위

크로스 인코더 재순위는 기본적으로 로컬에서 동작하므로 외부 API를 호출하지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_RERANK__ENABLED` | 하이브리드 검색 결과 재순위 활성화 | `false` |
| `MEMTOMEM_RERANK__PROVIDER` | `fastembed`(로컬 ONNX) / `cohere`(외부 API) / `local`(sentence-transformers `CrossEncoder`, 로컬). `local`을 쓰려면 `sentence-transformers`를 별도로 설치해야 하며, memtomem extra에는 포함되어 있지 않습니다. 이때 `MEMTOMEM_RERANK__MODEL`에는 sentence-transformers 모델명(예: `cross-encoder/ms-marco-MiniLM-L-6-v2`)을 지정합니다. 일반적으로는 `fastembed`를 권장합니다 | `"fastembed"` |
| `MEMTOMEM_RERANK__MODEL` | 모델명. 형식은 공급자에 따라 다릅니다(fastembed 카탈로그 ID, Cohere Rerank 모델, sentence-transformers 모델명). `fastembed`에서 비영어 콘텐츠에는 `onnx-community/gte-multilingual-reranker-base`(341 MB, memtomem이 fastembed에 직접 등록하므로 별도 설정 불필요) 권장. 기존 `jinaai/jina-reranker-v2-base-multilingual`도 계속 동작하지만 1.1 GB이며 모델 라이선스(CC-BY-NC-4.0)가 상업적 사용을 허용하지 않음. 한국어 최적화 프리셋은 리랭커를 켜지 않으므로 `MEMTOMEM_RERANK__ENABLED=true`와 함께 지정 | `"Xenova/ms-marco-MiniLM-L-6-v2"` |
| `MEMTOMEM_RERANK__API_KEY` | `provider=cohere`일 때만 필요 | `""` |
| `MEMTOMEM_RERANK__OVERSAMPLE` | `response_top_k` 대비 풀 배수. 풀 크기 = `max(min_pool, min(max_pool, int(oversample * response_top_k)))`. | `2` |
| `MEMTOMEM_RERANK__MIN_POOL` | 하한선 — 리랭커가 받는 후보 수의 최솟값 | `20` |
| `MEMTOMEM_RERANK__MAX_POOL` | 상한선 — 큰 `top_k`에서 비용 폭주 방지 | `200` |
| `MEMTOMEM_RERANK__TOP_K` | 폐기 예정인 이전 후보군 크기. 지정하면 `min_pool`로 이전 | `20` |

<a id="search"></a>

### 검색

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | 기본 검색 결과 수 | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 후보군 크기 | `50` |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | 벡터 검색 후보군 크기 | `50` |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion 상수 | `60` |
| `MEMTOMEM_SEARCH__ENABLE_BM25` | 키워드 검색 활성화 | `true` |
| `MEMTOMEM_SEARCH__ENABLE_DENSE` | 의미 벡터 검색 활성화 | `true` |
| `MEMTOMEM_SEARCH__RRF_WEIGHTS` | `[BM25, Dense]` RRF 가중치 (JSON 리스트, REPLACE 병합) | `[1,1]` |
| `MEMTOMEM_SEARCH__TOKENIZER` | FTS 토크나이저: `unicode61` 또는 `kiwipiepy` | `"unicode61"` |
| `MEMTOMEM_SEARCH__CACHE_TTL` | 검색 결과 캐시 TTL(초) | `30` |
| `MEMTOMEM_SEARCH__SYSTEM_NAMESPACE_PREFIXES` | 기본 `namespace=None` 검색에서 숨길 네임스페이스 접두사 (JSON 리스트, APPEND 병합) | `["archive:","agent-runtime:"]` |

<a id="decay-시간-감쇠"></a>

### 시간 감쇠

반감기 기반 시간 감쇠 가중. 인덱싱된 지 오래된 청크의 검색 점수를 점진적으로 낮춥니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_DECAY__ENABLED` | 시간 감쇠 가중 활성화 | `false` |
| `MEMTOMEM_DECAY__HALF_LIFE_DAYS` | 반감기 (일). 이 기간이 지나면 기여도가 절반으로 | `30` |

<a id="mmr-다양성-재순위"></a>

### MMR 다양성 재순위

Maximal Marginal Relevance 재순위. 상위 결과 간 중복을 줄이고 서로 다른 관점을 섞습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_MMR__ENABLED` | MMR 다양성 재순위 활성화 | `false` |
| `MEMTOMEM_MMR__LAMBDA_PARAM` | 0.0–1.0. `0.0`=다양성 최대, `1.0`=관련성 최대 | `0.7` |

<a id="access-접근-빈도-가중"></a>

### 접근 빈도 가중

자주 조회된 청크를 상위로 밀어 올리는 빈도 기반 배수.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_ACCESS__ENABLED` | 접근 빈도 기반 가중 활성화 | `false` |
| `MEMTOMEM_ACCESS__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |

<a id="importance-중요도-가중"></a>

### 중요도 가중

청크 메타데이터(태그 · 크기 · 위치 등)에서 파생된 중요도 점수를 검색 점수에 배수로 적용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_IMPORTANCE__ENABLED` | 중요도 가중 활성화 | `false` |
| `MEMTOMEM_IMPORTANCE__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |
| `MEMTOMEM_IMPORTANCE__WEIGHTS` | 중요도 피처 가중치 벡터 (JSON 리스트, REPLACE 병합) | `[0.3,0.2,0.3,0.2]` |

<a id="query-expansion-쿼리-확장"></a>

### 검색어 확장

원래 검색어에 태그, 제목, LLM이 만든 용어를 더해 관련 결과를 놓칠 가능성을 줄입니다. `strategy=llm`은 아래 LLM 설정을 사용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_QUERY_EXPANSION__ENABLED` | 검색어 확장 활성화 | `false` |
| `MEMTOMEM_QUERY_EXPANSION__MAX_TERMS` | 추가 용어 최대 개수 | `3` |
| `MEMTOMEM_QUERY_EXPANSION__STRATEGY` | `tags` / `headings` / `both` / `llm` | `"tags"` |

<a id="context-window-컨텍스트-윈도우"></a>

### 주변 맥락 확장

검색 결과 주변의 인접 청크를 앞뒤로 N개씩 함께 반환합니다. 여러 청크로 나뉜 맥락을 이어서 볼 때 유용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_CONTEXT_WINDOW__ENABLED` | 컨텍스트 윈도우 확장 활성화 | `false` |
| `MEMTOMEM_CONTEXT_WINDOW__WINDOW_SIZE` | 검색 결과 하나당 앞뒤로 가져올 인접 청크 수 N(`0`–`10`) | `2` |

<a id="llm-요약--쿼리-확장-백엔드"></a>

### LLM 설정

`query_expansion.strategy=llm`, 기억 통합 요약 등 LLM 기반 기능이 함께 사용하는 설정입니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_LLM__ENABLED` | LLM 기반 기능 활성화 | `false` |
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / `anthropic` / 호환 엔드포인트 | `"ollama"` |
| `MEMTOMEM_LLM__MODEL` | 모델명. 빈 문자열이면 제공자별 기본값 사용 | `""` |
| `MEMTOMEM_LLM__BASE_URL` | 엔드포인트 URL | `"http://localhost:11434"` |
| `MEMTOMEM_LLM__API_KEY` | 유료 제공자의 API 키 | `""` |
| `MEMTOMEM_LLM__MAX_TOKENS` | 생성 토큰 상한 | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | 요청 타임아웃 (초) | `60` |

<a id="tool-exposure"></a>

### 도구 표시 범위

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core`(`mem_do` 라우터 포함 9개) / `standard`(`mem_do` 포함 38개) / `full`(현재 도구 100개, 폐기 예정 별칭 없음) | `core` |

### Web UI

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod`(Settings의 Namespaces를 포함한 표준 Simple/Advanced 화면) / `dev`(Sessions · Search Runs · Quality Lab · Working Memory · Procedures · Health Report · Redaction 유지관리 화면도 표시). 실행할 때 `mm web --mode` 또는 `mm web --dev`로 덮어쓸 수 있음 | `prod` |
| `MEMTOMEM_WEB__HOST` | `mm web`이 수신 대기할 주소. `--host`가 덮어씀 | `127.0.0.1` |
| `MEMTOMEM_WEB__PORT` | `mm web`이 수신 대기할 포트. `--port`가 덮어씀 | `8080` |
| `MEMTOMEM_WEB__CSRF_ENFORCE` | Web UI 변경 엔드포인트의 CSRF 보호를 강제합니다. 비활성화는 긴급 롤백에만 사용합니다. | `true` |

<a id="lifecycle-policies--webhooks"></a>

### 수명 주기 정책과 웹훅

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | PolicyScheduler 실행 (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | 스케줄러 주기 | `60` |
| `MEMTOMEM_POLICY__MAX_ACTIONS_PER_RUN` | 예약된 정책을 한 번 실행할 때 처리할 작업 수 상한 | `100` |
| `MEMTOMEM_WEBHOOK__ENABLED` | 기억 이벤트용 외부 웹훅 활성화 | `false` |
| `MEMTOMEM_WEBHOOK__URL` | 웹훅을 보낼 URL | `""` |
| `MEMTOMEM_WEBHOOK__EVENTS` | 전송 이벤트 유형 (JSON 리스트, APPEND 병합) | `["add","delete","search"]` |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC 서명에 사용할 비밀값 | `""` |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP 제한 시간 | `10` |
| `MEMTOMEM_WEBHOOK__ALLOW_PRIVATE_HOSTS` | 이 컴퓨터나 LAN의 수신자에게 전송 허용. 끄면 URL 호스트가 private, loopback, link-local, 예약 주소로 해석되지 않아야 하며, 시작 시점뿐 아니라 소켓을 여는 시점에도 확인합니다. | `false` |
| `MEMTOMEM_WEBHOOK__PROXY` | 명시적 전달 프록시(`http://` 또는 `https://`). 웹훅은 환경의 `HTTP(S)_PROXY`를 사용하지 않습니다. 프록시를 지정하면 프록시가 수신자에 연결하므로 주소 정책은 프록시가 적용합니다. | `""` |

<a id="consolidation-schedule-통합-스케줄"></a>

### 기억 통합 일정

중복되거나 비슷한 기억을 주기적으로 묶어 보관용 요약으로 압축하는 백그라운드 작업입니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__ENABLED` | 스케줄 실행 활성화 | `false` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__INTERVAL_HOURS` | 실행 주기 (시간) | `24` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MIN_GROUP_SIZE` | 통합 대상 최소 그룹 크기 | `3` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MAX_GROUPS` | 1회 실행당 처리 그룹 상한 | `10` |

<a id="warmup"></a>

### 시작할 때 미리 불러오기

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WARMUP__ENABLED` | MCP 서버를 시작할 때 로컬 임베딩·재순위 모델을 백그라운드에서 미리 불러옴. 원격 제공자는 제외 | `false` |

<a id="health-watchdog-상태-모니터"></a>

### 상태 모니터

상태 확인과 자동 유지보수를 주기적으로 수행하는 백그라운드 작업입니다. 원본이 사라진 자료 출처는 삭제하지 않고 보류하여 검색에서만 제외합니다(색인 루트와 `indexing.retain_missing_dirs` 양쪽 아래의 출처는 다른 이유로 보류되지 않은 한 계속 검색됩니다). 청크 삭제는 `mm gc orphan-sources --apply`로 직접 실행해야 합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_HEALTH_WATCHDOG__ENABLED` | 상태 모니터 실행 | `false` |
| `MEMTOMEM_HEALTH_WATCHDOG__HEARTBEAT_INTERVAL_SECONDS` | 하트비트 주기 | `60` |
| `MEMTOMEM_HEALTH_WATCHDOG__DIAGNOSTIC_INTERVAL_SECONDS` | 진단 주기 | `300` |
| `MEMTOMEM_HEALTH_WATCHDOG__DEEP_INTERVAL_SECONDS` | 정밀 검사 주기 | `3600` |
| `MEMTOMEM_HEALTH_WATCHDOG__MAX_SNAPSHOTS` | 보관 스냅샷 수 상한 | `1000` |
| `MEMTOMEM_HEALTH_WATCHDOG__ORPHAN_CLEANUP_THRESHOLD` | 자동 유지보수가 원본이 사라진 자료 출처를 보류하기 시작하는 개수 기준 | `10` |
| `MEMTOMEM_HEALTH_WATCHDOG__AUTO_MAINTENANCE` | 자동 유지보수 수행 | `true` |

<a id="scheduler"></a>

### 작업 스케줄러

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SCHEDULER__ENABLED` | 등록한 유지보수 작업의 cron 실행 활성화 | `false` |
| `MEMTOMEM_SCHEDULER__MAX_CONCURRENT_JOBS` | 동시에 실행할 예약 작업 수 상한 | `1` |
| `MEMTOMEM_SCHEDULER__DEFAULT_TIMEZONE` | 작업 일정의 시간대. Phase A에서는 `utc`만 적용 | `"utc"` |
| `MEMTOMEM_SCHEDULER__RUNNER_TIMEOUT_SECONDS` | 예약 작업 한 번의 제한 시간 | `300` |

<a id="session-summary"></a>

### 세션 요약

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SESSION_SUMMARY__AUTO` | 충분한 청크가 추가된 상태에서 `mem_session_end` 호출 시 LLM 요약 자동 생성 | `true` |
| `MEMTOMEM_SESSION_SUMMARY__MIN_CHUNKS` | 자동 요약 실행 최소 청크 수 | `5` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_TOKENS` | 요약 출력 토큰 상한 | `500` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_INPUT_CHARS` | 조립된 입력이 이 크기를 넘으면 자동 요약 생략 | `60000` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_LINKS` | 요약 청크에서 원본 청크로 쓰는 링크 상한 | `50` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_LOOKUP_TOP_K` | 검색 결과를 보완할 때 확인할 세션 요약 청크 수 | `3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_SCORE_THRESHOLD` | 결과 보완에 필요한 최소 요약 점수 | `0.3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_RESCUE_WEIGHT` | 세션 요약을 통해 추가한 원본 파일 결과의 RRF 입력 가중치 | `0.5` |

<a id="session-tracing-세션-실행-추적"></a>

### 세션 실행 추적

세션 명령 실행 기록을 JSONL 파일에 남기고, 선택에 따라 Langfuse에도 보냅니다. 기본값은 비활성화입니다. `payload_mode`의 기본값인 `metadata`는 본문을 기록하지 않습니다. `redacted`는 비밀값을 가린 본문, `full`은 전체 본문을 기록합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SESSION_TRACE__ENABLED` | 세션 실행 추적 활성화 | `false` |
| `MEMTOMEM_SESSION_TRACE__JSONL_ENABLED` | JSONL 파일 기록 | `true` |
| `MEMTOMEM_SESSION_TRACE__JSONL_PATH` | JSONL 출력 파일 경로 | `"~/.memtomem/traces/session-traces.jsonl"` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_ENABLED` | 실행 기록을 Langfuse로 전송 | `false` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_HOST` | Langfuse 호스트 URL | `""` |
| `MEMTOMEM_SESSION_TRACE__SAMPLING_RATE` | 0.0–1.0. 기록할 세션 비율 | `1` |
| `MEMTOMEM_SESSION_TRACE__PAYLOAD_MODE` | `metadata`(본문 미기록) / `redacted`(비밀값을 가린 본문) / `full`(전체 본문) | `"metadata"` |
| `MEMTOMEM_SESSION_TRACE__MAX_PAYLOAD_CHARS` | 실행 기록에 남길 본문 문자 수 상한 | `10000` |

`langfuse_enabled=true`로 설정하려면 `langfuse` 추가 패키지가 설치되어 있고 공개 키와 비밀 키를 모두 지정해야 합니다. 조건을 충족하지 않으면 시작할 때 설정 검증에 실패합니다.

<a id="logging"></a>

### 로그

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | 로그 형식 | — |

<a id="hooks--context-gateway"></a>

### 훅 / Context Gateway

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_HOOKS__TARGET_SCOPE` | memtomem이 관리하는 Claude Code 설정 훅의 적용 범위: `user`, `project_shared`, `project_local` | `"user"` |
| `MEMTOMEM_CONTEXT_GATEWAY__KNOWN_PROJECTS_PATH` | Context Gateway용 Web UI 프로젝트 레지스트리 | `"~/.memtomem/known_projects.json"` |
| `MEMTOMEM_CONTEXT_GATEWAY__EXPERIMENTAL_CLAUDE_PROJECTS_SCAN` | `~/.claude/projects/<encoded>` 디렉터리명을 프로젝트 루트로 복원해 스캔(검증되지 않은 후보까지 포함) | `false` |
| `MEMTOMEM_CONTEXT_GATEWAY__AUTO_DISPLAY_CONFIGURED_PROJECTS` | 탐색 후보 중 알려진 실행 환경 표시 파일(`.claude`/`.gemini`/`.codex`/`.agents`/`.kimi`/`.memtomem`)이 있는 프로젝트만 자동 표시 | `true` |

User 계층에 쓰려면 클라이언트에서 명시적으로 확인해야 합니다. `USER_TIER_ENABLED` 설정 필드는 없습니다.

### 고급 / 운영 경로

다음 프로세스 수준 변수는 계층형 `config.json` / `config.d` 모델에 포함되지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WIKI_PATH` | 위키 저장소 위치 재정의 | `~/.memtomem-wiki` |
| `MEMTOMEM_FASTEMBED_CACHE` | ONNX / FastEmbed 모델 캐시 재정의(`FASTEMBED_CACHE_PATH`보다 우선) | `~/.memtomem/cache/fastembed` |
| `MEMTOMEM_INDEX_DEBOUNCE_QUEUE` | 짧은 시간에 연속으로 생긴 파일 변경을 모아 두는 큐 파일 경로 재정의 | 상태 디렉터리 |

<a id="임베딩-프로바이더-비교"></a>

### 임베딩 제공자 비교

| 제공자 | GPU | 비용 | 비고 |
|---|---|---|---|
| `onnx` | 불필요 | 무료 | fastembed 기반 내장. 최초 실행 시 약 270MB 다운로드 |
| `ollama` | 불필요 | 무료 | Ollama 설치 필요. `ollama pull nomic-embed-text` |
| `openai` | 불필요 | 유료 | API 키 필요 |

> 원문 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem/blob/v0.6.12/docs/guides/configuration.md)를 참고하세요.

## 고정 소스 기준 기본값

위 기본값은 초기화 프리셋을 적용하기 전 스키마 선언값입니다. `mm init`은 공급자·차원·메모리 경로를 변경할 수 있습니다. OTLP와 Langfuse는 별도 옵트인입니다. 자식 MCP 프로세스에 환경 변수를 전달하고 다시 연결해야 합니다.

### Core 추가 설정

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_ENTITY_BOOST__ENABLED` | 질의 엔티티 점수 부스팅 활성화 | `false` |
| `MEMTOMEM_ENTITY_BOOST__MAX_BOOST` | 엔티티 점수 배율 상한 | `1.5` |
| `MEMTOMEM_ENTITY_BOOST__MIN_CONFIDENCE` | 엔티티 최소 신뢰도 | `0` |
| `MEMTOMEM_ENTITY_BOOST__QUERY_ENTITY_TYPES` | 질의 매칭에 사용할 엔티티 유형 | `["date","person","technology"]` |
| `MEMTOMEM_INDEXING__EXTRACT_ENTITIES` | 색인 시 엔티티 추출 | `true` |
| `MEMTOMEM_RERANK__TIMEOUT_S` | 리랭커 제한 시간(초) | `30` |
