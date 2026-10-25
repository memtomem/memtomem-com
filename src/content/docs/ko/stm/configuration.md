---
title: STM 환경 변수
description: memtomem-stm(STM) 환경 변수 설정 레퍼런스.
---

memtomem-stm(STM)은 [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)를 사용합니다. 환경 변수 이름은 `env_prefix` 뒤에 필드명을 붙이며, 중첩된 필드는 `env_nested_delimiter="__"`에 따라 **밑줄 두 개**로 구분합니다. 예를 들어 `MEMTOMEM_STM_PROXY__CACHE__ENABLED`는 유효하지만 `MEMTOMEM_STM_PROXY_CACHE_ENABLED`는 유효하지 않습니다.

값이 겹치면 CLI 옵션, 환경 변수, 설정 파일, 내장 기본값 순으로 앞의 값을 우선합니다.

이 레퍼런스는 `memtomem-stm` 0.6.9가 지원하는 설정을 빠짐없이 문서화합니다. 추천 항목만 추린 목록이 아니며, upstream이 제공하는 모든 옵션을 그대로 유지합니다. LTM 설정(접두사 `MEMTOMEM_`)은 [LTM 환경 변수](/ko/ltm/configuration/)에 정리되어 있습니다.

## STM (memtomem-stm) — 접두사 `MEMTOMEM_STM_`

STM 설정은 최상위 필드와 `PROXY__*`, `SURFACING__*`, `FORMATION__*`, `HOOK__*`, `DAEMON__*`, `LANGFUSE__*`로 나뉩니다. 압축, 캐시, 지표, 자동 색인, 추출 설정은 모두 **`PROXY__` 아래**에 있습니다.

`~/.memtomem/stm_proxy.json`은 `ProxyConfig`만 읽습니다. 최상위, 관련 기억 제시, 기억 형성, 훅, 데몬, Langfuse 설정은 환경 변수나 기본값으로만 지정할 수 있습니다. 이 블록을 JSON 파일에 넣어도 적용되지 않습니다. 문서화된 예외는 `proxy.consumer_model`이 관련 기억의 예산 계산에도 전달되는 동작뿐입니다.

<a id="general"></a>

### 일반

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_DATA_DIR` | 데몬 연결 정보, 소유권 잠금, 백그라운드 실행 로그를 저장할 디렉터리 | `"~/.memtomem"` |
| `MEMTOMEM_STM_LOG_LEVEL` | 로그 레벨 | `"WARNING"` |
| `MEMTOMEM_STM_LOG_FILE` | 선택적 회전 로그 파일. `0600` 권한, 2 MiB 회전, 백업 3개 사용 | `null` |
| `MEMTOMEM_STM_LOG_DEPENDENCIES` | `memtomem_stm` 밖의 logger(MCP SDK, `httpx`, `httpcore`, `urllib3` 등)가 남기는 WARNING 미만 기록을 서버와 daemon 로그에 통과시킵니다. 이 기록에는 query string이 포함된 upstream URL, MCP session id, 응답 header, 도구 인자와 결과가 담긴 MCP 메시지가 들어 있어 기본값은 꺼짐입니다. 시작 시 읽습니다. | `false` |
| `MEMTOMEM_STM_LOG_EXCEPTION_TEXT` | 서버와 daemon 로그의 traceback에 예외 메시지를 함께 기록합니다. 기본값에서는 frame과 예외 class·code만 남기고 메시지는 `[message withheld]`로 가립니다. upstream, LTM 서버, LLM provider가 쓴 메시지에 URL query, 도구 인자, header 일부가 들어갈 수 있기 때문입니다. 시작 시 읽습니다. | `false` |
| `MEMTOMEM_STM_ADVERTISE_OBSERVABILITY_TOOLS` | `true`이면 `stm_admin` 디스패처와 그 관찰·관리 액션 8개(`proxy_stats`, `proxy_health`, `proxy_cache_clear`, `surfacing_stats`, `selection_stats`, `compression_stats`, `progressive_stats`, `tuning_recommendations`)를 표시. `false`여도 모델용 도구 5개는 계속 표시 | `false` |
| `MEMTOMEM_STM_FORMATION__ENABLED` | 선택형 `stm_memory_propose` 도구 표시. 표시 여부는 이 값만으로 결정하며, 연결한 LTM이 검토 후 저장 방식을 지원하는지는 호출할 때 확인. 지원하지 않으면 `formation_unsupported` 반환 | `false` |
| `MEMTOMEM_STM_FORMATION__MAX_CONTENT_CHARS` | 검토 후 저장할 후보 내용의 최대 길이. 넘으면 제안을 거부 | `2000` |

<a id="proxy"></a>

### 프록시

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__ENABLED` | 프록시 처리 전체를 켜거나 끄는 설정 | `false` |
| `MEMTOMEM_STM_PROXY__CONFIG_PATH` | 프록시 JSON 설정 경로 | `"~/.memtomem/stm_proxy.json"` |
| `MEMTOMEM_STM_PROXY__UPSTREAM_SERVERS` | 연결할 모든 서버의 맵(JSON 객체). 보통은 설정 파일에서 관리하는 편이 쉬움 | `{}` |
| `MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION` | 기본 압축 전략 | `"auto"` |
| `MEMTOMEM_STM_PROXY__DEFAULT_MAX_RESULT_CHARS` | 응답당 문자 예산 | `16000` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_CHARS` | 메모리 부족을 막기 위한 연결 서버 응답 크기 상한 | `10000000` |
| `MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION` | 보존 하한 (0.0–1.0) | `0.65` |
| `MEMTOMEM_STM_PROXY__MAX_DESCRIPTION_CHARS` | 클라이언트에 보이는 도구 설명의 최대 길이(`[proxied] ` 접두사 포함). 업스트림에 적용되는 예산은 `min(server, global)`이므로 이 값만 올려서는 더 엄격한 서버별 값을 넓힐 수 없습니다. | `4000` |
| `MEMTOMEM_STM_PROXY__STRIP_SCHEMA_DESCRIPTIONS` | 표시하는 도구에서 중첩된 JSON 스키마의 설명 제거 | `false` |
| `MEMTOMEM_STM_PROXY__ADVERTISE_CONTEXT_QUERY` | 관련성 점수 계산에 쓰는 선택형 `_context_query` 인자를 도구 스키마에 표시 | `false` |
| `MEMTOMEM_STM_PROXY__HOST_DESCRIPTION_CAP` | 호스트가 허용하는 설명 길이(프록시 접두사와 힌트 포함). 지정하지 않으면 알 수 없는 값으로 두며 호스트 한도를 추정하지 않습니다. 다음 도구 등록 시 적용되므로 확실히 반영하려면 재시작합니다. | `null` |
| `MEMTOMEM_STM_PROXY__RECOVER_UPSTREAM_DESCRIPTION` | `description_override`가 대체한 원본 설명을 함께 반환합니다. 복구하면 재정의가 가리려 했던 업스트림 문구가 바로 그 독자에게 다시 전달되므로 기본값은 꺼짐입니다. | `false` |
| `MEMTOMEM_STM_PROXY__CONSUMER_MODEL` | 컨텍스트 윈도우 예산 계산에 쓰는 클라이언트 모델 식별자 | `""` |
| `MEMTOMEM_STM_PROXY__CONTEXT_BUDGET_RATIO` | 프록시 결과에 허용할 수신 모델 컨텍스트 크기의 비율 | `0.05` |
| `MEMTOMEM_STM_PROXY__CHARS_PER_TOKEN` | 토큰 예산용 정적 문자/토큰 추정치 | `3.5` |
| `MEMTOMEM_STM_PROXY__TOKEN_ESTIMATION_MODE` | 토큰 추정 모드: `static` 또는 유니코드 인식 `unicode` | `"static"` |

<a id="proxy--cache"></a>

### 프록시 → 캐시

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__CACHE__ENABLED` | 응답 캐싱 활성화 | `true` |
| `MEMTOMEM_STM_PROXY__CACHE__DEFAULT_TTL_SECONDS` | 캐시 TTL | `3600` |
| `MEMTOMEM_STM_PROXY__CACHE__DB_PATH` | 캐시 DB 경로 | `"~/.memtomem/proxy_cache.db"` |
| `MEMTOMEM_STM_PROXY__CACHE__MAX_ENTRIES` | 캐시 엔트리 상한 | `10000` |
| `MEMTOMEM_STM_PROXY__CACHE__TOOL_ANNOTATION_POLICY` | MCP 도구 주석을 반영하는 캐시 정책: `conservative`, `strict`, `ignore` | `"conservative"` |

