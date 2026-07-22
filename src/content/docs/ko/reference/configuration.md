---
title: 환경 변수
description: memtomem LTM 및 STM 환경 변수 설정 레퍼런스.
---

memtomem (LTM)과 memtomem-stm (STM)은 모두 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) 기반으로 `env_prefix` + `env_nested_delimiter="__"`를 사용합니다. **중첩 설정에는 이중 언더스코어**를 사용합니다 — `MEMTOMEM_EMBEDDING__PROVIDER`(가능), `MEMTOMEM_EMBEDDING_PROVIDER`(불가).

우선순위(높은 순): CLI 플래그 → 환경 변수 → 설정 파일 → 내장 기본값.

이 공개 레퍼런스는 `memtomem` 0.3.12 및 `memtomem-stm` 0.1.41의 전체 설정 표면을 기준으로 합니다. 일부 추천값만 추린 문서가 아니라 upstream 옵션을 의도적으로 모두 복제합니다.

## LTM (memtomem) — 접두사 `MEMTOMEM_`

### Storage

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | 스토리지 백엔드 | `sqlite` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite 데이터베이스 파일 경로 | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_STORAGE__COLLECTION_NAME` | 논리 컬렉션 이름 | `memories` |

### Embedding

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `none` (`mm init` 실행 전까지 키워드 검색만 사용) |
| `MEMTOMEM_EMBEDDING__MODEL` | 선택된 프로바이더의 모델명 | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | 벡터 차원 수 (모델과 일치해야 함) | 프로바이더별 상이 |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI 호환 엔드포인트 | — |
| `MEMTOMEM_EMBEDDING__API_KEY` | 유료 프로바이더용 API 키 | — |
| `MEMTOMEM_EMBEDDING__BATCH_SIZE` | 임베딩 배치당 텍스트 수 | `64` |
| `MEMTOMEM_EMBEDDING__ONNX_BATCH_SIZE` | 로컬 FastEmbed/ONNX 추론 배치당 텍스트 수. 런타임 변경 가능 | `8` |
| `MEMTOMEM_EMBEDDING__MAX_SEQUENCE_TOKENS` | 로컬 ONNX 입력의 실제 토큰 상한. `0`이면 모델 상한을 사용합니다. 변경 후 재시작하고 기존 콘텐츠를 강제 재인덱싱해야 합니다. | `1024` |
| `MEMTOMEM_EMBEDDING__ONNX_CPU_MEM_ARENA` | ONNX CPU 할당을 재사용합니다. 재시작은 필요하지만 할당자 설정이므로 재인덱싱은 필요하지 않습니다. | `false` |
| `MEMTOMEM_EMBEDDING__MAX_CONCURRENT_BATCHES` | 병렬 임베딩 배치 상한 | `4` |
| `MEMTOMEM_EMBEDDING__THREADS` | ONNX Runtime 스레드 상한 (`0` = ORT 기본값) | `4` |
| `MEMTOMEM_EMBEDDING__PROGRESS_THRESHOLD` | 한 파일이 이 값보다 많은 청크를 만들 때만 청크별 진행 이벤트를 보냄. `0`은 항상 보냄 | `32` |

### Indexing

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | 장기 실행 `memtomem-server` 파일 워처가 반응형으로 재인덱싱하는 디렉터리 (JSON 리스트). 기존 파일은 자동 스캔되지 않으므로 `mm index <dir>` 로 한 번 시드한 뒤 워처에 맡기세요. `mm init`에서 AI 에이전트 기억 등록을 선택하면 경로가 채워집니다. | `["~/.memtomem/memories"]` + 선택한 provider 폴더 |
| `MEMTOMEM_INDEXING__PROJECT_MEMORY_DIRS` | `.memtomem/memories` 또는 `.memtomem/memories.local` 아래의 프로젝트 티어 기억 루트 | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | 인덱싱 대상 파일 확장자 (JSON 리스트) | `[".md", ".json", ".yaml", ".yml", ".toml", ".py", ".js", ".ts", ".tsx", ".jsx"]` |
| `MEMTOMEM_INDEXING__MAX_CHUNK_TOKENS` | 청크당 최대 토큰 수 | `512` |
| `MEMTOMEM_INDEXING__MIN_CHUNK_TOKENS` | 짧은 청크 병합 임계값 | `128` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | 폐기 예정인 1회성 마이그레이션 트리거입니다. 기존 설정의 프로바이더 디렉터리를 명시적 `memory_dirs`로 변환해 저장한 뒤 이 값을 `false`로 바꿉니다. 신규 설치는 건너뛰며 새 설정에는 `mm init --include-provider ...`를 사용합니다. | `true` 호환 기본값 |
| `MEMTOMEM_INDEXING__EXCLUDE_PATTERNS` | 내장 자격 증명 denylist(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**` 등) 위에 추가되는 `.gitignore` 구문 패턴 (JSON 리스트). 사용자 `!negation`으로 내장 패턴을 해제할 수 없음. | `[]` |
| `MEMTOMEM_INDEXING__TARGET_CHUNK_TOKENS` | 짧은 형제 섹션을 결합할 때의 목표 토큰 수. `0` 설정 시 결합 단계 비활성화. | `384` |
| `MEMTOMEM_INDEXING__CHUNK_OVERLAP_TOKENS` | 인접 청크 간 토큰 오버랩 | `0` |
| `MEMTOMEM_INDEXING__STRUCTURED_CHUNK_MODE` | JSON/YAML/TOML 청킹 모드: `original` 또는 `recursive` | `original` |
| `MEMTOMEM_INDEXING__PARAGRAPH_SPLIT_THRESHOLD` | 긴 산문을 문단 단위로 나누는 토큰 임계값 | `800` |
| `MEMTOMEM_INDEXING__STARTUP_BACKFILL` | 서버 시작 시 `memory_dirs`를 한 번 스캔해 서버가 꺼져 있던 동안 추가된 파일을 반영 | `false` |
| `MEMTOMEM_INDEXING__AUTO_SUMMARIZE` | LLM 설정 시 소스별 AI 요약 생성 | `false` |
| `MEMTOMEM_INDEXING__SUMMARY_LANGUAGE` | AI 소스 요약 출력 언어 | `en` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_INPUT_CHARS` | 요약 LLM에 전달하는 소스 문자 상한 | `3000` |
| `MEMTOMEM_INDEXING__SUMMARY_MAX_TOKENS` | 요약 출력 토큰 상한 | `256` |

### Namespace Policy Rules

경로 glob → 네임스페이스 매핑 규칙. 인덱싱 시점에 네임스페이스를 자동 할당하므로, `mem_index` 호출마다 `namespace=`를 지정할 필요가 없습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_NAMESPACE__RULES` | `{path_glob, namespace}` 객체로 구성된 JSON 리스트. `pathspec.GitIgnoreSpec` 패턴, 대소문자 구분 없음. `{parent}`와 `{ancestor:N}` 플레이스홀더는 일치한 파일 경로에서 치환됨. 해석 순서: 명시적 `namespace=` 인자 → 규칙(최초 매칭) → `enable_auto_ns` → `default_namespace`. | `[]` |
| `MEMTOMEM_NAMESPACE__DEFAULT_NAMESPACE` | 새 청크의 기본 네임스페이스 | `default` |
| `MEMTOMEM_NAMESPACE__ENABLE_AUTO_NS` | 명시 네임스페이스나 규칙이 없을 때 파일의 직계 부모 폴더명으로 네임스페이스 유도 | `false` |

