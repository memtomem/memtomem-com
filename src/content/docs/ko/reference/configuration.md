---
title: 환경 변수
description: memtomem LTM 및 STM 환경 변수 설정 레퍼런스.
---

memtomem (LTM)과 memtomem-stm (STM)은 모두 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) 기반으로 `env_prefix` + `env_nested_delimiter="__"`를 사용합니다. **중첩 설정에는 이중 언더스코어**를 사용합니다 — `MEMTOMEM_EMBEDDING__PROVIDER`(가능), `MEMTOMEM_EMBEDDING_PROVIDER`(불가).

우선순위(높은 순): CLI 플래그 → 환경 변수 → 설정 파일 → 내장 기본값.

## LTM (memtomem) — 접두사 `MEMTOMEM_`

### Storage

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | 스토리지 백엔드 | `sqlite` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite 데이터베이스 파일 경로 | `~/.memtomem/memtomem.db` |

### Embedding

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `none` (마법사 실행 전까지 키워드 검색만 사용) |
| `MEMTOMEM_EMBEDDING__MODEL` | 선택된 프로바이더의 모델명 | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | 벡터 차원 수 (모델과 일치해야 함) | 프로바이더별 상이 |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI 호환 엔드포인트 | — |
| `MEMTOMEM_EMBEDDING__API_KEY` | 유료 프로바이더용 API 키 | — |