캐시 스키마 6은 `structuredContent`와 `_meta`를 포함한 표준 MCP 응답 형식을 저장합니다. 호환되지 않는 이전 스키마를 발견하면 서로 다른 형식의 응답을 섞지 않고, 문서화된 일회성 캐시 초기화를 수행합니다.

<a id="proxy--auto-index-stage-4"></a>

### 프록시 → 자동 색인(4단계)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__ENABLED` | 도구 응답을 LTM에 색인 | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND` | 요청 처리가 끝난 뒤 백그라운드에서 색인 | `false` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MIN_CHARS` | 색인할 응답의 최소 크기 | `2000` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__MEMORY_DIR` | 출력 디렉터리 | `"~/.memtomem/proxy_index"` |
| `MEMTOMEM_STM_PROXY__AUTO_INDEX__NAMESPACE` | 자동 인덱싱 기억의 네임스페이스 | `"proxy-{server}"` |

기본 `mms` 서버는 설계상 LTM에서 읽기만 하고 다시 쓰지 않습니다. 따라서 `auto_index`와 `extraction` 필드는 유효한 설정으로 받아들이지만 실제 동작에는 영향을 주지 않습니다.

<a id="proxy--extraction"></a>

### 프록시 → 정보 추출

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXTRACTION__ENABLED` | 4b단계 EXTRACT(사실 추출) | `false` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__STRATEGY` | 추출 전략: `none`, `llm`, `heuristic`, `hybrid`. LLM 응답은 전체(markdown 코드 펜스는 제거)를 JSON 사실 배열로만 해석하므로, 설명 문장으로 감싼 응답, 빈 응답, 모든 항목이 잘못된 배열은 heuristic 추출로 대체 | `"llm"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PROVIDER` | 추출 LLM 제공자: `openai`, `anthropic`, `ollama` | `openai` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MODEL` | 추출 LLM 모델 | `gpt-4.1-mini` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__API_KEY` | 추출 LLM API 키 | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__BASE_URL` | 추출 LLM 엔드포인트 재정의 | `""` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__SYSTEM_PROMPT` | 정보 추출용 시스템 프롬프트 템플릿 | 내장 템플릿 |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__MAX_TOKENS` | 추출 LLM 출력 토큰 상한 | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__LLM_TIMEOUT_SECONDS` | 추출 LLM의 제한 시간 | `60.0` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM__PRIVACY_SCAN_ENABLED` | 원격 추출 LLM 전송 전 콘텐츠 검사 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_FACTS` | 응답당 추출 사실 수 상한 | `10` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MIN_RESPONSE_CHARS` | 추출 대상 최소 응답 길이 | `500` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__DEDUP_THRESHOLD` | 추출 사실 유사도 임계값 | `0.92` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MEMORY_DIR` | 추출 사실 출력 디렉터리 | `"~/.memtomem/extracted_facts"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__NAMESPACE` | 추출 사실 네임스페이스 템플릿 | `"facts-{server}"` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__BACKGROUND` | 요청 경로 밖에서 추출 실행 | `true` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__MAX_INPUT_CHARS` | 추출에 사용하는 응답 텍스트 상한 | `20000` |

<a id="proxy--metrics--feedback--relevance-scorer"></a>

### 프록시 → 지표·피드백·관련성 점수

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__METRICS__ENABLED` | 호출 메트릭 기록 | `true` |
| `MEMTOMEM_STM_PROXY__METRICS__DB_PATH` | 프록시 메트릭 SQLite 경로 | `"~/.memtomem/proxy_metrics.db"` |
| `MEMTOMEM_STM_PROXY__METRICS__MAX_HISTORY` | 메트릭 행 보관 상한 | `10000` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__SCORER` | 점수 계산 방식 | `"bm25"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_PROVIDER` | 의미 기반 관련성 점수에 사용할 임베딩 제공자 | `"ollama"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_MODEL` | 관련성 임베딩 모델 | `"nomic-embed-text"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_BASE_URL` | 관련성 임베딩 엔드포인트 | `"http://localhost:11434"` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_TIMEOUT` | 관련성 임베딩 요청 제한 시간 | `10` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__ENABLED` | `stm_compression_feedback` 기록 | `true` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__DB_PATH` | 압축 피드백 SQLite 경로 | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_PROXY__COMPRESSION_FEEDBACK__RETENTION_DAYS` | 압축 피드백 보존 일수 | `90` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__ENABLED` | 점진적 전달의 읽기 기록 활성화. `stm_admin(action="progressive_stats")`에서 확인 | `true` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__DB_PATH` | 점진적 읽기 기록을 저장할 SQLite 경로 | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_PROXY__PROGRESSIVE_READS__RETENTION_DAYS` | 점진적 읽기 기록 보존 일수 | `90` |
| `MEMTOMEM_STM_PROXY__LOCK_TIMEOUT_SECONDS` | 내부 잠금을 기다릴 최대 시간. 넘으면 연결 서버가 느린 것이 아니라 교착 상태이거나 잠금 소유자가 멈춘 것으로 처리 | `30` |