예시 (`config.d/namespace.json`, APPEND 병합):

```json
{"namespace": {"rules": [
  {"path_glob": "docs/**", "namespace": "docs"},
  {"path_glob": "projects/{parent}/**", "namespace": "proj/{parent}"}
]}}
```

### Reranking

Cross-encoder 리랭킹은 기본적으로 로컬에서 동작하며, 외부 API 호출이 필요하지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_RERANK__ENABLED` | 하이브리드 검색 결과 리랭킹 활성화 | `false` |
| `MEMTOMEM_RERANK__PROVIDER` | `fastembed` (로컬 ONNX) / `cohere` (외부 API) | `fastembed` |
| `MEMTOMEM_RERANK__MODEL` | 모델명. 비영어 콘텐츠에는 `jinaai/jina-reranker-v2-base-multilingual` 권장. | `Xenova/ms-marco-MiniLM-L-6-v2` |
| `MEMTOMEM_RERANK__API_KEY` | `provider=cohere`일 때만 필요 | — |
| `MEMTOMEM_RERANK__OVERSAMPLE` | `response_top_k` 대비 풀 배수. 풀 크기 = `max(min_pool, min(max_pool, int(oversample * response_top_k)))`. | `2.0` |
| `MEMTOMEM_RERANK__MIN_POOL` | 하한선 — 리랭커가 받는 후보 수의 최솟값 | `20` |
| `MEMTOMEM_RERANK__MAX_POOL` | 상한선 — 큰 `top_k`에서 비용 폭주 방지 | `200` |
| `MEMTOMEM_RERANK__TOP_K` | deprecated legacy 풀 크기. 지정 시 `min_pool`로 마이그레이션 | `20` |

### Search

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SEARCH__DEFAULT_TOP_K` | 기본 검색 결과 수 | `10` |
| `MEMTOMEM_SEARCH__BM25_CANDIDATES` | BM25 후보군 크기 | `50` |
| `MEMTOMEM_SEARCH__DENSE_CANDIDATES` | 벡터 검색 후보군 크기 | `50` |
| `MEMTOMEM_SEARCH__RRF_K` | Reciprocal Rank Fusion 상수 | `60` |
| `MEMTOMEM_SEARCH__ENABLE_BM25` | 키워드 retriever 활성화 | `true` |
| `MEMTOMEM_SEARCH__ENABLE_DENSE` | 의미 벡터 retriever 활성화 | `true` |
| `MEMTOMEM_SEARCH__RRF_WEIGHTS` | `[BM25, Dense]` RRF 가중치 (JSON 리스트, REPLACE 병합) | `[1.0, 1.0]` |
| `MEMTOMEM_SEARCH__TOKENIZER` | FTS 토크나이저: `unicode61` 또는 `kiwipiepy` | `unicode61` |
| `MEMTOMEM_SEARCH__CACHE_TTL` | 검색 결과 캐시 TTL(초) | `30.0` |
| `MEMTOMEM_SEARCH__SYSTEM_NAMESPACE_PREFIXES` | 기본 `namespace=None` 검색에서 숨길 네임스페이스 접두사 (JSON 리스트, APPEND 병합) | `["archive:", "agent-runtime:"]` |

### Decay (시간 감쇠)

반감기 기반 시간 감쇠 가중. 인덱싱된 지 오래된 청크의 검색 점수를 점진적으로 낮춥니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_DECAY__ENABLED` | 시간 감쇠 가중 활성화 | `false` |
| `MEMTOMEM_DECAY__HALF_LIFE_DAYS` | 반감기 (일). 이 기간이 지나면 기여도가 절반으로 | `30.0` |

### MMR (다양성 재순위)

Maximal Marginal Relevance 재순위. 상위 결과 간 중복을 줄이고 서로 다른 관점을 섞습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_MMR__ENABLED` | MMR 다양성 재순위 활성화 | `false` |
| `MEMTOMEM_MMR__LAMBDA_PARAM` | 0.0–1.0. `0.0`=다양성 최대, `1.0`=관련성 최대 | `0.7` |

### Access (접근 빈도 가중)

자주 조회된 청크를 상위로 밀어 올리는 빈도 기반 배수.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_ACCESS__ENABLED` | 접근 빈도 기반 가중 활성화 | `false` |
| `MEMTOMEM_ACCESS__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |

### Importance (중요도 가중)

청크 메타데이터(태그 · 크기 · 위치 등)에서 파생된 중요도 점수를 검색 점수에 배수로 적용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_IMPORTANCE__ENABLED` | 중요도 가중 활성화 | `false` |
| `MEMTOMEM_IMPORTANCE__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |
| `MEMTOMEM_IMPORTANCE__WEIGHTS` | 중요도 피처 가중치 벡터 (JSON 리스트, REPLACE 병합) | `[0.3, 0.2, 0.3, 0.2]` |

### Query expansion (쿼리 확장)

원본 쿼리에 태그·헤딩·LLM 생성 용어를 추가해 재현율을 높입니다. `strategy=llm` 은 아래 LLM 섹션 설정을 사용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_QUERY_EXPANSION__ENABLED` | 쿼리 확장 활성화 | `false` |
| `MEMTOMEM_QUERY_EXPANSION__MAX_TERMS` | 추가 용어 최대 개수 | `3` |
| `MEMTOMEM_QUERY_EXPANSION__STRATEGY` | `tags` / `headings` / `both` / `llm` | `tags` |

### Context window (컨텍스트 윈도우)

검색 히트 주변의 ±N 인접 청크를 함께 반환하는 small-to-big retrieval. 파편화된 맥락을 회복할 때 유용합니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_CONTEXT_WINDOW__ENABLED` | 컨텍스트 윈도우 확장 활성화 | `false` |
| `MEMTOMEM_CONTEXT_WINDOW__WINDOW_SIZE` | 히트당 ±N 인접 청크 (`0`–`10`) | `2` |

### LLM (요약 · 쿼리 확장 백엔드)

