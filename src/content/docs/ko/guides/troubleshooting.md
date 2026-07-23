---
title: 문제 해결
description: Python·초기화부터 검색, MCP 클라이언트, Web UI, STM까지 사용자 여정 순서로 문제를 진단합니다.
---

실패한 단계부터 확인하세요. 각 해결 절차는 다시 실행할 명령이나 돌아갈 가이드 단계로 끝납니다.

## 1. 실행 환경·설치

### Python이 없거나 버전이 낮음

```bash
python --version
```

memtomem은 Python 3.12 이상이 필요합니다. Windows에서는 `py --version`도 확인하세요. 지원 버전을 설치하거나 선택한 뒤 [빠른 시작 → 설치·초기화](/ko/guides/quickstart/#2-초기-설정)로 돌아갑니다.

### `uv: command not found`

[uv 공식 설치 안내](https://docs.astral.sh/uv/getting-started/installation/)에 따라 설치하고 터미널을 다시 연 뒤 확인합니다.

```bash
uv --version
```

### `mm: command not found` / `mms: command not found`

실행 파일 폴더가 `PATH`에 없을 수 있습니다. 사용한 설치 도구에 맞춰 실행하고 터미널을 다시 여세요.

```bash
uv tool update-shell
```

pipx를 사용했다면 `pipx ensurepath`를 실행합니다. 이어서 `mm --version` 또는 `mms --version`을 다시 확인하세요.

### `mm --version`이 오래된 버전을 출력

```bash
uv tool install 'memtomem[all]' --refresh
mm --version
```

## 2. 초기화

### 설정 마법사 선택이 어렵거나 모델 다운로드가 실패

모델을 받지 않는 고정 경로로 돌아갑니다.

```bash
mm init --preset minimal --non-interactive --mcp skip
mm status
```

Minimal은 BM25 키워드 검색만 사용하므로 임베딩 모델을 내려받지 않습니다. 이 경로가 동작한 뒤 English (Recommended) 또는 Korean-optimized 의미 검색을 추가하세요.

### 설정이나 데이터베이스가 만들어지지 않음

`mm status`에서 표시하는 설정·데이터베이스 경로를 확인합니다. 현재 사용자가 상위 폴더에 쓸 수 있고 `~/.memtomem/` 소유자가 다른 계정이 아닌지 확인하세요. 첫 복구 단계에서 폴더나 데이터베이스를 지우지 말고 초기화를 다시 실행합니다.

## 3. LTM 쓰기·검색

<a id="mm-status가-무엇을-보여줘야-하나"></a>
### `mm status`에서 확인할 내용

정상 출력에는 저장소·데이터베이스 경로, 임베딩 제공자, 인덱스 수가 표시됩니다. 처음 추가하거나 색인하기 전 청크 수가 0인 것은 정상입니다.

```bash
mm status
mm status --json
```

### `mm add`가 쓰지 못함

1. `mm status`에서 데이터베이스와 기억 경로를 확인합니다.
2. 현재 사용자가 해당 폴더의 소유자이며 쓸 수 있는지 확인합니다.
3. 민감 정보가 없는 짧은 문장으로 다시 시도합니다.
4. 프로젝트 로컬 계층을 쓴다면 의도한 Git 프로젝트 루트에서 실행합니다.

[빠른 시작 → 기억 저장·검색 확인](/ko/guides/quickstart/#3-기억-저장검색-확인)으로 돌아갑니다.

### `mm search` 결과가 비어 있음

- 추가나 색인 뒤 `mm status`에 청크가 하나 이상 있는지 확인합니다.
- Minimal 프리셋에서는 원본에 실제로 들어 있는 단어로 검색합니다.
- 네임스페이스를 사용했다면 같은 네임스페이스를 지정하거나 에이전트 전용 검색 흐름을 사용합니다.
- 외부 파일이라면 `mm index` 또는 가져오기 뒤 자료 수가 늘었는지 확인합니다.

```bash
mm search "원본에_실제로_있는_단어"
```

출처와 재실행 점검은 [기존 자료 색인·가져오기](/ko/guides/index-and-import/)를 참고하세요.

## 4. 플러그인·MCP 연결

### 클라이언트가 플러그인 명령을 지원하지 않음

이 사이트의 공식 플러그인 경로는 Claude Code와 Codex용입니다. 다른 클라이언트가 `/plugin` 또는 `codex plugin`을 이해하지 못하면 [AI 클라이언트 연결](/ko/guides/connect-ai-client/)의 MCP 전용 설정을 사용하세요.

### 에이전트에 memtomem 도구가 보이지 않음

- MCP `command`는 `memtomem-server`여야 합니다. `memtomem`과 `mm`은 CLI입니다.
- 설정 변경 뒤 클라이언트를 재시작하거나 새 세션을 엽니다.
- Claude Code는 `claude mcp list`, Codex는 `codex mcp list`를 확인합니다.
- 클라이언트에 `mem_status`를 명시적으로 호출하도록 요청합니다.

### GUI 클라이언트가 `memtomem-server`를 찾지 못함

GUI 앱은 터미널과 다른 `PATH`로 시작될 수 있습니다. 설치된 실행 파일을 찾습니다.

```bash
command -v memtomem-server
```

설정의 `command`에 이 절대 경로를 넣고 앱을 완전히 재시작합니다. Windows에서는 `where memtomem-server`를 사용하세요.

### 플러그인 명령이나 도구가 두 번 보임

플러그인이 이미 MCP 서버를 제공할 수 있습니다. 중복된 수동 항목을 제거하고 새 세션에서 목록을 다시 확인하세요. 검색이 잘 보이게 하려고 같은 서버를 두 번 등록하지 마세요.

### 클라이언트마다 기억이 다름

두 클라이언트에서 `mem_status`를 호출해 데이터베이스 경로를 비교합니다. 프로젝트 로컬 기억은 같은 프로젝트 루트와 범위도 사용해야 합니다. 패키지 버전만 같다고 서로 다른 데이터베이스가 내용을 공유하지는 않습니다.

## 5. Web UI

### 브라우저가 열리지 않거나 페이지에 연결되지 않음

```bash
mm web --open
mm web status
```

기본 서버는 루프백에 연결됩니다. 백그라운드 Web UI 로그는 `~/.memtomem/logs/web.log`에 있습니다. [운영 및 API](/ko/ltm/operations/)의 보호 절차 없이 공개 주소에 연결하지 마세요.

## 6. STM 프록시

### 프록시가 아무 동작도 하지 않음

```bash
mms status
mms health
mms doctor
```

`mms add` 또는 `mms init`이 프록시를 켜고 upstream을 추가해야 합니다. `mms doctor`는 FAIL이 없으면 종료 코드 0이며 WARN은 허용됩니다.

### 프록시 도구가 사라짐(64자 제한)

최종 이름은 `mcp__<server>__<prefix>__<tool>`처럼 만들어질 수 있습니다. 64자를 넘으면 도구가 제외될 수 있습니다. STM 서버 이름과 upstream `--prefix`를 줄이고 `mms health`에서 발견한 도구와 실제 표시한 도구 수를 비교하세요.

### `mms stats --source mcp`가 비어 있음

클라이언트가 STM MCP 별칭 대신 내장 도구를 사용했을 가능성이 큽니다. 표시된 `<prefix>__<tool>` 이름을 명시적으로 호출하고 통계를 다시 확인하세요.

### 관련 기억 자동 제시가 동작하지 않음

`mms health`에서 선택형 LTM 연결이 `connected`이고 LTM 서버에 `mem_search`가 보여야 합니다. LTM만 연결되지 않았다면 프록시·압축·캐시는 계속 동작할 수 있습니다.

### 원래 MCP 등록으로 복원

먼저 계획을 확인합니다.

```bash
mms eject SERVER_NAME --dry-run
mms eject SERVER_NAME
```

복원 전후 확인은 [MCP 서버에 STM 추가](/ko/guides/stm-first-proxy/)를 참고하세요.

## 7. 로그·파일

- LTM·STM MCP 로그는 기본적으로 stderr로 출력되며 실행한 클라이언트가 저장하거나 버립니다.
- LTM 로그 수준은 `MEMTOMEM_LOG_LEVEL`로 조정합니다.
- STM 파일 로그는 `MEMTOMEM_STM_LOG_FILE`을 설정해야 생성됩니다.
- 백그라운드 Web UI 로그는 `~/.memtomem/logs/web.log`에 있습니다.

| 경로 | 내용 |
|---|---|
| `~/.memtomem/memtomem.db` | LTM SQLite 저장소 |
| `~/.memtomem/config.json` | LTM 설정 |
| `~/.memtomem/stm_proxy.json` | STM 프록시 설정 |
| `~/.memtomem/logs/web.log` | 백그라운드 Web UI 로그 |

현재 릴리스의 전체 설정은 [환경 변수](/ko/reference/configuration/)를 참고하세요.