<a id="proxy--tool-exposure-도구-노출-필터"></a>

### 프록시 → 도구 표시 필터

연결한 서버의 도구 가운데 에이전트에 표시할 항목을 정하는 STM 자체 필터입니다. 실패가 잦거나, 설명에 자격 증명으로 보이는 문자열이 있거나, 이름이 겹치는 도구를 제외합니다. 상태는 프록시를 시작할 때 한 번 평가하므로 세션 중에는 표시되는 도구 목록이 바뀌지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__EXPOSURE__PROFILE` | `strict`(규칙에 걸리면 제외) / `review`(제외하지 않고 순위만 낮춘 뒤 기록) / `explore`(규칙 비활성화) | `"strict"` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_WINDOW_HOURS` | 도구별 건강도 판정에 사용하는 메트릭 조회 윈도우(시간) | `24` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_MIN_CALLS` | 건강도를 판정하기 위한 윈도우 내 최소 호출 수. 미만이면 건강한 것으로 간주 | `5` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__HEALTH_ERROR_RATE_THRESHOLD` | 연결 서버에서 발생한 오류율이 이 값 이상이면 도구를 비정상으로 표시 | `0.95` |
| `MEMTOMEM_STM_PROXY__EXPOSURE__REVIEW_RISK_PENALTY` | `review` 프로필에서 규칙에 걸린 도구의 순위를 낮추는 배수 | `0.5` |

<a id="proxy--selection-telemetry--tool-relevance-선택-텔레메트리--도구-랭킹"></a>

### 프록시 → 선택 기록·도구 관련성