`query_expansion.strategy=llm`, 통합 요약 등 LLM 기반 기능에서 공통으로 사용하는 백엔드 설정.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_LLM__ENABLED` | LLM 기반 기능 활성화 | `false` |
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / `anthropic` / 호환 엔드포인트 | `ollama` |
| `MEMTOMEM_LLM__MODEL` | 모델명. 빈 문자열이면 프로바이더별 기본값 | `""` |
| `MEMTOMEM_LLM__BASE_URL` | 엔드포인트 URL | `http://localhost:11434` |
| `MEMTOMEM_LLM__API_KEY` | API 키 (유료 프로바이더) | — |
| `MEMTOMEM_LLM__MAX_TOKENS` | 생성 토큰 상한 | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | 요청 타임아웃 (초) | `60.0` |

### Tool exposure

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (`mem_do` 라우터 포함 총 9개) / `standard` (`mem_do` 포함 38개) / `full` (99개 현행 도구 + deprecated 별칭 1개) | `core` |

### Web UI

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod` (Settings의 Namespaces를 포함한 표준 Simple/Advanced 페이지) / `dev` (Sessions · Search Runs · Quality Lab · Working Memory · Procedures · Health Report · Redaction 메인테이너 페이지도 추가). `mm web --mode` · `mm web --dev`가 실행 시 이 값을 덮어씁니다. | `prod` |
| `MEMTOMEM_WEB__HOST` | `mm web` 바인드 주소. `--host`가 덮어씁니다. | `127.0.0.1` |
| `MEMTOMEM_WEB__PORT` | `mm web` 바인드 포트. `--port`가 덮어씁니다. | `8080` |
| `MEMTOMEM_WEB__CSRF_ENFORCE` | Web UI 변경 엔드포인트의 CSRF 보호를 강제합니다. 비활성화는 긴급 롤백에만 사용합니다. | `true` |

### Lifecycle policies & webhooks

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_POLICY__ENABLED` | PolicyScheduler 실행 (auto_archive / auto_promote / auto_expire / auto_tag) | `false` |
| `MEMTOMEM_POLICY__SCHEDULER_INTERVAL_MINUTES` | 스케줄러 주기 | `60.0` |
| `MEMTOMEM_POLICY__MAX_ACTIONS_PER_RUN` | 스케줄된 policy 실행당 누적 액션 상한 | `100` |
| `MEMTOMEM_WEBHOOK__ENABLED` | 기억 이벤트용 외부 웹훅 활성화 | `false` |
| `MEMTOMEM_WEBHOOK__URL` | 웹훅 타깃 URL | — |
| `MEMTOMEM_WEBHOOK__EVENTS` | 전송 이벤트 유형 (JSON 리스트, APPEND 병합) | `["add", "delete", "search"]` |
| `MEMTOMEM_WEBHOOK__SECRET` | HMAC 서명용 시크릿 | — |
| `MEMTOMEM_WEBHOOK__TIMEOUT_SECONDS` | HTTP 타임아웃 | `10.0` |

### Consolidation schedule (통합 스케줄)

중복·유사 기억을 주기적으로 묶어 아카이브 요약으로 압축하는 백그라운드 잡.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__ENABLED` | 스케줄 실행 활성화 | `false` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__INTERVAL_HOURS` | 실행 주기 (시간) | `24.0` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MIN_GROUP_SIZE` | 통합 대상 최소 그룹 크기 | `3` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MAX_GROUPS` | 1회 실행당 처리 그룹 상한 | `10` |

### Warmup

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WARMUP__ENABLED` | MCP 서버 시작 시 로컬 임베딩·리랭커 모델을 백그라운드에서 미리 로드합니다. 원격 프로바이더는 건너뜁니다. | `false` |

### Health watchdog (상태 모니터)

주기적 헬스 체크, 고아 레코드 정리, 자동 유지보수를 수행하는 백그라운드 루프.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_HEALTH_WATCHDOG__ENABLED` | 상태 모니터 실행 | `false` |
| `MEMTOMEM_HEALTH_WATCHDOG__HEARTBEAT_INTERVAL_SECONDS` | 하트비트 주기 | `60.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DIAGNOSTIC_INTERVAL_SECONDS` | 진단 체크 주기 | `300.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DEEP_INTERVAL_SECONDS` | 딥 스캔 주기 | `3600.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__MAX_SNAPSHOTS` | 보관 스냅샷 수 상한 | `1000` |
| `MEMTOMEM_HEALTH_WATCHDOG__ORPHAN_CLEANUP_THRESHOLD` | 고아 레코드 정리 임계치 | `10` |
| `MEMTOMEM_HEALTH_WATCHDOG__AUTO_MAINTENANCE` | 자동 유지보수 수행 | `true` |

### Scheduler

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SCHEDULER__ENABLED` | 등록된 유지보수 job의 cron dispatch 활성화 | `false` |
| `MEMTOMEM_SCHEDULER__MAX_CONCURRENT_JOBS` | 동시에 실행할 scheduled job 상한 | `1` |
| `MEMTOMEM_SCHEDULER__DEFAULT_TIMEZONE` | 스케줄 타임존. Phase A는 `utc`만 적용 | `utc` |
| `MEMTOMEM_SCHEDULER__RUNNER_TIMEOUT_SECONDS` | scheduled job 1회 실행 타임아웃 | `300.0` |

### Session summary

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SESSION_SUMMARY__AUTO` | 충분한 청크가 추가된 상태에서 `mem_session_end` 호출 시 LLM 요약 자동 생성 | `true` |
| `MEMTOMEM_SESSION_SUMMARY__MIN_CHUNKS` | 자동 요약 실행 최소 청크 수 | `5` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_TOKENS` | 요약 출력 토큰 상한 | `500` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_INPUT_CHARS` | 조립된 입력이 이 크기를 넘으면 자동 요약 생략 | `60000` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_LINKS` | 요약 청크에서 원본 청크로 쓰는 링크 상한 | `50` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_LOOKUP_TOP_K` | 검색 rescue에 고려할 세션 요약 청크 수 | `3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_SCORE_THRESHOLD` | rescue 확장에 필요한 최소 요약 점수 | `0.3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_RESCUE_WEIGHT` | rescue된 source-file hit의 RRF 입력 가중치 | `0.5` |

### Session tracing (세션 실행 추적)

