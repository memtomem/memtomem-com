---
title: 환경 변수
description: memtomem LTM 및 STM 환경 변수 설정 레퍼런스.
---

memtomem (LTM)과 memtomem-stm (STM)은 모두 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) 기반으로 `env_prefix` + `env_nested_delimiter="__"`를 사용합니다. **중첩 설정에는 이중 언더스코어**를 사용합니다 — `MEMTOMEM_EMBEDDING__PROVIDER`(가능), `MEMTOMEM_EMBEDDING_PROVIDER`(불가).

우선순위(높은 순): CLI 플래그 → 환경 변수 → 설정 파일 → 내장 기본값.

## LTM (memtomem) — 접두사 `MEMTOMEM_`

이 공개 레퍼런스는 `memtomem` 0.2.2 설정 표면을 기준으로 합니다.

### Storage

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STORAGE__BACKEND` | 스토리지 백엔드 | `sqlite` |
| `MEMTOMEM_STORAGE__SQLITE_PATH` | SQLite 데이터베이스 파일 경로 | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_STORAGE__COLLECTION_NAME` | 논리 컬렉션 이름 | `memories` |

### Embedding

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_EMBEDDING__PROVIDER` | `none` / `onnx` / `ollama` / `openai` | `none` (마법사 실행 전까지 키워드 검색만 사용) |
| `MEMTOMEM_EMBEDDING__MODEL` | 선택된 프로바이더의 모델명 | `""` |
| `MEMTOMEM_EMBEDDING__DIMENSION` | 벡터 차원 수 (모델과 일치해야 함) | 프로바이더별 상이 |
| `MEMTOMEM_EMBEDDING__BASE_URL` | Ollama / OpenAI 호환 엔드포인트 | — |
| `MEMTOMEM_EMBEDDING__API_KEY` | 유료 프로바이더용 API 키 | — |
| `MEMTOMEM_EMBEDDING__BATCH_SIZE` | 임베딩 배치당 텍스트 수 | `64` |
| `MEMTOMEM_EMBEDDING__MAX_CONCURRENT_BATCHES` | 병렬 임베딩 배치 상한 | `4` |
| `MEMTOMEM_EMBEDDING__THREADS` | ONNX Runtime 스레드 상한 (`0` = ORT 기본값) | `4` |
| `MEMTOMEM_EMBEDDING__PROGRESS_THRESHOLD` | 한 파일이 이 값보다 많은 청크를 만들 때만 청크별 진행 이벤트를 보냄. `0`은 항상 보냄 | `32` |

### Indexing

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_INDEXING__MEMORY_DIRS` | `mm server` 파일 워처가 반응형으로 재인덱싱하는 디렉터리 (JSON 리스트). 기존 파일은 자동 스캔되지 않으므로 `mm index <dir>` 로 한 번 시드한 뒤 워처에 맡기세요. `mm init`에서 AI 에이전트 기억 등록을 선택하면 경로가 채워집니다. | `["~/.memtomem/memories"]` + 선택한 provider 폴더 |
| `MEMTOMEM_INDEXING__PROJECT_MEMORY_DIRS` | `.memtomem/memories` 또는 `.memtomem/memories.local` 아래의 프로젝트 티어 기억 루트 | `[]` |
| `MEMTOMEM_INDEXING__SUPPORTED_EXTENSIONS` | 인덱싱 대상 파일 확장자 (JSON 리스트) | `[".md", ".json", ".yaml", ".yml", ".toml", ".py", ".js", ".ts", ".tsx", ".jsx"]` |
| `MEMTOMEM_INDEXING__MAX_CHUNK_TOKENS` | 청크당 최대 토큰 수 | `512` |
| `MEMTOMEM_INDEXING__MIN_CHUNK_TOKENS` | 짧은 청크 병합 임계값 | `128` |
| `MEMTOMEM_INDEXING__AUTO_DISCOVER` | `true`인 경우, `mm init`이 AI 에이전트 기억 디렉터리를 `memory_dirs`에 등록할지 질의합니다. `false` 설정 시 프롬프트 비활성화. | `true` |
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