프록시를 호출할 때마다 선택·실행 기록을 JSONL로 남기고, 에이전트에 표시한 도구를 호출 신호와의 BM25 관련성 순으로 계산합니다. 이 순위는 기록에만 남으며 실제 도구 목록은 바꾸지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__ENABLED` | 호출별 선택·실행 JSONL 기록 활성화 | `false` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__PATH` | JSONL 로그 경로 | `"~/.memtomem/stm_selection_log.jsonl"` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__SAMPLE_RATE` | 0.0–1.0. 기록할 호출 비율 | `1` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BYTES` | 로그 회전 크기 임계값 | `50000000` |
| `MEMTOMEM_STM_PROXY__SELECTION_TELEMETRY__MAX_BACKUPS` | 보관할 회전 파일 수 (`0`은 잘라내기) | `3` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__ENABLED` | 호출당 도구 BM25 랭킹 기록. `selection_telemetry`가 켜져 있어야 실제로 기록됨 | `true` |
| `MEMTOMEM_STM_PROXY__TOOL_RELEVANCE__TOP_N` | 선택 기록 하나에 남길 순위 후보 수 | `20` |

<a id="proxy--tool-graph-eligibility-외부-도구-그래프-선택"></a>

### 프록시 → 외부 도구 그래프 자격 판정(선택)

별도의 도구 그래프 MCP 서버에 여러 서버 사이의 권한과 데이터 흐름이 허용되는지 물어, 도구 표시 필터의 추가 규칙으로 사용합니다. 기본값은 비활성화입니다. 그래프 서버에는 자격만 조회하며 그 도구를 프록시하지 않으므로 클라이언트에는 그래프 도구가 보이지 않습니다.

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENABLED` | 외부 도구 그래프 적격성 제공자 활성화 | `false` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SOURCE` | 정책 출처: `stdio`로 실시간 조회하거나 서명된 `bundle` 파일 사용 | `"stdio"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__BUNDLE_PATH` | `source=bundle`일 때 사용할 로컬 정책 번들 경로 | `"~/.memtomem/toolgraph/policy-bundle.json"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__COMMAND` | stdio 도구 그래프 MCP 서버 실행 명령 | `"toolgraph"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ARGS` | 명령 인자(JSON 목록) | `["serve"]` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ENV` | 그래프 서버용 추가 환경 변수(예: `NEO4J_*`, JSON object) | `null` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__AGENT_ID` | 그래프에 등록된, 적격성을 판정할 에이전트 식별자 | `"stm-proxy"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__SERVER_NAME_MAP` | STM의 연결 서버 이름을 그래프 서버 식별자에 연결(JSON 객체) | `{}` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__QUERY_PROFILE` | 그래프 조회에 전달할 프로필 | `"strict"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_UNREACHABLE` | 그래프에 연결할 수 없을 때: `open`(STM 자체 규칙에 따라 표시) / `closed`(그래프가 승인한 도구 외에는 모두 보류) | `"open"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_TOOL_NOT_FOUND` | 그래프에 없는 후보 도구: `open` / `closed` | `"open"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_AGENT_NOT_FOUND` | `agent_id` 미등록(대개 오타): `fail_start` / `open` / `closed` | `"fail_start"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__ON_PROTOCOL_ERROR` | 그래프 응답 규약 위반: `fail_start` / `open` / `closed` | `"fail_start"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__RISK_PENALTY_SCALE` | 적격하지만 위험한 도구의 랭킹 강등 배수 | `1` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__TIMEOUT_SECONDS` | 조회 제한 시간 | `5` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_ENABLED` | 조회 결과를 디스크에 캐시 | `true` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_PATH` | 조회 캐시 SQLite 경로 | `"~/.memtomem/toolgraph_consult.db"` |
| `MEMTOMEM_STM_PROXY__TOOLGRAPH__CONSULT_CACHE_MAX_SCOPES` | 캐시할 도구 집합 범위의 상한 | `64` |

형식이 정해진 `backend_unavailable` 결과에는 `on_unreachable` 설정을 적용합니다. 알 수 없거나 형식이 잘못된 응답에는 `on_protocol_error`를 적용합니다.

<a id="per-upstream-upstreamserverconfig"></a>

### 연결 서버별 설정(`UpstreamServerConfig`)

다음 필드는 `~/.memtomem/stm_proxy.json`의 `UpstreamServerConfig` 항목에 **서버별로** 지정합니다. 개별 환경 변수로 설정하는 값이 아닙니다. 사용할 수 있는 필드를 모두 나열합니다.

| 필드 | 설명 | 기본값 |
|---|---|---|
| `command` | stdio 서버 실행 파일 | `""` |
| `args` | stdio 서버 인자 | `[]` |
| `env` | 서버 추가 환경 변수 | `null` |
| `cwd` | 서버 작업 디렉터리 | `null` |
| `prefix` | 조합된 도구 이름에 쓰는 필수 네임스페이스 구간 | 필수 |
| `transport` | `stdio`, `sse`, `streamable_http` | `stdio` |
| `url` | 네트워크 연결의 엔드포인트 | `""` |
| `headers` | 네트워크 연결에 넣을 고정 헤더 | `null` |
| `compression` | 이 서버의 기본 압축 전략 | `auto` |
| `max_result_chars` | 결과 문자 예산. 생략하면 전역 `default_max_result_chars`를 상속하고, 명시한 값은 `8000`을 포함해 그대로 적용. 토큰 예산이 함께 있으면 토큰 예산이 우선 | `8000` |
| `max_result_tokens` | 선택적 토큰 환산 결과 예산 | `null` |
| `chars_per_token` | 서버별 문자/토큰 추정치 | `null`(프록시 값 상속) |
| `token_estimation_mode` | 선택형 `static` / `unicode` 추정 방식 재정의 | `null`(프록시 값 상속) |
| `retention_floor` | 선택형 최소 압축 보존 비율. 전역 `min_result_retention`이 `0`이어도 적용되며, `0`이면 이 수준에서 하한을 끔 | `null`(프록시 값 상속) |
| `llm` | 서버별 LLM 압축 설정 | `null` |
| `selective` | selective 압축 설정 | `null` |
| `hybrid` | hybrid 압축 설정 | `null` |
| `progressive` | 커서 기반 점진 전달 설정 | `null` |
| `cleaning` | 압축 전 cleaning 설정 | `null` |
| `tool_overrides` | 도구별 `ToolOverrideConfig` 맵 | `{}` |
| `auto_index` | 호환을 위해 허용하는 전역 자동 색인 설정 재정의 | `null` |
| `extraction` | 호환을 위해 허용하는 전역 정보 추출 설정 재정의 | `null` |
| `cache` | 응답 캐시 재정의 | `null` |
| `cache_ttl_seconds` | 응답 캐시 TTL 재정의 | `null` |
| `expose_in_profiles` | 이 서버를 표시할 노출 프로필 | `null` |
| `surfacing_enabled` | 이 서버의 응답에 관련 기억을 자동으로 붙일지 여부. `false`이면 서버의 모든 도구에서 생략 | `true` |
| `max_retries` | 첫 시도 뒤 연결이나 호출을 다시 시도할 횟수 | `3` |
| `reconnect_delay_seconds` | 최초 재연결 지연 | `1.0` |
| `max_reconnect_delay_seconds` | 재연결 대기 시간의 상한 | `30.0` |
| `connect_timeout_seconds` | 서버 연결 제한 시간 | `30.0` |
| `call_timeout_seconds` | `session.call_tool()` 한 번의 제한 시간. 넘으면 세션을 강제로 초기화하며, 재실행 안전 정책과 남은 재시도·시간 예산이 허용할 때만 다시 시도 | `90.0` |
| `overall_deadline_seconds` | 재시도를 포함한 호출 하나의 전체 제한 시간. `call_timeout × (max_retries+1)`에 따른 최악의 대기 시간이 지나치게 커지는 것을 방지 | `180.0` |
| `circuit_max_failures` | 이 서버의 회로를 열기 전까지 허용할 실패 횟수 | `3` |
| `circuit_reset_seconds` | 열린 회로를 다시 확인할 간격 | `60.0` |
| `max_description_chars` | 서버별 도구 설명 길이 상한. 실제 적용 예산은 `min(server, global)`입니다. | `4000` |
| `strip_schema_descriptions` | 서버별로 중첩된 스키마 설명 제거 | `false` |
| `origin` | `mms add --import`/`mms init`이 기록하고 `mms eject`가 사용하는 가져오기 출처 정보. CLI JSON 출력에서는 저장된 원본 항목의 민감 정보를 가림 | `null` |

#### 압축 하위 설정

연결 서버와 `tool_overrides.<tool>` 항목은 같은 하위 설정 구조를 사용합니다.

| 블록 / 필드 | 설명 | 기본값 |
|---|---|---|
| `llm.provider` | `openai`, `anthropic`, `ollama` | `openai` |
| `llm.model` | 요약 모델 | `gpt-4.1-mini` |
| `llm.api_key` | 제공자 API 키 | `""` |
| `llm.base_url` | 제공자 엔드포인트 재정의 | `""` |
| `llm.system_prompt` | `{max_chars}`를 포함하는 요약 프롬프트 템플릿 | 내장 템플릿 |
| `llm.max_tokens` | 요약 출력 토큰 상한 | `500` |
| `llm.llm_timeout_seconds` | 요약 제한 시간. 넘으면 `truncate`로 대신 처리 | `60.0` |
| `llm.privacy_scan_enabled` | 원격 LLM 호출 전 검사 | `true` |
| `selective.max_pending` | 진행 중인 선택 기록 수 상한 | `100` |
| `selective.pending_ttl_seconds` | 진행 중인 선택 기록의 TTL | `300.0` |
| `selective.json_depth` | JSON 개요의 깊이 | `1` |
| `selective.min_section_chars` | 유지할 섹션 최소 길이 | `50` |
| `selective.pending_store` | 진행 중인 선택 기록의 저장 방식: `memory` 또는 `sqlite`. `sqlite`에서는 저장 대상 응답에 자격 증명 패턴이 있으면 기록하지 않고 잘라낸(`truncate_on_sensitive`) 응답이나 전체(`passthrough_on_sensitive`) 응답으로 캐시 없이 반환 | `memory` |
| `selective.pending_store_path` | 진행 중인 선택 기록을 저장할 SQLite 경로 | `~/.memtomem/pending_selections.db` |
| `hybrid.head_chars` | 선두 콘텐츠 선호 예산 | `5000` |
| `hybrid.tail_mode` | `toc` 또는 `truncate` | `toc` |
| `hybrid.min_toc_budget` | 목차 최소 예산 | `200` |
| `hybrid.min_head_chars` | 선두 콘텐츠 최소 예산 | `100` |
| `hybrid.head_ratio` | 선두 콘텐츠 배분 비율 | `0.6` |
| `progressive.chunk_size` | `progressive` 조각 하나의 문자 수 | `4000` |
| `progressive.max_stored` | 보관할 진행 중인 `progressive` 응답 수 상한 | `200` |
| `progressive.ttl_seconds` | 진행 중인 응답의 TTL. `0`이면 즉시 만료 | `1800.0` |
| `progressive.include_structure_hint` | 남은 콘텐츠 구조 메타데이터 포함 | `true` |
| `cleaning.enabled` | 응답 정리 단계 활성화 | `true` |
| `cleaning.strip_html` | HTML 마크업 제거 | `true` |
| `cleaning.deduplicate` | 중복 블록 제거 | `true` |
| `cleaning.collapse_links` | 장황한 링크 축약 | `true` |

#### 도구별 재정의

각 `tool_overrides.<tool>`은 `compression`, `max_result_chars`, `max_result_tokens`, `chars_per_token`, `token_estimation_mode`, `retention_floor`와 위의 `llm`, `selective`, `hybrid`, `progressive`, `cleaning` 블록을 받습니다. 다음 필드도 모두 받습니다.

| 필드 | 설명 | 기본값 |
|---|---|---|
| `auto_index` | 호환을 위해 허용하는 자동 색인 설정 재정의 | `null` |
| `extraction` | 호환을 위해 허용하는 정보 추출 설정 재정의 | `null` |
| `cache` | 캐시 재정의 | `null` |
| `cache_ttl_seconds` | 캐시 TTL 재정의 | `null` |
| `hidden` | 이 도구를 에이전트에 표시하지 않음 | `false` |
| `description_override` | 에이전트에 표시할 설명 교체 | `null` |
| `expose_in_profiles` | 이 도구를 표시할 노출 프로필 | `null` |

<a id="surfacing-stage-3"></a>

### 관련 기억 자동 제시(3단계)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_SURFACING__ENABLED` | LTM 기반 관련 기억 자동 제시 활성화 | `true` |
| `MEMTOMEM_STM_SURFACING__USE_DAEMON` | 단독 실행한 관련 기억 검색을 공용 데몬으로 처리. 별도의 내부 대체 경로는 없음 | `false` |
| `MEMTOMEM_STM_SURFACING__WARMUP_ENABLED` | LTM 클라이언트를 백그라운드에서 미리 연결 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DB_PATH` | 관련 기억 피드백과 중복 제거 정보를 저장할 SQLite 경로 | `"~/.memtomem/stm_feedback.db"` |
| `MEMTOMEM_STM_SURFACING__MIN_SCORE` | RRF 척도에서 적용하는 전역 결과 점수 하한. 도구별 고정값이나 척도 게이트가 있으면 그쪽이 우선합니다. | `0.017` |
| `MEMTOMEM_STM_SURFACING__MAX_RESULTS` | 호출당 주입되는 검색 결과 기억의 최대 수. Core가 `context_compose`로 반환하는 고정(pinned) 컨텍스트는 별도이며 이 수에 포함되지 않음 | `3` |
| `MEMTOMEM_STM_SURFACING__MIN_RESPONSE_CHARS` | 응답이 이보다 짧으면 관련 기억 검색 생략 | `5000` |
| `MEMTOMEM_STM_SURFACING__MIN_QUERY_TOKENS` | 추출한 검색어의 최소 토큰 수 | `3` |
| `MEMTOMEM_STM_SURFACING__COOLDOWN_SECONDS` | 관련 기억 검색을 반복할 때 둘 사이의 최소 간격 | `5` |
| `MEMTOMEM_STM_SURFACING__TIMEOUT_SECONDS` | LTM 관련 기억 검색의 제한 시간 | `3` |
| `MEMTOMEM_STM_SURFACING__INJECTION_MODE` | 배치 위치: `prepend`, `append`, `section` | `"append"` |
| `MEMTOMEM_STM_SURFACING__SECTION_HEADER` | `section` 주입 모드에서 사용할 제목 | `"## Relevant Memories"` |
| `MEMTOMEM_STM_SURFACING__DEFAULT_NAMESPACE` | 도구 규칙이 덮어쓰지 않을 때의 선택적 네임스페이스 | `null` |
| `MEMTOMEM_STM_SURFACING__EXCLUDE_TOOLS` | 제외할 도구 이름 목록(JSON 목록) | `[]` |
| `MEMTOMEM_STM_SURFACING__WRITE_TOOL_PATTERNS` | 기본적으로 관련 기억을 붙이지 않을 쓰기 도구 패턴(JSON 목록) | `["*write*","*create*","*delete*","*push*","*send*","*remove*"]` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_TOOLS` | 도구별 `enabled`, `query_template`, `namespace`, `min_score`, `max_results` 재정의(JSON object) | `{}` |
| `MEMTOMEM_STM_SURFACING__DEDUP_TTL_SECONDS` | 세션 사이에 중복을 제거할 기간 | `604800` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_ENABLED` | `stm_surfacing_feedback` 입력 허용 | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_SURFACINGS_PER_MINUTE` | 현재 프로세스에서 분당 실행할 관련 기억 검색 수 상한 | `15` |
| `MEMTOMEM_STM_SURFACING__CACHE_TTL_SECONDS` | 현재 프로세스의 관련 기억 검색 결과 캐시 TTL | `60` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_MAX_FAILURES` | 회로를 열기 전 연속 LTM 실패 횟수 | `3` |
| `MEMTOMEM_STM_SURFACING__CIRCUIT_RESET_SECONDS` | 열린 회로를 다시 확인할 간격 | `60` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_ENABLED` | 도구별 임계값 자동 튜닝 | `true` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_MIN_SAMPLES` | 튜닝 전 최소 피드백 샘플 수 | `20` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_INCREMENT` | 임계값 조정 단위 | `0.002` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_FLOOR` | 기본 자동 튜닝 하한. 명시적 `min_score`를 포함하도록 검증 시 확장 | `0.005` |
| `MEMTOMEM_STM_SURFACING__AUTO_TUNE_SCORE_CEILING` | 기본 자동 튜닝 상한. 명시적 `min_score`를 포함하도록 검증 시 확장. 실행 중에는 배치에서 도달 가능한 기준값으로도 상한을 둠([피드백 루프](/ko/stm/surfacing/#피드백-루프) 참고) | `0.05` |
| `MEMTOMEM_STM_SURFACING__INCLUDE_SESSION_CONTEXT` | 검색어를 만들 때 사용할 수 있는 세션 맥락 포함 | `true` |
| `MEMTOMEM_STM_SURFACING__FIRE_WEBHOOK` | 관련 기억 검색 결과에 대해 LTM에 설정된 웹훅 실행 요청 | `true` |
| `MEMTOMEM_STM_SURFACING__MAX_INJECTION_CHARS` | 주입되는 기억 전체 문자 상한 | `3000` |
| `MEMTOMEM_STM_SURFACING__CONTEXT_WINDOW_SIZE` | 각 검색 결과 주변에서 요청할 LTM 인접 청크 수 | `0` |
| `MEMTOMEM_STM_SURFACING__RESULT_CONTENT_MAX_CHARS` | `structured` 결과 하나의 내용 길이 상한 | `500` |
| `MEMTOMEM_STM_SURFACING__PREVIEW_MAX_CHARS` | `compact` 미리보기 하나의 내용 길이 상한 | `300` |
| `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` | 피드백 DB에 검색어 원문을 보존할 일수. 기간이 지나면 해당 열의 값만 비움. `0`이면 정리하지 않음 | `30` |
| `MEMTOMEM_STM_SURFACING__STATS_RETENTION_DAYS` | 집계한 관련 기억 검색 통계의 보존 일수 | `90` |
| `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT` | `true`이면 검색어 원문 저장, `false`이면 `sha256:<16-hex>` 해시 저장. `surface` 웹훅의 `query`도 저장된 값과 같음 | `true` |
| `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED` | 관련 기억 검색에 진입한 호출마다 결과(표시, 건너뜀과 그 사유, 오류, 취소)를 `surfacing_opportunities` 행으로 기록. 행에는 인자 개수, 경로 깊이, 흔한 파일 형식의 확장자 같은 인자 형태만 담기며 키와 값은 담기지 않음. `false`이면 기록을 완전히 끔. 피드백 추적기가 있는 엔진(daemon, `feedback_enabled`가 켜진 proxy)만 기록 | `true` |
| `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_SAMPLE_RATE` | 저장할 opportunity 행의 비율(`0.0`~`1.0`). 제외된 행은 `stm_surfacing_stats`에서 개수로만 집계. 보류(holdout) 추첨을 거친 호출은 샘플링에서 제외하지 않으므로 `HOLDOUT_RATE`가 `0`보다 크면 `0.0`이어도 행이 저장될 수 있음 | `1.0` |
| `MEMTOMEM_STM_SURFACING__HOLDOUT_RATE` | 효과 측정을 위해 무작위로 주입을 보류할 비율. `[0, 0.5]` 밖의 값은 거부하지 않고 범위 안으로 조정함. Claude Code hook 경로에서 `tool_use_id`와 `session_id`가 모두 있는 호출만 대상이며 proxy 경로는 보류하지 않음 | `0.0` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_ENABLED` | 부정적 피드백을 반복해서 받은 기억을 응답에 넣기 전에 제외 | `true` |
| `MEMTOMEM_STM_SURFACING__FEEDBACK_DEMOTION_NEGATIVE_THRESHOLD` | 기억을 제외하기 전에 필요한 서로 다른 부정적 평가 수 | `3` |
| `MEMTOMEM_STM_SURFACING__CONSUMER_MODEL` | 관련 기억 제시 전용 수신 모델. 빈 값이면 `proxy.consumer_model` 상속 | `""` |
| `MEMTOMEM_STM_SURFACING__RESULT_FORMAT` | LTM 응답 모드: `compact` 또는 `structured` | `"structured"` |
| `MEMTOMEM_STM_SURFACING__RERANK` | 서피싱 검색에서 Core에 보낼 호출별 재순위 요청. `false`는 재순위 단계 생략, `true`는 Core에 설정된 리랭커 사용, `none`은 요청하지 않고 Core 설정에 맡김. 호출별 재순위를 지원한다고 알린 Core에만 전달 | `false` |
| `MEMTOMEM_STM_SURFACING__SCALE_GATED_MIN_SCORE` | `score_scale`이 RRF가 아닌 알려진 척도인 결과 묶음에는 전역 또는 자동 조정된 `min_score`를 적용하지 않고 자동 조정도 멈춤. 도구별 `min_score`는 계속 적용하며, 점수 자체는 변환하지 않음 | `true` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_TRANSPORT` | LTM MCP 연결 방식: `stdio`, `sse`, `streamable_http` | `"stdio"` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND` | stdio 연결에서 LTM 서버를 실행할 MCP 명령 | `"memtomem-server"` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_ARGS` | LTM 명령 인자(JSON 목록) | `[]` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_URL` | `sse` / `streamable_http` LTM 엔드포인트 URL | `""` |
| `MEMTOMEM_STM_SURFACING__LTM_MCP_HEADERS` | 네트워크 LTM 전송용 정적 헤더(JSON object) | `null` |