세션 명령 실행을 JSONL 파일과 (선택적으로) Langfuse로 추적합니다. 기본적으로 비활성화됩니다. `payload_mode`의 기본값은 `metadata`로, 페이로드 본문을 기록하지 않습니다. `redacted`는 시크릿을 가린 본문을 남기며, `full`은 전체 본문을 남깁니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_SESSION_TRACE__ENABLED` | 세션 실행 추적 활성화 | `false` |
| `MEMTOMEM_SESSION_TRACE__JSONL_ENABLED` | JSONL 싱크 기록 | `true` |
| `MEMTOMEM_SESSION_TRACE__JSONL_PATH` | JSONL 출력 파일 경로 | `~/.memtomem/traces/session-traces.jsonl` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_ENABLED` | Langfuse 싱크로 트레이스 전송 | `false` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_SESSION_TRACE__LANGFUSE_HOST` | Langfuse 호스트 URL | `""` |
| `MEMTOMEM_SESSION_TRACE__SAMPLING_RATE` | 0.0–1.0. 기록할 세션 비율 | `1.0` |
| `MEMTOMEM_SESSION_TRACE__PAYLOAD_MODE` | `metadata` (본문 미기록) / `redacted` (시크릿 마스킹 본문) / `full` (전체 본문) | `metadata` |
| `MEMTOMEM_SESSION_TRACE__MAX_PAYLOAD_CHARS` | 트레이스에 남기는 페이로드 문자 상한 | `10000` |

`langfuse_enabled=true`로 설정하려면 `langfuse` extra가 설치되어 있고 public/secret key가 모두 지정되어야 하며, 그렇지 않으면 시작 시점에 검증에 실패합니다.

### Logging

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | 로그 포맷 | — |

### Hooks / Context Gateway

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_HOOKS__TARGET_SCOPE` | memtomem 관리 Claude Code settings hook 대상 스코프: `user`, `project_shared`, `project_local` | `user` |
| `MEMTOMEM_CONTEXT_GATEWAY__KNOWN_PROJECTS_PATH` | Context Gateway용 Web UI 프로젝트 레지스트리 | `~/.memtomem/known_projects.json` |
| `MEMTOMEM_CONTEXT_GATEWAY__EXPERIMENTAL_CLAUDE_PROJECTS_SCAN` | `~/.claude/projects/<encoded>` 디렉터리명을 프로젝트 루트로 복원해 스캔(검증되지 않은 후보까지 포함) | `false` |
| `MEMTOMEM_CONTEXT_GATEWAY__AUTO_DISPLAY_CONFIGURED_PROJECTS` | 스캔 후보 중 인식된 런타임 마커(`.claude`/`.gemini`/`.codex`/`.agents`/`.kimi`/`.memtomem`)를 가진 프로젝트만 자동 표시 | `true` |

User 티어 쓰기는 명시적인 호스트 쓰기 확인으로 보호하며 `USER_TIER_ENABLED` 설정 필드는 없습니다.

### 고급 / 운영 경로

다음 프로세스 수준 변수는 계층형 `config.json` / `config.d` 모델에 포함되지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_WIKI_PATH` | 위키 저장소 위치 재정의 | `~/.memtomem-wiki` |
| `MEMTOMEM_FASTEMBED_CACHE` | ONNX / FastEmbed 모델 캐시 재정의 | 플랫폼 캐시 디렉터리 |
| `MEMTOMEM_INDEX_DEBOUNCE_QUEUE` | 파일 워처 debounce 큐 파일 재정의 | 상태 디렉터리 |

### 임베딩 프로바이더 비교

| 제공자 | GPU | 비용 | 비고 |
|---|---|---|---|
| `onnx` | 불필요 | 무료 | fastembed 기반 내장. 최초 실행 시 약 270MB 다운로드 |
| `ollama` | 불필요 | 무료 | Ollama 설치 필요. `ollama pull nomic-embed-text` |
| `openai` | 불필요 | 유료 | API 키 필요 |

> 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem/blob/main/docs/guides/configuration.md).

## STM (memtomem-stm) — 접두사 `MEMTOMEM_STM_`

STM 설정은 루트 필드와 `PROXY__*`, `SURFACING__*`, `FORMATION__*`, `HOOK__*`, `DAEMON__*`, `LANGFUSE__*`로 구성됩니다. 압축, 캐싱, 메트릭, 자동 인덱싱, 추출은 모두 **`PROXY__` 하위**에 위치합니다.

`~/.memtomem/stm_proxy.json`은 `ProxyConfig`만 로드합니다. 루트, surfacing, formation, hook, daemon, Langfuse 설정은 환경 변수/기본값 전용이므로 이 블록들을 JSON 파일에 넣어도 적용되지 않습니다. `proxy.consumer_model`이 surfacing 예산 계산으로 전파되는 동작만 문서화된 예외입니다.

### General

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_DATA_DIR` | daemon handshake, 소유권 잠금, 분리 실행 로그 디렉터리 | `~/.memtomem` |
| `MEMTOMEM_STM_LOG_LEVEL` | 로그 레벨 | `WARNING` |
| `MEMTOMEM_STM_LOG_FILE` | 선택적 회전 로그 파일. `0600` 권한, 2 MiB 회전, 백업 3개 사용 | 미설정 |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | `true`일 때 관찰/관리 도구 8개(`stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_selection_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_tuning_recommendations`)를 노출합니다. `false`에서도 모델용 도구 4개는 계속 보입니다. | `false` |
| `MEMTOMEM_STM_FORMATION__ENABLED` | opt-in `stm_memory_propose` 도구를 노출합니다. 노출 여부는 이 플래그만으로 결정되며, upstream LTM의 review-first 제안 지원 여부는 호출 시점에 확인합니다(지원하지 않으면 `formation_unsupported` 반환). | `false` |
| `MEMTOMEM_STM_FORMATION__MAX_CONTENT_CHARS` | review-first 후보 콘텐츠 최대 길이. 초과 제안은 거부 | `2000` |

### Proxy

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__ENABLED` | 프록시 파이프라인 마스터 스위치 | `false` |
| `MEMTOMEM_STM_PROXY__CONFIG_PATH` | 프록시 JSON 설정 경로 | `~/.memtomem/stm_proxy.json` |
| `MEMTOMEM_STM_PROXY__UPSTREAM_SERVERS` | 전체 upstream 서버 맵(JSON object). 일반적으로 파일 설정이 관리하기 쉽습니다. | `{}` |
| `MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION` | 기본 압축 전략 | `auto` |
| `MEMTOMEM_STM_PROXY__DEFAULT_MAX_RESULT_CHARS` | 응답당 문자 예산 | `16000` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_CHARS` | 업스트림 응답 크기 OOM 가드 | `10000000` |
| `MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION` | 보존 하한 (0.0–1.0) | `0.65` |
| `MEMTOMEM_STM_PROXY__MAX_DESCRIPTION_CHARS` | 광고되는 도구 설명 최대 길이 | `200` |
| `MEMTOMEM_STM_PROXY__STRIP_SCHEMA_DESCRIPTIONS` | 광고되는 도구의 중첩 JSON schema 설명 제거 | `false` |
| `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY` | 관련성 스코어링용 선택적 `_context_query` 인자 광고 | `false` |
| `MEMTOMEM_STM_PROXY__CONSUMER_MODEL` | 컨텍스트 윈도우 예산 계산에 쓰는 클라이언트 모델 식별자 | `""` |
| `MEMTOMEM_STM_PROXY__CONTEXT_BUDGET_RATIO` | 프록시 결과에 허용할 consumer 컨텍스트 윈도우 비율 | `0.05` |
| `MEMTOMEM_STM_PROXY__CHARS_PER_TOKEN` | 토큰 예산용 정적 문자/토큰 추정치 | `3.5` |
| `MEMTOMEM_STM_PROXY__TOKEN_ESTIMATION_MODE` | 토큰 추정 모드: `static` 또는 유니코드 인식 `unicode` | `static` |