| Variable | Description | Default |
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

| Variable | Description | Default |
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

| Variable | Description | Default |
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

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_DECAY__ENABLED` | 시간 감쇠 가중 활성화 | `false` |
| `MEMTOMEM_DECAY__HALF_LIFE_DAYS` | 반감기 (일). 이 기간이 지나면 기여도가 절반으로 | `30.0` |

### MMR (다양성 재순위)

Maximal Marginal Relevance 재순위. 상위 결과 간 중복을 줄이고 서로 다른 관점을 섞습니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_MMR__ENABLED` | MMR 다양성 재순위 활성화 | `false` |
| `MEMTOMEM_MMR__LAMBDA_PARAM` | 0.0–1.0. `0.0`=다양성 최대, `1.0`=관련성 최대 | `0.7` |

### Access (접근 빈도 가중)

자주 조회된 청크를 상위로 밀어 올리는 빈도 기반 배수.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_ACCESS__ENABLED` | 접근 빈도 기반 가중 활성화 | `false` |
| `MEMTOMEM_ACCESS__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |

### Importance (중요도 가중)

청크 메타데이터(태그 · 크기 · 위치 등)에서 파생된 중요도 점수를 검색 점수에 배수로 적용합니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_IMPORTANCE__ENABLED` | 중요도 가중 활성화 | `false` |
| `MEMTOMEM_IMPORTANCE__MAX_BOOST` | 점수 배수 상한 (`>= 1.0`) | `1.5` |
| `MEMTOMEM_IMPORTANCE__WEIGHTS` | 중요도 피처 가중치 벡터 (JSON 리스트, REPLACE 병합) | `[0.3, 0.2, 0.3, 0.2]` |

### Query expansion (쿼리 확장)

원본 쿼리에 태그·헤딩·LLM 생성 용어를 추가해 재현율을 높입니다. `strategy=llm` 은 아래 LLM 섹션 설정을 사용합니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_QUERY_EXPANSION__ENABLED` | 쿼리 확장 활성화 | `false` |
| `MEMTOMEM_QUERY_EXPANSION__MAX_TERMS` | 추가 용어 최대 개수 | `3` |
| `MEMTOMEM_QUERY_EXPANSION__STRATEGY` | `tags` / `headings` / `both` / `llm` | `tags` |

### Context window (컨텍스트 윈도우)

검색 히트 주변의 ±N 인접 청크를 함께 반환하는 small-to-big retrieval. 파편화된 맥락을 회복할 때 유용합니다.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_CONTEXT_WINDOW__ENABLED` | 컨텍스트 윈도우 확장 활성화 | `false` |
| `MEMTOMEM_CONTEXT_WINDOW__WINDOW_SIZE` | 히트당 ±N 인접 청크 (`0`–`10`) | `2` |

### LLM (요약 · 쿼리 확장 백엔드)

`query_expansion.strategy=llm`, 통합 요약 등 LLM 기반 기능에서 공통으로 사용하는 백엔드 설정.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LLM__ENABLED` | LLM 기반 기능 활성화 | `false` |
| `MEMTOMEM_LLM__PROVIDER` | `ollama` / `openai` / `anthropic` / 호환 엔드포인트 | `ollama` |
| `MEMTOMEM_LLM__MODEL` | 모델명. 빈 문자열이면 프로바이더별 기본값 | `""` |
| `MEMTOMEM_LLM__BASE_URL` | 엔드포인트 URL | `http://localhost:11434` |
| `MEMTOMEM_LLM__API_KEY` | API 키 (유료 프로바이더) | — |
| `MEMTOMEM_LLM__MAX_TOKENS` | 생성 토큰 상한 | `1024` |
| `MEMTOMEM_LLM__TIMEOUT` | 요청 타임아웃 (초) | `60.0` |