### Indexing

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | 시작 시 인덱싱되는 디렉터리 (JSON 리스트). `mm init`에서 AI 에이전트 기억 등록을 선택하면 해당 경로가 채워집니다. | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | 인덱싱 대상 파일 확장자 (JSON 리스트) | `[".md", ".py", ".js", ".ts", ".json", ".yaml", ".toml", ".rst"]` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | `true`인 경우, `mm init`이 AI 에이전트 기억 디렉터리를 `memory_dirs`에 등록할지 질의합니다. `false` 설정 시 프롬프트 비활성화. | `true` |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | 내장 자격 증명 denylist(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**` 등) 위에 추가되는 `.gitignore` 구문 패턴 (JSON 리스트). 사용자 `!negation`으로 내장 패턴을 해제할 수 없음. | `[]` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | 짧은 형제 섹션을 결합할 때의 목표 토큰 수. `0` 설정 시 결합 단계 비활성화. | `384` |

### Namespace Policy Rules

경로 glob → 네임스페이스 매핑 규칙. 인덱싱 시점에 네임스페이스를 자동 할당하므로, `mem_index` 호출마다 `namespace=`를 지정할 필요가 없습니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | `{path_glob, namespace}` 객체로 구성된 JSON 리스트. `pathspec.GitIgnoreSpec` 패턴, 대소문자 구분 없음. `{parent}` 플레이스홀더는 일치한 파일의 상위 폴더명으로 치환됨. 해석 순서: 명시적 `namespace=` 인자 → 규칙(최초 매칭) → `enable_auto_ns` → `default_namespace`. | `[]` |

예시 (`config.d/namespace.json`, APPEND 병합):

```json
{"namespace": {"rules": [
  {"path_glob": "docs/**", "namespace": "docs"},
  {"path_glob": "projects/{parent}/**", "namespace": "proj/{parent}"}
]}}
```

### Reranking

Cross-encoder 리랭킹은 기본적으로 로컬에서 동작하며, 외부 API 호출이 필요하지 않습니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_RERANK__ENABLED` | 하이브리드 검색 결과 리랭킹 활성화 | `false` |
| `MEMTOMEM_RERANK__PROVIDER` | `fastembed` (로컬 ONNX) / `cohere` (외부 API) | `fastembed` |
| `MEMTOMEM_RERANK__MODEL` | 모델명. 비영어 콘텐츠에는 `jinaai/jina-reranker-v2-base-multilingual` 권장. | `Xenova/ms-marco-MiniLM-L-6-v2` |
| `MEMTOMEM_RERANK__API_KEY` | `provider=cohere`일 때만 필요 | — |

### Search

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | 기본 검색 결과 수 | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 후보군 크기 | — |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | 벡터 검색 후보군 크기 | — |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion 상수 | — |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (9 tools + `mem_do`) / `standard` (~32) / `full` (74) | `core` |

### Lifecycle policies & webhooks

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | PolicyScheduler 실행 (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | 스케줄러 주기 | — |
| `MEMTOMEM_WEBHOOK__ENABLED` | 기억 이벤트용 외부 웹훅 활성화 | `false` |
| `MEMTOMEM_WEBHOOK__URL` | 웹훅 타깃 URL | — |
| `MEMTOMEM_WEBHOOK__EVENTS` | 전송 이벤트 유형 (JSON 리스트) | — |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC 서명용 시크릿 | — |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP 타임아웃 | — |

### Logging

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | 로그 포맷 | — |

### 임베딩 프로바이더 비교

| Provider | GPU | 비용 | 비고 |
|---|---|---|---|
| `onnx` | 불필요 | 무료 | fastembed 기반 내장. 최초 실행 시 약 270MB 다운로드 |
| `ollama` | 불필요 | 무료 | Ollama 설치 필요. `ollama pull nomic-embed-text` |
| `openai` | 불필요 | 유료 | API 키 필요 |

> 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem/blob/main/docs/guides/configuration.md).

## STM (memtomem-stm) — 접두사 `MEMTOMEM_STM_`

STM 설정은 네 영역으로 구성됩니다: flat `LOG_LEVEL`, 그리고 `PROXY__*`, `SURFACING__*`, `LANGFUSE__*`. 압축, 캐싱, 메트릭, 자동 인덱싱, 추출은 모두 **`PROXY__` 하위**에 위치합니다.

### General

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LOG_LEVEL` | 로그 레벨 | `INFO` |

### Proxy

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__ENABLED` | 프록시 파이프라인 마스터 스위치 | `false` |
| `MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION` | 기본 압축 전략 | `auto` |
| `MEMTOMEM_STM_PROXY__DEFAULT_MAX_RESULT_CHARS` | 응답당 문자 예산 | `16000` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_CHARS` | 업스트림 응답 크기 OOM 가드 | `10000000` |
| `MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION` | 보존 하한 (0.0–1.0) | `0.65` |

### Proxy → Cache

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | 응답 캐싱 활성화 | `true` |
| `MEMTOMEM_STM_PROXY__CACHE__DEFAULT_TTL_SECONDS` | 캐시 TTL | `3600` |
| `MEMTOMEM_STM_PROXY__CACHE__DB_PATH` | 캐시 DB 경로 | — |
| `MEMTOMEM_STM_PROXY__CACHE__MAX_ENTRIES` | 캐시 엔트리 상한 | — |

### Proxy → Auto-Index (Stage 4)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__ENABLED` | 도구 응답을 LTM으로 인덱싱 | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | Stage 4를 요청 경로 외부에서 실행 (F4) | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | 인덱싱 대상 최소 응답 크기 | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | 출력 디렉터리 | — |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | 자동 인덱싱 기억의 네임스페이스 | `proxy-{server}` |

### Proxy → Metrics / Extraction / Relevance scorer

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | 호출 메트릭 기록 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (사실 추출) | `false` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | 스코어러 백엔드 | — |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | `stm_compression_feedback` 기록 | `true` |

### Surfacing (Stage 3)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | LTM 기반 능동적 서피싱 활성화 | `true` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | 관련성 최소 점수 | `0.02` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | 호출당 주입되는 최대 기억 수 | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | 매우 작은 응답에는 서피싱 생략 | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | 추출 쿼리의 최소 토큰 수 | `3` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | 세션 간 중복 제거 윈도우 | `604800` (7일) |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | `stm_surfacing_feedback` 수용 | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | 도구별 임계값 자동 튜닝 | `true` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | LTM 서버 실행 MCP 명령어 | — |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | LTM 명령어 인자 (JSON 리스트) | — |

주입 모드(기본 `prepend`, 추가로 `append` / `section`)는 `MEMTOMEM_STM_SURFACING__INJECTION_MODE`로 설정합니다.

### Langfuse (관측성)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | 스팬 전송 | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | — |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | — |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse 호스트 URL | — |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1.0` |

### 압축 전략 (`MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION`)

| Strategy | 용도 |
|---|---|
| `auto` | 기본값 — 콘텐츠 유형별 자동 선택 |
| `hybrid` | Markdown (구조 보존 + 비핵심 섹션 축약) |
| `selective` | 쿼리 관련 섹션만 유지 |
| `progressive` | 대용량 콘텐츠, 커서 기반 분할 전송 (무손실) |
| `extract_fields` | JSON 딕셔너리 |
| `schema_pruning` | 대형 JSON 배열 |
| `skeleton` | API 문서 (스키마만 유지) |
| `llm_summary` | LLM 기반 요약 (Ollama / OpenAI) |
| `truncate` | 폴백 절삭 |
| `none` | 패스스루 |

> 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md).