### Proxy → Cache

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | 응답 캐싱 활성화 | `true` |
| `MEMTOMEM_STM_PROXY__CACHE__DEFAULT_TTL_SECONDS` | 캐시 TTL | `3600` |
| `MEMTOMEM_STM_PROXY__CACHE__DB_PATH` | 캐시 DB 경로 | `~/.memtomem/proxy_cache.db` |
| `MEMTOMEM_STM_PROXY__CACHE__MAX_ENTRIES` | 캐시 엔트리 상한 | `10000` |
| `MEMTOMEM_STM_PROXY__CACHE__TOOL_ANNOTATION_POLICY` | MCP 도구 annotation의 캐시 적용 정책: `conservative`, `strict`, `ignore` | `conservative` |

캐시 schema 4는 `structuredContent`와 `_meta`를 포함한 정규 MCP 콘텐츠 envelope을 저장합니다. 호환되지 않는 구 schema를 발견하면 혼합 envelope을 제공하지 않고 문서화된 1회성 캐시 초기화를 수행합니다.

### Proxy → Auto-Index (Stage 4)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__ENABLED` | 도구 응답을 LTM으로 인덱싱 | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | 인덱싱을 요청 경로 외부의 백그라운드에서 실행 | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | 인덱싱 대상 최소 응답 크기 | `2000` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | 출력 디렉터리 | `~/.memtomem/proxy_index` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | 자동 인덱싱 기억의 네임스페이스 | `proxy-{server}` |

기본 제공되는 `mms` 서버는 설계상 LTM에서 읽기만 하고 LTM으로 다시 쓰지 않습니다. 따라서 `auto_index`와 extraction 필드는 유효한 설정으로 수용되지만 실제 동작에는 영향을 주지 않습니다.

### Proxy → Extraction

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (사실 추출) | `false` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__STRATEGY` | 추출 전략: `none`, `llm`, `heuristic`, `hybrid` | `llm` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PROVIDER` | 추출 LLM 프로바이더: `openai`, `anthropic`, `ollama` | `openai` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MODEL` | 추출 LLM 모델 | `gpt-4.1-mini` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__API_KEY` | 추출 LLM API 키 | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__BASE_URL` | 추출 LLM 엔드포인트 재정의 | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__SYSTEM_PROMPT` | 추출 system prompt 템플릿 | 내장 템플릿 |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MAX_TOKENS` | 추출 LLM 출력 토큰 상한 | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__LLM_TIMEOUT_SECONDS` | 추출 LLM 타임아웃 | `60.0` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PRIVACY_SCAN_ENABLED` | 원격 추출 LLM 전송 전 콘텐츠 검사 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_FACTS` | 응답당 추출 사실 수 상한 | `10` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MIN_RESPONSE_CHARS` | 추출 대상 최소 응답 길이 | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__DEDUP_THRESHOLD` | 추출 사실 유사도 임계값 | `0.92` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MEMORY_DIR` | 추출 사실 출력 디렉터리 | `~/.memtomem/extracted_facts` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__NAMESPACE` | 추출 사실 네임스페이스 템플릿 | `facts-{server}` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__BACKGROUND` | 요청 경로 밖에서 추출 실행 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_INPUT_CHARS` | 추출에 사용하는 응답 텍스트 상한 | `20000` |

### Proxy → Metrics / feedback / relevance scorer

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | 호출 메트릭 기록 | `true` |
| `MEMTOMEM_STM_PROXY__METRICS__DB_PATH` | 프록시 메트릭 SQLite 경로 | `~/.memtomem/proxy_metrics.db` |
| `MEMTOMEM_STM_PROXY__METRICS__MAX_HISTORY` | 메트릭 행 보관 상한 | `10000` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | 스코어러 백엔드 | — |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_PROVIDER` | 의미 기반 관련성 스코어링 임베딩 프로바이더 | `ollama` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_MODEL` | 관련성 임베딩 모델 | `nomic-embed-text` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_BASE_URL` | 관련성 임베딩 엔드포인트 | 미설정 |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_TIMEOUT` | 관련성 임베딩 요청 타임아웃 | `10.0` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | `stm_compression_feedback` 기록 | `true` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__DB_PATH` | 압축 피드백 SQLite 경로 | `~/.memtomem/stm_feedback.db` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__RETENTION_DAYS` | 압축 피드백 보존 일수 | `90` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | 점진적 전달 읽기 텔레메트리 기록 (`stm_progressive_stats`로 노출) | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__DB_PATH` | 점진적 읽기 telemetry SQLite 경로 | `~/.memtomem/stm_feedback.db` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__RETENTION_DAYS` | 점진적 읽기 telemetry 보존 일수 | `90` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | 내부 락 획득 상한. 타임아웃 시 느린 업스트림이 아닌 데드락/멈춘 홀더 신호로 취급 | `30.0` |

### Proxy → Tool exposure (도구 노출 필터)

업스트림이 제공하는 도구 중 어떤 것을 에이전트에게 광고할지 도구 광고 시점에 결정하는 STM 자체 필터입니다. 실패가 잦거나 자격 증명을 노출하거나 이름이 중복되는 도구를 광고 대상에서 제외합니다. 건강 신호는 프록시 시작 시 한 번 평가되어 세션 동안 광고 집합이 안정적으로 유지됩니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXPOSURE__PROFILE` | `strict`(신호 규칙으로 하드 차단) / `review`(차단 대신 랭킹에서 강등하고 telemetry에 기록) / `explore`(신호 규칙 비활성화) | `strict` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_WINDOW_HOURS` | 도구별 건강도 판정에 사용하는 메트릭 조회 윈도우(시간) | `24.0` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_MIN_CALLS` | 건강도를 판정하기 위한 윈도우 내 최소 호출 수. 미만이면 건강한 것으로 간주 | `5` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_ERROR_RATE_THRESHOLD` | 이 이상의 업스트림 귀책 오류율에서 도구를 unhealthy로 표시 | `0.95` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__REVIEW_RISK_PENALTY` | `review` 프로파일에서 신호 표시된 도구에 적용하는 랭킹 강등 배수 | `0.5` |

### Proxy → Selection telemetry / Tool relevance (선택 텔레메트리 · 도구 랭킹)

프록시 호출마다 선택·실행 기록을 JSONL로 남기고, 광고된 도구 집합을 호출 신호 기준으로 BM25 랭킹합니다. 랭킹은 telemetry에만 기록되며 노출 자체는 바꾸지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__ENABLED` | 호출당 selection/execution JSONL 기록 활성화 | `false` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__PATH` | JSONL 로그 경로 | `~/.memtomem/stm_selection_log.jsonl` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__SAMPLE_RATE` | 0.0–1.0. 기록할 호출 비율 | `1.0` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BYTES` | 로그 회전 크기 임계값 | `50000000` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BACKUPS` | 보관할 회전 파일 수 (`0`은 잘라내기) | `3` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__ENABLED` | 호출당 도구 BM25 랭킹 기록. `selection_telemetry`가 켜져 있어야 실제로 기록됨 | `true` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__TOP_N` | selection 이벤트당 기록하는 랭킹 후보 수 | `20` |