관련 기억 자동 제시는 STM을 거친 호출이나 지원되는 클라이언트 훅에만 적용됩니다. 각 AI 도구가 자체로 관리하는 기억 계층이 아니며, STM과 관계없는 직접 MCP 호출에 몰래 내용을 넣지 않습니다.

<a id="hook--daemon"></a>

### 훅 / 데몬

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_HOOK__USE_DAEMON` | `mms hook`의 관련 기억 검색을 매번 새 프로세스에서 처리하지 않고 상주하는 로컬 데몬으로 처리 | `true` |
| `MEMTOMEM_STM_HOOK__DAEMON_TIMEOUT_SECONDS` | 훅과 데몬 사이 왕복 제한 시간 | `2.5` |
| `MEMTOMEM_STM_HOOK__FALLBACK` | 데몬을 사용할 수 없을 때의 동작: `skip`(건너뜀) 또는 `cold`(현재 프로세스에서 처리). 데몬이 `busy`나 `expired`로 응답하면 이 값과 관계없이 건너뜀 | `"skip"` |
| `MEMTOMEM_STM_HOOK__AUTO_SPAWN` | 조건을 충족하는 첫 훅 호출에서 응답을 기다리지 않고 데몬 시작 | `true` |
| `MEMTOMEM_STM_HOOK__RECORD_FEEDBACK_EVENTS` | 훅의 관련 기억 피드백과 검색어 기록 저장. 기본값은 중복 제거 정보만 유지하며 검색어 원문은 저장하지 않음 | `false` |
| `MEMTOMEM_STM_HOOK__METRICS_ENABLED` | 크기와 소요 시간만 포함하는 훅 지표 기록 | `true` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__ENABLED` | 내장 Bash 도구의 `updatedToolOutput` 압축 활성화 | `false` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MAX_CHARS` | Bash 출력을 바꿀 때 적용할 문자 예산 | `16000` |
| `MEMTOMEM_STM_HOOK__COMPRESSION__MIN_RETENTION` | 내장 Bash 출력 압축의 최소 보존 비율 | `0.65` |
| `MEMTOMEM_STM_HOOK_SURFACE_TOOLS` | 중첩 설정과 별도로 직접 읽는 쉼표 구분 훅 도구 허용 목록. 클라이언트 어댑터는 Claude의 `Read` / `Bash` 같은 이름을 `read` / `shell`로 연결 | `read,grep,glob,shell` |
| `MEMTOMEM_STM_DAEMON__HOST` | 로컬 데몬이 수신 대기할 주소. 루프백 전용 권장 | `"127.0.0.1"` |
| `MEMTOMEM_STM_DAEMON__ALLOW_NON_LOOPBACK` | 루프백이 아닌 주소에서 데몬 수신을 명시적으로 허용 | `false` |
| `MEMTOMEM_STM_DAEMON__IDLE_TIMEOUT_SECONDS` | 이 시간 동안 요청이 없으면 데몬 중지. `0`이면 자동 중지하지 않음 | `900` |
| `MEMTOMEM_STM_DAEMON__MAX_PENDING_REQUESTS` | 받을 수 있는 훅 및 단독 관련 기억 검색 요청 수 상한 | `32` |

### Langfuse (관측성)

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_LANGFUSE__ENABLED` | 스팬 전송 | `false` |
| `MEMTOMEM_STM_LANGFUSE__PUBLIC_KEY` | Langfuse public key | `""` |
| `MEMTOMEM_STM_LANGFUSE__SECRET_KEY` | Langfuse secret key | `""` |
| `MEMTOMEM_STM_LANGFUSE__HOST` | Langfuse 호스트 URL | `""` |
| `MEMTOMEM_STM_LANGFUSE__SAMPLING_RATE` | 0.0–1.0 | `1` |