### Tool exposure

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_TOOL_MODE` | `core` (`mem_do` 포함 총 9개) / `standard` (`mem_do` 포함 37개) / `full` (84개) | `core` |

### Web UI

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_WEB__MODE` | `prod` (정돈된 페이지만) / `dev` (Sessions · Namespaces · Health Report 등 메인테이너 페이지 추가). `mm web --mode` · `mm web --dev`가 실행 시 이 값을 덮어씁니다. | `prod` |

### Lifecycle policies & webhooks

| Variable | Description | Default |
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

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__ENABLED` | 스케줄 실행 활성화 | `false` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__INTERVAL_HOURS` | 실행 주기 (시간) | `24.0` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MIN_GROUP_SIZE` | 통합 대상 최소 그룹 크기 | `3` |
| `MEMTOMEM_CONSOLIDATION_SCHEDULE__MAX_GROUPS` | 1회 실행당 처리 그룹 상한 | `10` |

### Health watchdog (상태 모니터)

주기적 헬스 체크, 고아 레코드 정리, 자동 유지보수를 수행하는 백그라운드 루프.

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_HEALTH_WATCHDOG__ENABLED` | 상태 모니터 실행 | `false` |
| `MEMTOMEM_HEALTH_WATCHDOG__HEARTBEAT_INTERVAL_SECONDS` | 하트비트 주기 | `60.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DIAGNOSTIC_INTERVAL_SECONDS` | 진단 체크 주기 | `300.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__DEEP_INTERVAL_SECONDS` | 딥 스캔 주기 | `3600.0` |
| `MEMTOMEM_HEALTH_WATCHDOG__MAX_SNAPSHOTS` | 보관 스냅샷 수 상한 | `1000` |
| `MEMTOMEM_HEALTH_WATCHDOG__ORPHAN_CLEANUP_THRESHOLD` | 고아 레코드 정리 임계치 | `10` |
| `MEMTOMEM_HEALTH_WATCHDOG__AUTO_MAINTENANCE` | 자동 유지보수 수행 | `true` |

### Scheduler

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SCHEDULER__ENABLED` | 등록된 유지보수 job의 cron dispatch 활성화 | `false` |
| `MEMTOMEM_SCHEDULER__MAX_CONCURRENT_JOBS` | 동시에 실행할 scheduled job 상한 | `1` |
| `MEMTOMEM_SCHEDULER__DEFAULT_TIMEZONE` | 스케줄 타임존. Phase A는 `utc`만 적용 | `utc` |
| `MEMTOMEM_SCHEDULER__RUNNER_TIMEOUT_SECONDS` | scheduled job 1회 실행 타임아웃 | `300.0` |

### Session summary

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_SESSION_SUMMARY__AUTO` | 충분한 청크가 추가된 상태에서 `mem_session_end` 호출 시 LLM 요약 자동 생성 | `true` |
| `MEMTOMEM_SESSION_SUMMARY__MIN_CHUNKS` | 자동 요약 실행 최소 청크 수 | `5` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_TOKENS` | 요약 출력 토큰 상한 | `500` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_INPUT_CHARS` | 조립된 입력이 이 크기를 넘으면 자동 요약 생략 | `60000` |
| `MEMTOMEM_SESSION_SUMMARY__MAX_SUMMARY_LINKS` | 요약 청크에서 원본 청크로 쓰는 링크 상한 | `50` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_LOOKUP_TOP_K` | 검색 rescue에 고려할 세션 요약 청크 수 | `3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_SCORE_THRESHOLD` | rescue 확장에 필요한 최소 요약 점수 | `0.3` |
| `MEMTOMEM_SESSION_SUMMARY__EXPANSION_RESCUE_WEIGHT` | rescue된 source-file hit의 RRF 입력 가중치 | `0.5` |

### Logging

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_LOG_LEVEL` | `DEBUG` / `INFO` / `WARNING` / `ERROR` | `INFO` |
| `MEMTOMEM_LOG_FORMAT` | 로그 포맷 | — |

