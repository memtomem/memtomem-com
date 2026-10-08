---
title: 로컬 우선 · 정보 보호
description: memtomem의 로컬 우선 기본값, 비밀값 보호, 선택적 네트워크 경계를 설명합니다.
---

memtomem은 로컬 우선으로 동작합니다. 기본 저장소와 검색 인덱스는 내 컴퓨터에 둡니다. 원격 임베딩·LLM·리랭커, 원격 MCP/LTM 연결, 웹훅, Toolgraph 서버, Langfuse 추적을 직접 설정했을 때만 해당 외부 서비스와 통신합니다.

## 30초 경계 확인

| 경로 | 기본 상태 | 내 컴퓨터 밖으로 내용이 나갈 수 있나? |
|---|---|---|
| SQLite 저장, BM25 검색, 로컬 ONNX 임베딩·리랭킹 | 로컬 | 파일을 별도로 동기화하거나 공개하지 않으면 나가지 않음 |
| MCP `stdio`, STM 캐시·지표, 루프백 Web UI | 로컬 | 사용자가 연결한 upstream MCP 서버와의 통신을 제외하면 나가지 않음 |
| 원격 Ollama, OpenAI 호환 임베딩·LLM, Cohere 리랭킹 | 직접 설정할 때만 사용 | 설정한 주소로 전송될 수 있음 |
| 원격 MCP/LTM, 웹훅, Toolgraph, Langfuse | 직접 설정할 때만 사용 | 해당 연동 설정에 따라 전송될 수 있음 |

모든 처리를 로컬에 두려면 Minimal 또는 로컬 ONNX 경로를 사용하고, Web UI와 데몬은 루프백에 유지하며, 선택형 원격 제공자를 설정하지 마세요.

## 로컬 우선 기본값