`MEMTOMEM_STM_LANGFUSE__ENABLED=true`인데 `[langfuse]` 추가 패키지가 설치되어 있지 않으면 시작할 때 `ValueError`가 발생합니다(v0.1.16부터 즉시 실패). 추가 패키지를 먼저 설치하거나 `enabled=false`로 두세요. 이제는 경고만 남기고 조용히 비활성화하지 않으므로 설정 오류 때문에 추적 기능이 모르게 꺼지지 않습니다.

### 압축 전략 (`MEMTOMEM_STM_PROXY__DEFAULT_COMPRESSION`)

| 전략 | 용도 |
|---|---|
| `auto` | 기본값 — 콘텐츠 유형별 자동 선택 |
| `hybrid` | Markdown (구조 보존 + 비핵심 섹션 축약) |
| `selective` | 검색어나 요청과 관련된 섹션만 유지 |
| `progressive` | 대용량 콘텐츠, 보관된 소스의 커서 기반 분할 전송 |
| `extract_fields` | JSON 딕셔너리 |
| `schema_pruning` | 대형 JSON 배열 |
| `skeleton` | API 문서 (스키마만 유지) |
| `llm_summary` | LLM 기반 요약 (OpenAI / Anthropic / Ollama) |
| `truncate` | 다른 전략을 쓸 수 없을 때 길이 제한에 맞춰 자름 |
| `none` | 압축하지 않고 그대로 전달 |