### Hooks / Context Gateway

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_HOOKS__TARGET_SCOPE` | memtomem 관리 Claude Code settings hook 대상 스코프: `user`, `project_shared`, `project_local` | `user` |
| `MEMTOMEM_CONTEXT_GATEWAY__KNOWN_PROJECTS_PATH` | Context Gateway용 Web UI 프로젝트 레지스트리 | `~/.memtomem/known_projects.json` |
| `MEMTOMEM_CONTEXT_GATEWAY__EXPERIMENTAL_CLAUDE_PROJECTS_SCAN` | `~/.claude/projects/<encoded>` 디렉터리를 프로젝트 루트로 reverse-decode | `false` |
| `MEMTOMEM_CONTEXT_GATEWAY__USER_TIER_ENABLED` | discovery 응답에 user-tier 정규 아티팩트 노출 | `false` |

### 임베딩 프로바이더 비교

| Provider | GPU | 비용 | 비고 |
|---|---|---|---|
| `onnx` | 불필요 | 무료 | fastembed 기반 내장. 최초 실행 시 약 270MB 다운로드 |
| `ollama` | 불필요 | 무료 | Ollama 설치 필요. `ollama pull nomic-embed-text` |
| `openai` | 불필요 | 유료 | API 키 필요 |

> 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem/blob/main/docs/guides/configuration.md).

## STM (memtomem-stm) — 접두사 `MEMTOMEM_STM_`

STM 설정은 여섯 영역으로 구성됩니다: flat `LOG_LEVEL`, 그리고 `PROXY__*`, `SURFACING__*`, `HOOK__*`, `DAEMON__*`, `LANGFUSE__*`. 압축, 캐싱, 메트릭, 자동 인덱싱, 추출은 모두 **`PROXY__` 하위**에 위치합니다.

### General

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LOG_LEVEL` | 로그 레벨 | `WARNING` |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | `true`일 때 관찰 도구 8개(`stm_proxy_stats`, `stm_proxy_health`, `stm_proxy_cache_clear`, `stm_surfacing_stats`, `stm_compression_stats`, `stm_progressive_stats`, `stm_index_stats`, `stm_tuning_recommendations`)를 MCP `tools/list`에 노출. 미설정/`false`일 때도 모델용 도구 4개는 계속 노출되고, 관찰 도구는 Python 내부 호출 가능. | `false` |

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

standalone `mms` 서버에서는 시작 시 `FileIndexer` 엔진이 연결되지 않으므로 `auto_index`와 extraction이 현재 inert 상태입니다. 이 필드는 유효한 설정이지만, MCP-only adapter가 제공되기 전까지 LTM write-back은 수행하지 않습니다.

### Proxy → Metrics / Extraction / Relevance scorer

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | 호출 메트릭 기록 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | Stage 4b EXTRACT (사실 추출) | `false` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | 스코어러 백엔드 | — |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | `stm_compression_feedback` 기록 | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | 점진적 전달 읽기 텔레메트리 기록 (`stm_progressive_stats`로 노출) | `true` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | 내부 락 획득 상한. 타임아웃 시 느린 업스트림이 아닌 데드락/멈춘 홀더 신호로 취급 | `30.0` |

### Proxy → Timeouts

아래 세 필드는 `~/.memtomem/stm_proxy.json`의 업스트림 항목(`UpstreamServerConfig`)에 **서버별로** 설정합니다(환경 변수 아님). 미지정 시 아래 기본값이 모든 업스트림에 적용됩니다.

| 필드 | 설명 | 기본값 |
|---|---|---|
| `call_timeout_seconds` | `session.call_tool()` 시도당 타임아웃. 초과 시 세션을 강제 리셋하고 재시도 루프로 복귀. | `90.0` |
| `overall_deadline_seconds` | 재시도 포함 단일 호출의 전체 벽시계 예산. `call_timeout × (max_retries+1)` 최악값 폭주 방지. | `180.0` |
| `compression.llm.llm_timeout_seconds` | `llm_summary` 압축 타임아웃. 초과 시 `truncate`로 폴백. | `60.0` |