### Proxy → Tool-graph eligibility (외부 도구 그래프, 선택)

별도의 도구 그래프 MCP 서버에 cross-server 권한·데이터 흐름 적격성을 질의해 노출 필터의 추가 규칙으로 사용합니다. 기본적으로 비활성화이며, 그래프 서버는 proxy하지 않고 consult만 합니다(클라이언트는 그래프의 도구를 보지 않음).

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENABLED` | 외부 도구 그래프 적격성 제공자 활성화 | `false` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SOURCE` | 정책 출처: 실시간 `stdio` consult 또는 서명된 `bundle` 파일 | `stdio` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__BUNDLE_PATH` | `source=bundle`일 때 로컬 정책 bundle 경로 | `~/.memtomem/toolgraph/policy-bundle.json` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__COMMAND` | stdio 도구 그래프 MCP 서버 실행 명령어 | `toolgraph` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ARGS` | 명령어 인자 (JSON 리스트) | `["serve"]` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENV` | 그래프 서버용 추가 환경 변수(예: `NEO4J_*`, JSON object) | `null` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__AGENT_ID` | 그래프에 등록된, 적격성을 판정할 에이전트 식별자 | `stm-proxy` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SERVER_NAME_MAP` | STM upstream 이름을 그래프 서버 식별자로 매핑(JSON object) | `{}` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__QUERY_PROFILE` | 그래프 consult에 전달하는 프로파일 | `strict` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_UNREACHABLE` | 그래프 도달 불가 시: `open`(STM 자체 규칙으로 광고) / `closed`(그래프 승인 외 전부 보류) | `open` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_TOOL_NOT_FOUND` | 그래프에 없는 후보 도구: `open` / `closed` | `open` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_AGENT_NOT_FOUND` | `agent_id` 미등록(대개 오타): `fail_start` / `open` / `closed` | `fail_start` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_PROTOCOL_ERROR` | 그래프 응답 규약 위반: `fail_start` / `open` / `closed` | `fail_start` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__RISK_PENALTY_SCALE` | 적격하지만 위험한 도구의 랭킹 강등 배수 | `1.0` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__TIMEOUT_SECONDS` | consult 타임아웃 | `5.0` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_ENABLED` | consult 결과를 디스크 캐시 | `true` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_PATH` | consult 캐시 SQLite 경로 | `~/.memtomem/toolgraph_consult.db` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_MAX_SCOPES` | 캐시할 도구 집합 scope 상한 | `64` |

타입이 지정된 `backend_unavailable` 결과는 `on_unreachable`을 따르고, 알 수 없거나 형식이 잘못된 결과 envelope은 `on_protocol_error`를 따릅니다.

### Per-upstream (`UpstreamServerConfig`)

아래 필드는 `~/.memtomem/stm_proxy.json`의 업스트림 항목(`UpstreamServerConfig`)에 **서버별로** 설정합니다(개별 scalar 환경 변수가 아님). 허용되는 모든 필드를 나열합니다.

| 필드 | 설명 | 기본값 |
|---|---|---|
| `command` | stdio 서버 실행 파일 | `""` |
| `args` | stdio 서버 인자 | `[]` |
| `env` | 서버 추가 환경 변수 | `null` |
| `cwd` | 서버 작업 디렉터리 | `null` |
| `prefix` | 조합된 도구 이름에 쓰는 필수 네임스페이스 구간 | 필수 |
| `transport` | `stdio`, `sse`, `streamable_http` | `stdio` |
| `url` | 네트워크 transport 엔드포인트 | `""` |
| `headers` | 네트워크 transport 정적 헤더 | `null` |
| `compression` | 이 upstream의 기본 압축 전략 | `auto` |
| `max_result_chars` | 결과 문자 예산 | `8000` |
| `max_result_tokens` | 선택적 토큰 환산 결과 예산 | `null` |
| `chars_per_token` | upstream별 문자/토큰 추정치 | `null`(proxy 상속) |
| `token_estimation_mode` | 선택적 `static` / `unicode` 추정기 재정의 | `null`(proxy 상속) |
| `retention_floor` | 선택적 최소 압축 보존 비율 | `null`(proxy 상속) |
| `llm` | upstream별 LLM 압축 설정 | `null` |
| `selective` | selective 압축 설정 | `null` |
| `hybrid` | hybrid 압축 설정 | `null` |
| `progressive` | 커서 기반 점진 전달 설정 | `null` |
| `cleaning` | 압축 전 cleaning 설정 | `null` |
| `tool_overrides` | 도구별 `ToolOverrideConfig` 맵 | `{}` |
| `auto_index` | 전역 accepted compatibility 설정 재정의 | `null` |
| `extraction` | 전역 accepted compatibility 설정 재정의 | `null` |
| `cache` | 응답 캐시 재정의 | `null` |
| `cache_ttl_seconds` | 응답 캐시 TTL 재정의 | `null` |
| `expose_in_profiles` | upstream을 허용할 exposure 프로파일 | `null` |
| `surfacing_enabled` | 이 업스트림의 응답을 능동적 서피싱 대상에 포함할지 여부. `false`이면 해당 서버의 모든 도구에서 서피싱을 생략 | `true` |
| `max_retries` | 최초 시도 뒤 reconnect/call 재시도 횟수 | `3` |
| `reconnect_delay_seconds` | 최초 재연결 지연 | `1.0` |
| `max_reconnect_delay_seconds` | 재연결 backoff 상한 | `30.0` |
| `connect_timeout_seconds` | upstream 연결 타임아웃 | `30.0` |
| `call_timeout_seconds` | `session.call_tool()` 시도당 타임아웃. 초과 시 세션을 강제 리셋하고 재시도 루프로 복귀 | `90.0` |
| `overall_deadline_seconds` | 재시도 포함 단일 호출의 전체 벽시계 예산. `call_timeout × (max_retries+1)` 최악값 폭주 방지 | `180.0` |
| `circuit_max_failures` | 이 upstream의 회로를 열기 전 실패 횟수 | `3` |
| `circuit_reset_seconds` | 열린 회로 reset 간격 | `60.0` |
| `max_description_chars` | upstream별 도구 설명 상한 | `200` |
| `strip_schema_descriptions` | upstream별 중첩 schema 설명 제거 | `false` |
| `origin` | `mms add --import`/`mms init`이 기록하고 `mms eject`가 사용하는 import provenance 블록. CLI JSON 출력은 저장된 원본 항목을 redaction 처리합니다. | `null` |