> 원문 전체 목록: upstream 저장소의 [configuration.md](https://github.com/memtomem/memtomem-stm/blob/main/docs/configuration.md)를 참고하세요.

## 고정 소스 기준 기본값

위 기본값은 초기화 프리셋을 적용하기 전 스키마 선언값입니다. `mm init`은 공급자·차원·메모리 경로를 변경할 수 있습니다. OTLP와 Langfuse는 별도 옵트인입니다. 자식 MCP 프로세스에 환경 변수를 전달하고 다시 연결해야 합니다.

### STM 추가 설정

| 변수 | 설명 | 기본값 |
|---|---|---|
| `MEMTOMEM_STM_DAEMON__MAX_CONCURRENT_LTM_OPS` | LTM 작업 동시 실행 상한 | `4` |
| `MEMTOMEM_STM_OTLP__ENABLED` | 선택적 OTLP 내보내기: enabled | `false` |
| `MEMTOMEM_STM_OTLP__ENDPOINT` | 선택적 OTLP 내보내기: endpoint | `""` |
| `MEMTOMEM_STM_OTLP__FLUSH_TIMEOUT_SECONDS` | 선택적 OTLP 내보내기: flush timeout seconds | `5` |
| `MEMTOMEM_STM_OTLP__HEADERS` | 선택적 OTLP 내보내기: headers | `{}` |
| `MEMTOMEM_STM_OTLP__MAX_EXPORT_BATCH_SIZE` | 선택적 OTLP 내보내기: max export batch size | `512` |
| `MEMTOMEM_STM_OTLP__MAX_QUEUE_SIZE` | 선택적 OTLP 내보내기: max queue size | `2048` |
| `MEMTOMEM_STM_OTLP__SAMPLING_RATE` | 선택적 OTLP 내보내기: sampling rate | `1` |
| `MEMTOMEM_STM_OTLP__SCHEDULE_DELAY_MS` | 선택적 OTLP 내보내기: schedule delay ms | `5000` |
| `MEMTOMEM_STM_OTLP__TIMEOUT_SECONDS` | 선택적 OTLP 내보내기: timeout seconds | `10` |
| `MEMTOMEM_STM_PARENT_LIVENESS_GRACE_SECONDS` | 부모 프로세스 생존 확인 유예 시간(초) | `900` |
| `MEMTOMEM_STM_PARENT_LIVENESS_POLL_SECONDS` | 부모 프로세스 생존 확인 간격; 0이면 비활성화 | `0` |
| `MEMTOMEM_STM_PROXY__EXTRACTION__LLM` | 선택적 LLM 추출 설정; null이면 해당 오버라이드 없음 | `null` |
| `MEMTOMEM_STM_PROXY__MAX_UPSTREAM_BYTES` | 메타데이터·비텍스트·오류를 포함한 디코딩 후 compact JSON 응답 상한; 전송 크기나 최대 메모리 상한이 아님 | `41943040` |
| `MEMTOMEM_STM_PROXY__RELEVANCE_SCORER__EMBEDDING_CACHE_SIZE` | 임베딩 관련도 캐시 항목 상한 | `256` |
| `MEMTOMEM_STM_TEARDOWN_WATCHDOG_SECONDS` | 종료 감시 제한 시간(초) | `60` |

캐시 스키마 6은 길이 접두사를 붙인 키 구성과 유니코드 직렬화를 사용하며, 캐시한 응답을 업스트림 연결 설정에 묶습니다. 이전 캐시 행은 최초 초기화 시 삭제되지만, 이는 LTM 기억 삭제와는 별개입니다.