### Surfacing (Stage 3)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | LTM 기반 능동적 서피싱 활성화 | `true` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | 관련성 최소 점수 | `0.03` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | 호출당 주입되는 최대 기억 수 | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | 매우 작은 응답에는 서피싱 생략 | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | 추출 쿼리의 최소 토큰 수 | `3` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | 세션 간 중복 제거 윈도우 | `604800` (7일) |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | `stm_surfacing_feedback` 수용 | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | 도구별 임계값 자동 튜닝 | `true` |
| `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` | 피드백 DB의 원문 쿼리 텍스트 보존 일수. 이후 column만 비움. `0`은 cleanup 비활성화 | `30` |
| `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT` | `true`면 원문 쿼리 저장, `false`면 `sha256:<16-hex>` digest 저장 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_ENABLED` | 반복 negative feedback을 받은 기억을 주입 전에 로컬 필터링 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_NEGATIVE_THRESHOLD` | 로컬 demotion 적용 전 필요한 서로 다른 negative surfacing 이벤트 수 | `3` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT` | LTM MCP 전송: `stdio`, `sse`, `streamable_http` | `stdio` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | stdio 전송에서 LTM 서버를 실행할 MCP 명령어 | `memtomem-server` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | LTM 명령어 인자 (JSON 리스트) | `[]` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_URL` | `sse` / `streamable_http` LTM 엔드포인트 URL | `""` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS` | 네트워크 LTM 전송용 정적 헤더(JSON object) | `null` |

주입 모드(기본 `append`, 추가로 `prepend` / `section`)는 `MEMTOMEM_STM_SURFACING__INJECTION_MODE`로 설정합니다.

### Hook / Daemon

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_HOOK__USE_DAEMON` | `mms hook` 서피싱을 cold in-process 경로 대신 warm local daemon으로 처리 | `true` |
| `MEMTOMEM_STM_HOOK__DAEMON_TIMEOUT_SECONDS` | hook-to-daemon 왕복 타임아웃 | `2.5` |
| `MEMTOMEM_STM_HOOK__FALLBACK` | daemon 미가용 시 동작: `skip` 또는 `cold` | `skip` |
| `MEMTOMEM_STM_HOOK__AUTO_SPAWN` | 첫 적격 hook 호출에서 daemon을 fire-and-forget spawn | `true` |
| `MEMTOMEM_STM_HOOK__RECORD_FEEDBACK_EVENTS` | hook 서피싱 피드백/쿼리 이벤트 저장. 기본값은 dedup만 유지하고 원문 쿼리 텍스트는 저장하지 않음 | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED` | built-in Bash `updatedToolOutput` 압축 활성화 | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MAX_CHARS` | Bash output replacement 대상 문자 예산 | `16000` |
| `MEMTOMEM_STM_DAEMON__HOST` | 로컬 daemon bind 주소. loopback-only 유지 권장 | `127.0.0.1` |
| `MEMTOMEM_STM_DAEMON__IDLE_TIMEOUT_SECONDS` | 이 초 동안 idle이면 daemon 중지. `0`은 idle shutdown 비활성화 | `900.0` |

### Langfuse (관측성)

| Variable | Description | Default |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | 스팬 전송 | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | — |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | — |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse 호스트 URL | — |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1.0` |

`MEMTOMEM_STM_LANGFUSE__ENABLED=true` 로 설정했는데 `[langfuse]` extra 가 설치되어 있지 않으면 시작 시점에 `ValueError` 로 실패합니다(v0.1.16 이후 fail-fast). 먼저 extra 를 설치하거나 `enabled=false` 로 두세요 — 기존의 "조용히 비활성화 + WARNING" 동작은 제거되었으므로, 설정 오타로 트레이싱이 말없이 꺼지는 일은 없습니다.

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