- **저장소** — 기본 저장소는 로컬 SQLite(`~/.memtomem/`)입니다. MCP `stdio` 연결은 네트워크 포트를 열지 않습니다. `mm web`도 기본적으로 내 컴퓨터에서만 접속할 수 있는 루프백 주소에 연결됩니다.
- **임베딩** — 키워드 전용 모드는 임베딩 서비스가 필요 없습니다. 내장 ONNX(fastembed)는 로컬에서 실행되며 Ollama와 OpenAI 호환 제공자는 선택적으로 설정하는 경계입니다.
- **재정렬(Reranking)** — 재정렬을 켜면 기본 제공자는 로컬 ONNX(fastembed)이며, 외부 API가 필요 없습니다.
- **ONNX Runtime 원격 측정(telemetry)** — Linux와 macOS용 공식 ONNX Runtime 1.29 이상은 기본적으로 Microsoft에 telemetry를 전송합니다. memtomem 0.6.8부터는 패키지를 가져올(import) 때 `ORT_DISABLE_TELEMETRY=1`을 설정하므로 서버, `mm` CLI, 웹 UI 모두 이 전송이 꺼진 상태로 실행됩니다. 환경에 이미 값이 있으면 그 값을 유지하므로, 전송을 허용하려면 `ORT_DISABLE_TELEMETRY=0`을 직접 지정합니다. memtomem 0.6.8을 고정한 Claude Code, Codex, OpenCode 플러그인과 [0.6.8 commit으로 설치한 Hermes 플러그인](/ko/guides/connect-ai-client/#hermes-agent)도 서버 실행 환경에 같은 값을 전달합니다. 0.6.8 이전 서버는 이 값을 설정하지 않으므로, 카탈로그가 이전 commit을 고정한 동안 카탈로그로 설치한 Hermes 플러그인은 telemetry가 켜진 상태로 실행됩니다. 이 경우 0.6.8 commit으로 다시 설치합니다. 다만 memtomem보다 먼저 `onnxruntime`을 초기화한 프로그램에는 적용되지 않습니다. Windows의 ONNX Runtime은 이 변수를 읽지 않으며, 추적 세션이 수집 중일 때만 Windows가 기록하는 ETW 이벤트를 내보냅니다.
- **STM 프록시** — 기본 연결 방식은 `stdio`입니다. 응답 캐시·측정값·피드백은 `~/.memtomem/` 아래의 로컬 SQLite 파일에 저장됩니다. 연결한 MCP 서버나 원격 LTM을 사용할 때는 해당 서버와 통신합니다.
- **계정 불필요** — 로그인이나 가입 없이 동작합니다.
- **선택적 외부 연결** — OpenAI 호환 임베딩, Cohere 리랭킹, 외부 주소의 Ollama, 압축·추출용 외부 LLM, 원격 MCP/LTM, 웹훅, Toolgraph, Langfuse는 설정한 주소로 데이터를 보낼 수 있습니다. STM의 `privacy_scan_enabled`는 기본적으로 자격 증명을 검사합니다. 민감 정보가 발견되면 외부 LLM으로 보내지 않고 로컬에서 처리합니다. 이 검사를 끄면 연결한 MCP 서버의 응답이 검사 없이 외부 서비스로 전송될 수 있으며, 시작할 때 경고가 표시됩니다.

## 파일 시스템 보호

데이터 디렉터리(`~/.memtomem/`)는 생성 시 `0o700` 권한으로 만들어지고 내부 파일은 `0o600`(소유자 전용 읽기·쓰기)으로 기록됩니다. 별도로, 서버의 pid·lock 파일이 담기는 런타임 디렉터리(`$XDG_RUNTIME_DIR/memtomem` 또는 `/tmp/memtomem-<uid>`)는 `0o700`으로 생성되며 그룹·기타 사용자에게 접근 권한이 남아 있으면 시작 시점에 거부합니다.

## 비밀값 보호

memtomem은 자격증명·토큰·키로 보이는 내용이 저장소나 공유 범위로 흘러가지 않도록 여러 지점에서 차단합니다.

- **STM 민감 정보 자동 감지** — API 키, 토큰, 개인 키 패턴(예: `sk-…`, `ghp_…`, AWS `AKIA…`, JWT)이 포함된 응답은 캐시나 선택 기록에 저장되지 않습니다. 외부 LLM으로 압축하기 전 민감 정보가 발견되면 로컬 `truncate` 방식으로 대신 처리합니다. 기본 STM 실행 환경은 응답을 LTM에 쓰지 않습니다.
- **STM 오류 텍스트 요약** — 예외 메시지는 요청의 URL 쿼리나 인자, 헤더 일부를 그대로 인용할 수 있어 저장하거나 보여 주지 않습니다.
  - **예외로 실패한 호출:** 프록시된 호출이 예외로 실패하면 MCP 클라이언트가 받는 오류, `proxy_metrics.error_message`, `stm_proxy_health`의 `startup connect failed` 줄, `extract_error`/`index_error` 열에는 `ConnectError`, `HTTP 401 (HTTPStatusError)`처럼 예외 유형만 남깁니다. 런타임 로그 줄도 같습니다.
  - **업스트림 `isError` 결과:** 클라이언트에는 그대로 전달하고, 저장되는 행에만 `upstream isError (<n> chars)`처럼 길이를 기록합니다.
  - **예외:** 회로 차단기, 크기 초과, 정책 거부처럼 STM이 직접 만든 오류는 메시지를 유지합니다. 로그에 함께 남는 traceback도 바뀌지 않습니다.
- **색인 자격증명 제외** — LTM 색인은 내장 자격증명 차단 목록(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**` 등)을 적용합니다. 사용자가 `!negation` 패턴을 추가해도 이 내장 패턴은 해제되지 않습니다.
- **공유 시 재검사** — `mem_agent_share`로 기억을 더 넓은 네임스페이스에 복사하면 민감 정보 차단 검사를 다시 실행합니다. 비밀값으로 보이는 내용은 공유하지 않습니다.
- **Context Gateway** — `project_shared` 계층(깃 추적 대상)으로 쓰거나 옮길 때 비밀값이 감지되면 `--force` 없이 무조건 거부합니다(깃 이력은 영구적이므로). `user`·`project_local` 계층은 검토 후 재정의할 수 있습니다.

<a id="쿼리-프라이버시-stm-서피싱"></a>

## 검색어 보호(STM 관련 기억 자동 제시)

STM 서피싱은 도구 호출에서 검색어를 만들어 LTM을 검색합니다. 다음 설정으로 검색어를 저장하는 방식을 제어할 수 있습니다.

- `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT=false` — 원문 대신 `sha256:<16-hex>` 다이제스트만 저장합니다.
- `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` (기본 `30`) — 피드백 DB에 저장된 원문 검색어를 지정한 일수 후 삭제합니다.
- 자격 증명이나 이메일 주소처럼 민감 정보 패턴과 일치하는 검색어는 설정과 관계없이 해시로 저장합니다.
- **제시 기회 기록** — 검색에 진입한 호출마다 결과와 인자의 형태(개수, 경로 깊이, 흔한 파일 확장자)만 기록하며, 인자의 키와 값은 저장하지 않습니다. `MEMTOMEM_STM_SURFACING__OPPORTUNITIES_ENABLED=false`로 끌 수 있습니다.
- **호출 식별자** — 관련 기억 이벤트에는 호스트의 `tool_use_id`, 세션 ID, 에이전트 ID를 저장하지만 작업 디렉터리(`cwd`)는 저장하지 않습니다. 제시한 기억의 경로와 미리보기 텍스트는 설치별 키로 만든 해시로만 저장합니다.
- **쓰기 도구 제외** — 연결한 MCP 서버의 도구가 상태를 변경하면 서피싱을 자동으로 건너뜁니다.

## 되돌릴 수 있는 도입 · 잠금 없음

STM은 기존 MCP 서버를 가져와 앞단에서 중계합니다. 이 변경은 언제든 되돌릴 수 있습니다. `mms eject`는 가져온 서버를 원래 MCP 클라이언트 설정으로 복원하고, 복원이 확인된 뒤 STM 항목을 제거합니다.

## 신뢰 경계와 권장 사항

- STM은 로컬 AI 클라이언트와 사용자가 연결한 MCP 서버를 신뢰합니다. **신뢰할 수 있는 서버만 STM에 연결하세요.**
- 선택적 서피싱 데몬은 내 컴퓨터 안에서만 연결을 받고(루프백 `127.0.0.1`), 시작할 때마다 무작위 토큰으로 인증합니다. `MEMTOMEM_STM_DAEMON__HOST`를 루프백이 아닌 주소로 바꾸지 마세요.
- LTM 웹 UI(`mm web`)는 기본적으로 `127.0.0.1`에만 바인딩됩니다.
- 취약점은 공개 이슈 대신 [GitHub 보안 권고](https://github.com/memtomem/memtomem/security/advisories/new) 또는 contact@dapada.co.kr로 제보해 주세요.

## 관련 문서

- [환경 변수](/ko/reference/configuration/) — 프라이버시 관련 설정 전체
- [능동적 서피싱](/ko/stm/surfacing/) — 검색어 보호와 관련성 검사
- [Context Gateway](/ko/ltm/context-gateway/) — 계층별 비밀값 차단
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 공유할 때 민감 정보 차단