#### 압축 하위 설정

upstream 및 해당하는 경우 `tool_overrides.<tool>` 항목 안에서 같은 하위 설정 구조를 사용합니다.

| 블록 / 필드 | 설명 | 기본값 |
|---|---|---|
| `llm.provider` | `openai`, `anthropic`, `ollama` | `openai` |
| `llm.model` | 요약 모델 | `gpt-4.1-mini` |
| `llm.api_key` | 프로바이더 API 키 | `""` |
| `llm.base_url` | 프로바이더 엔드포인트 재정의 | `""` |
| `llm.system_prompt` | `{max_chars}`를 포함하는 요약 prompt 템플릿 | 내장 템플릿 |
| `llm.max_tokens` | 요약 출력 토큰 상한 | `500` |
| `llm.llm_timeout_seconds` | 요약 타임아웃. 초과 시 `truncate`로 fallback | `60.0` |
| `llm.privacy_scan_enabled` | 원격 LLM 호출 전 검사 | `true` |
| `selective.max_pending` | 진행 중 selection 기록 상한 | `100` |
| `selective.pending_ttl_seconds` | pending selection TTL | `300.0` |
| `selective.json_depth` | JSON outline 깊이 | `1` |
| `selective.min_section_chars` | 유지할 섹션 최소 길이 | `50` |
| `selective.pending_store` | `memory` 또는 `sqlite` | `memory` |
| `selective.pending_store_path` | pending selection SQLite 경로 | `~/.memtomem/pending_selections.db` |
| `hybrid.head_chars` | 선두 콘텐츠 선호 예산 | `5000` |
| `hybrid.tail_mode` | `toc` 또는 `truncate` | `toc` |
| `hybrid.min_toc_budget` | 목차 최소 예산 | `200` |
| `hybrid.min_head_chars` | 선두 콘텐츠 최소 예산 | `100` |
| `hybrid.head_ratio` | 선두 콘텐츠 배분 비율 | `0.6` |
| `progressive.chunk_size` | progressive 청크당 문자 수 | `4000` |
| `progressive.max_stored` | pending progressive payload 상한 | `200` |
| `progressive.ttl_seconds` | pending payload TTL | `1800.0` |
| `progressive.include_structure_hint` | 남은 콘텐츠 구조 메타데이터 포함 | `true` |
| `cleaning.enabled` | cleaning 단계 활성화 | `true` |
| `cleaning.strip_html` | HTML 마크업 제거 | `true` |
| `cleaning.deduplicate` | 중복 블록 제거 | `true` |
| `cleaning.collapse_links` | 장황한 링크 축약 | `true` |

#### 도구별 재정의

각 `tool_overrides.<tool>`은 `compression`, `max_result_chars`, `max_result_tokens`, `chars_per_token`, `token_estimation_mode`, `retention_floor`와 위의 `llm`, `selective`, `hybrid`, `progressive`, `cleaning` 블록을 받습니다. 다음 필드도 모두 받습니다.

| 필드 | 설명 | 기본값 |
|---|---|---|
| `auto_index` | accepted auto-index compatibility 설정 재정의 | `null` |
| `extraction` | accepted extraction compatibility 설정 재정의 | `null` |
| `cache` | 캐시 재정의 | `null` |
| `cache_ttl_seconds` | 캐시 TTL 재정의 | `null` |
| `hidden` | 이 도구를 광고하지 않음 | `false` |
| `description_override` | 광고되는 설명 교체 | `null` |
| `expose_in_profiles` | 이 도구를 허용할 exposure 프로파일 | `null` |

