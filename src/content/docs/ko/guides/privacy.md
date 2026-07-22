---
title: 로컬 우선 · 프라이버시
description: memtomem의 로컬 우선 기본값, 비밀값 보호, 선택적 네트워크 경계를 설명합니다.
---

memtomem은 로컬 우선입니다. 기본 저장소와 검색 인덱스는 내 컴퓨터에 있습니다. 원격 임베딩·LLM·리랭커, 원격 MCP/LTM transport, webhook, Toolgraph 서버, Langfuse tracing처럼 사용자가 설정한 경계에서만 네트워크 통신이 발생합니다.

## 로컬 우선 기본값

- **저장소** — 기본 저장소는 로컬 SQLite(`~/.memtomem/`)입니다. MCP stdio 경로는 네트워크 포트를 열지 않으며 `mm web`은 기본적으로 loopback에 바인딩됩니다.
- **임베딩** — 키워드 전용 모드는 임베딩 서비스가 필요 없습니다. 내장 ONNX(fastembed)는 로컬에서 실행되며 Ollama와 OpenAI 호환 제공자는 선택적으로 설정하는 경계입니다.
- **재정렬(Reranking)** — 재정렬을 켜면 기본 제공자는 로컬 ONNX(fastembed)이며, 외부 API가 필요 없습니다.
- **STM 프록시** — 기본 클라이언트 transport는 stdio입니다. 응답 캐시·메트릭·피드백은 `~/.memtomem/` 아래 로컬 SQLite 파일이며, 설정한 upstream MCP 서버와 원격 LTM transport에는 각각의 네트워크 경계가 적용됩니다.
- **계정 불필요** — 로그인이나 가입 없이 동작합니다.
- **선택적 외부 경로** — OpenAI 호환 임베딩, Cohere 리랭킹, 비루프백 Ollama, 외부 압축·추출 LLM, 원격 MCP/LTM, webhook, Toolgraph, Langfuse는 설정한 엔드포인트로 데이터를 보낼 수 있습니다. STM 외부 LLM 경로의 `privacy_scan_enabled`(기본 켜짐)는 자격증명을 검사해 hit가 있으면 로컬 fallback하며, 끄면 upstream 응답을 검사 없이 전송하고 외부 목적지에 대해 시작 경고를 남깁니다.

## 파일 시스템 보호

데이터 디렉터리(`~/.memtomem/`)는 생성 시 `0o700` 권한으로 만들어지고 내부 파일은 `0o600`(소유자 전용 읽기·쓰기)으로 기록됩니다. 별도로, 서버의 pid·lock 파일이 담기는 런타임 디렉터리(`$XDG_RUNTIME_DIR/memtomem` 또는 `/tmp/memtomem-<uid>`)는 `0o700`으로 생성되며 그룹·기타 사용자에게 접근 권한이 남아 있으면 시작 시점에 거부합니다.

## 비밀값 보호

memtomem은 자격증명·토큰·키로 보이는 내용이 저장소나 공유 범위로 흘러가지 않도록 여러 지점에서 차단합니다.

- **STM 민감 정보 자동 감지** — API 키, 토큰, 개인 키 패턴(예: `sk-…`, `ghp_…`, AWS `AKIA…`, JWT)이 포함된 응답은 응답 캐시와 selection telemetry에 저장되지 않습니다. 외부 LLM 압축은 privacy scan hit에서 로컬 truncate로 fallback합니다. 기본 제공 STM 런타임은 응답을 LTM에 쓰지 않습니다.
- **색인 자격증명 제외** — LTM 색인은 내장 자격증명 차단 목록(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`, `.ssh/**` 등)을 적용합니다. 사용자가 `!negation` 패턴을 추가해도 이 내장 패턴은 해제되지 않습니다.
- **공유 시 재검사** — `mem_agent_share`로 기억을 더 넓은 네임스페이스에 복사할 때 리댁션 가드가 다시 검사하며, 비밀값으로 보이는 내용은 공유 시점에 차단됩니다.
- **Context Gateway** — `project_shared` 계층(깃 추적 대상)으로 쓰거나 옮길 때 비밀값이 감지되면 `--force` 없이 무조건 거부합니다(깃 이력은 영구적이므로). `user`·`project_local` 계층은 검토 후 재정의할 수 있습니다.

## 쿼리 프라이버시 (STM 서피싱)

STM 서피싱은 도구 호출에서 질의 텍스트를 추출해 LTM을 검색합니다. 이 질의 텍스트의 보존 방식을 제어할 수 있습니다.

- `MEMTOMEM_STM_SURFACING__PERSIST_QUERY_TEXT=false` — 원문 대신 `sha256:<16-hex>` 다이제스트만 저장합니다.
- `MEMTOMEM_STM_SURFACING__QUERY_RETENTION_DAYS` (기본 `30`) — 피드백 DB에 보존된 원문 질의 텍스트를 지정한 일수 후 삭제합니다.
- 저장 민감 패턴(자격증명과 이메일 주소)에 맞는 쿼리는 설정과 무관하게 해시로 저장됩니다.
- **쓰기 도구 제외** — 상태를 변경하는 업스트림 도구에는 서피싱이 자동으로 비활성화됩니다.

## 되돌릴 수 있는 도입 · 잠금 없음

STM은 기존 MCP 서버를 가져와 앞단에서 프록시하지만, 이 변경은 되돌릴 수 있습니다. `mms eject`는 가져온 서버를 원래 호스트 MCP 클라이언트 설정으로 복원하며, 복원이 검증된 뒤에야 STM 항목을 제거합니다.

## 신뢰 경계와 권장 사항

- STM은 로컬 AI 클라이언트와 사용자가 설정한 업스트림 MCP 서버를 신뢰합니다. **신뢰할 수 있는 업스트림만 프록시하세요.**
- 선택적 서피싱 데몬은 내 컴퓨터 안에서만 연결을 받고(루프백 `127.0.0.1`), 시작할 때마다 무작위 토큰으로 인증합니다. `MEMTOMEM_STM_DAEMON__HOST`를 루프백이 아닌 주소로 바꾸지 마세요.
- LTM 웹 UI(`mm web`)는 기본적으로 `127.0.0.1`에만 바인딩됩니다.
- 취약점은 공개 이슈 대신 [GitHub 보안 권고](https://github.com/memtomem/memtomem/security/advisories/new) 또는 contact@dapada.co.kr로 제보해 주세요.

## 관련 문서

- [환경 변수](/ko/reference/configuration/) — 프라이버시 관련 설정 전체
- [능동적 서피싱](/ko/stm/surfacing/) — 쿼리 프라이버시와 게이팅
- [Context Gateway](/ko/ltm/context-gateway/) — 계층별 비밀값 차단
- [멀티 에이전트 협업](/ko/ltm/multi-agent/) — 공유 시 리댁션