### Surfacing (Stage 3)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | LTM 기반 능동적 서피싱 활성화 | `true` |
| `MEMTOMEM_STM_SURFACING__USE_DAEMON` | standalone surfacing을 공용 daemon으로 라우팅. 별도 private fallback 없음 | `false` |
| `MEMTOMEM_STM_SURFACING__WARMUP_ENABLED` | LTM 클라이언트를 백그라운드에서 warmup | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DB_PATH` | surfacing 피드백과 dedup SQLite 경로 | `~/.memtomem/stm_feedback.db` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | 관련성 최소 점수 | `0.03` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | 호출당 주입되는 최대 기억 수 | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | 매우 작은 응답에는 서피싱 생략 | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | 추출 쿼리의 최소 토큰 수 | `3` |
| `MEMTOMEM_STM_SURFACING__COOLDOWN_SECONDS` | 반복 surfacing 작업 사이 최소 간격 | `5.0` |
| `MEMTOMEM_STM_SURFACING__TIMEOUT_SECONDS` | LTM surfacing 요청 타임아웃 | `3.0` |
| `MEMTOMEM_STM_SURFACING__INJECTION_MODE` | 배치 위치: `prepend`, `append`, `section` | `append` |
| `MEMTOMEM_STM_SURFACING__SECTION_HEADER` | `section` 주입 모드에서 사용할 제목 | `## Relevant Memories` |
| `MEMTOMEM_STM_SURFACING__DEFAULT_NAMESPACE` | 도구 규칙이 덮어쓰지 않을 때의 선택적 네임스페이스 | 미설정 |
| `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS` | 도구 이름 denylist(JSON 리스트) | `[]` |
| `MEMTOMEM_STM_SURFACING__WRITE_TOOL_PATTERNS` | 기본적으로 surfacing하지 않을 쓰기 도구 패턴(JSON 리스트) | `*write*`, `*create*`, `*delete*`, `*push*`, `*send*`, `*remove*` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_TOOLS` | 도구별 `enabled`, `query_template`, `namespace`, `min_score`, `max_results` 재정의(JSON object) | `{}` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | 세션 간 중복 제거 윈도우 | `604800` (7일) |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | `stm_surfacing_feedback` 수용 | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_SURFACINGS_PER_MINUTE` | 프로세스 로컬 surfacing 속도 제한 | `15` |
| `MEMTOMEM_STM_SURFACING__CACHE_TTL_SECONDS` | 프로세스 내 surfacing 결과 캐시 TTL | `60.0` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_MAX_FAILURES` | 회로를 열기 전 연속 LTM 실패 횟수 | `3` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_RESET_SECONDS` | 열린 회로 reset 간격 | `60.0` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | 도구별 임계값 자동 튜닝 | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_MIN_SAMPLES` | 튜닝 전 최소 피드백 샘플 수 | `20` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_INCREMENT` | 임계값 조정 단위 | `0.002` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_FLOOR` | 기본 자동 튜닝 하한. 명시적 `min_score`를 포함하도록 검증 시 확장 | `0.005` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_CEILING` | 기본 자동 튜닝 상한. 명시적 `min_score`를 포함하도록 검증 시 확장 | `0.05` |
| `MEMTOMEM_STM_SURFACING__INCLUDE_SESSION_CONTEXT` | 생성 쿼리에 사용 가능한 세션 컨텍스트 포함 | `true` |
| `MEMTOMEM_STM_SURFACING__FIRE_WEBHOOK` | surfacing 결과에 대해 LTM의 설정된 webhook 실행 요청 | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_INJECTION_CHARS` | 주입되는 기억 전체 문자 상한 | `3000` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_WINDOW_SIZE` | 각 hit 주변에서 요청할 LTM 인접 청크 수 | `0` |
| `MEMTOMEM_STM_SURFACING__RESULT_CONTENT_MAX_CHARS` | structured 결과당 콘텐츠 상한 | `500` |
| `MEMTOMEM_STM_SURFACING__PREVIEW_MAX_CHARS` | compact 미리보기당 콘텐츠 상한 | `300` |
| `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` | 피드백 DB의 원문 쿼리 텍스트 보존 일수. 이후 column만 비움. `0`은 cleanup 비활성화 | `30` |
| `MEMTOMEM_STM_SURFACING__STATS_RETENTION_DAYS` | 집계 surfacing 통계 보존 일수 | `90` |
| `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT` | `true`면 원문 쿼리 저장, `false`면 `sha256:<16-hex>` digest 저장 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_ENABLED` | 반복 negative feedback을 받은 기억을 주입 전에 로컬 필터링 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_NEGATIVE_THRESHOLD` | 로컬 demotion 적용 전 필요한 서로 다른 negative surfacing 이벤트 수 | `3` |
| `MEMTOMEM_STM_SURFACING__CONSUMER_MODEL` | surfacing 전용 consumer 모델. 빈 값이면 `proxy.consumer_model` 상속 | `""` |
| `MEMTOMEM_STM_SURFACING__RESULT_FORMAT` | LTM 응답 모드: `compact` 또는 `structured` | `structured` |
| `MEMTOMEM_STM_SURFACING__RERANK` | LTM에 surfacing 후보 rerank를 요청할지 여부. `null`이면 LTM 설정에 위임 | `false` |
| `MEMTOMEM_STM_SURFACING__SCALE_GATED_MIN_SCORE` | 최소 점수 gate 전에 `score_scale` 인식 정규화 적용 | `true` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT` | LTM MCP 전송: `stdio`, `sse`, `streamable_http` | `stdio` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | stdio 전송에서 LTM 서버를 실행할 MCP 명령어 | `memtomem-server` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | LTM 명령어 인자 (JSON 리스트) | `[]` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_URL` | `sse` / `streamable_http` LTM 엔드포인트 URL | `""` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS` | 네트워크 LTM 전송용 정적 헤더(JSON object) | `null` |

Surfacing은 STM을 통해 라우팅된 호출 또는 지원되는 host hook에만 적용됩니다. provider memory 계층이 아니며 관계없는 직접 MCP 호출에 조용히 주입되지 않습니다.

### Hook / Daemon

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_HOOK__USE_DAEMON` | `mms hook` 서피싱을 매번 새로 띄우는 in-process 경로 대신 상주 로컬 daemon으로 처리 | `true` |
| `MEMTOMEM_STM_HOOK__DAEMON_TIMEOUT_SECONDS` | hook-to-daemon 왕복 타임아웃 | `2.5` |
| `MEMTOMEM_STM_HOOK__FALLBACK` | daemon 미가용 시 동작: `skip`(건너뜀) 또는 `cold`(in-process 경로로 처리) | `skip` |
| `MEMTOMEM_STM_HOOK__AUTO_SPAWN` | 첫 적격 hook 호출에서 daemon을 비동기로 기동(응답을 기다리지 않음) | `true` |
| `MEMTOMEM_STM_HOOK__RECORD_FEEDBACK_EVENTS` | hook 서피싱 피드백/쿼리 이벤트 저장. 기본값은 dedup만 유지하고 원문 쿼리 텍스트는 저장하지 않음 | `false` |
| `MEMTOMEM_STM_HOOK__METRICS_ENABLED` | 크기/시간만 포함하는 hook 메트릭 기록 | `true` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED` | built-in Bash `updatedToolOutput` 압축 활성화 | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MAX_CHARS` | Bash output replacement 대상 문자 예산 | `16000` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MIN_RETENTION` | built-in Bash 출력 압축의 최소 보존 비율 | `0.65` |
| `MEMTOMEM_STM_HOOK_SURFACE_TOOLS` | 중첩 설정 모델과 별도로 직접 읽는 쉼표 구분 canonical hook 도구 allowlist. Host adapter가 Claude `Read` / `Bash` 같은 이름을 `read` / `shell`로 매핑합니다. | `read,grep,glob,shell` |
| `MEMTOMEM_STM_DAEMON__HOST` | 로컬 daemon bind 주소. 루프백 전용 유지 권장 | `127.0.0.1` |
| `MEMTOMEM_STM_DAEMON__ALLOW_NON_LOOPBACK` | 비루프백 daemon bind 주소 명시적 허용 | `false` |
| `MEMTOMEM_STM_DAEMON__IDLE_TIMEOUT_SECONDS` | 이 초 동안 idle이면 daemon 중지. `0`은 idle shutdown 비활성화 | `900.0` |
| `MEMTOMEM_STM_DAEMON__MAX_PENDING_REQUESTS` | 승인할 hook 및 standalone surfacing 요청 수 제한 | `32` |

### Langfuse (관측성)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | 스팬 전송 | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | — |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | — |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse 호스트 URL | — |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1.0` |

`MEMTOMEM_STM_LANGFUSE__ENABLED=true` 로 설정했는데 `[langfuse]` extra 가 설치되어 있지 않으면 시작 시점에 `ValueError` 로 실패합니다(v0.1.16 이후 fail-fast). 먼저 extra 를 설치하거나 `enabled=false` 로 두세요 — 기존의 "조용히 비활성화 + WARNING" 동작은 제거되었으므로, 설정 오타로 트레이싱이 말없이 꺼지는 일은 없습니다.

### 압축 전략 (`MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION`)

| 전략 | 용도 |
|---|---|
| `auto` | 기본값 — 콘텐츠 유형별 자동 선택 |
| `hybrid` | Markdown (구조 보존 + 비핵심 섹션 축약) |
| `selective` | 쿼리 관련 섹션만 유지 |
| `progressive` | 대용량 콘텐츠, 커서 기반 분할 전송 (무손실) |
| `extract_fields` | JSON 딕셔너리 |
| `schema_pruning` | 대형 JSON 배열 |
| `skeleton` | API 문서 (스키마만 유지) |
| `llm_summary` | LLM 기반 요약 (OpenAI / Anthropic / Ollama) |
| `truncate` | 폴백 절삭 |
| `none` | 패스스루 |

> 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md).
