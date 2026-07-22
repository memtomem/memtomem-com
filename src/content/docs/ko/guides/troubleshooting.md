---
title: 문제 해결
description: 설치, MCP 연결, STM 프록시·서피싱에서 자주 겪는 문제와 해결 방법.
---

처음 설정에서 자주 마주치는 증상과 해결 방법을 모았습니다. 위에서 아래로 흔한 순서대로 정리되어 있습니다.

## 설치

### `mm: command not found` / `mms: command not found`

설치는 끝났지만 셸이 명령을 찾지 못하는 경우입니다. `uv`가 명령 파일을 설치하는 `~/.local/bin`이 `PATH`에 없을 수 있습니다. 다음을 실행하고 터미널을 다시 여세요.

```bash
uv tool update-shell
```

`pipx`로 설치했다면 `pipx ensurepath`가 같은 역할을 합니다.

### `mm --version`이 오래된 버전을 출력

설치 직후 캐시된 패키지 메타데이터 때문에 이전 버전이 잡히는 경우가 있습니다. 메타데이터를 갱신하며 다시 설치하세요:

```bash
uv tool install 'memtomem[all]' --refresh
```

## LTM 연결 점검

<a id="mm-status가-무엇을-보여줘야-하나"></a>

### `mm status`에서 확인할 내용

`mm status`는 설치 후 가장 먼저 실행할 점검 명령입니다. 저장소 경로, 임베딩 제공자, 청크 수가 표시되면 정상입니다. **`mm index`를 실행하기 전에는 청크가 0개여도 문제없습니다.** 색인 후 다시 확인하면 수가 늘어납니다. 스크립트에서는 `mm status --json`으로 JSON 결과를 받을 수 있습니다.

### 에이전트에 memtomem 도구가 보이지 않음

에이전트에게 "`mem_status`를 호출해줘"라고 요청했는데 도구가 없다고 하면, 대부분 MCP 설정의 command 문제입니다.

- `command`에는 `memtomem-server`를 사용해야 합니다. `memtomem`은 CLI이므로 MCP 서버를 실행하지 않습니다.
- Claude Code에서는 `claude mcp list`로 등록 여부를 확인하세요. 다른 클라이언트에서는 설정 파일의 `mcpServers` 항목을 확인합니다. 자세한 내용은 [빠른 시작 → MCP 클라이언트 연결](/ko/guides/quickstart/#4-mcp-클라이언트-연결)을 참고하세요.
- 설정을 고친 뒤에는 클라이언트를 재시작해야 새 서버가 실행됩니다.

## STM 프록시

### 프록시 도구가 사라짐 (64자 이름 제한)

STM 프록시의 도구 이름은 `<prefix>__<tool>` 형식입니다. 클라이언트는 이를 `mcp__<server>__<prefix>__<tool>`로 조합할 수 있습니다. 최종 이름이 **64자를 넘으면 오류 없이 도구 목록에서 빠질 수 있습니다.** 다음 두 방법으로 해결하세요.

- 연결 서버의 `--prefix`를 더 짧게 지정합니다(예: `filesystem` → `fs`).
- STM을 짧은 클라이언트 이름 `mms`로 등록하고 **동시에** `MMS_CLIENT_SERVER_NAME=mms`를 export합니다. `mms init --client claude`는 기본적으로 더 긴 이름 `memtomem-stm`으로 등록하므로, 3자 이름의 여유분을 자동으로 얻지는 못합니다.

`mms health`의 발견된 도구 수(discovered)와 표시된 도구 수(advertised)를 비교하면 제외된 도구가 있는지 확인할 수 있습니다.

### 프록시가 아무 동작도 하지 않음

STM 설정의 `proxy.enabled`는 기본값이 `false`이며, `mms add` 또는 `mms init`이 설정을 기록해야 켜집니다. 다음 순서로 확인하세요.

```bash
mms status    # 프록시가 활성화되어 올바른 설정 파일을 가리키는가?
mms health    # 등록한 서버에 실제로 연결되는가?
```

### 서피싱(자동 기억 주입)이 동작하지 않음

STM은 SURFACE 단계에서 LTM을 검색하고 관련 기억을 응답에 덧붙입니다. `mms health`에서 LTM 상태가 `connected`로 표시되어야 합니다.

- LTM 서버가 도구 목록에 `mem_search`를 공개해야 `connected`로 표시됩니다. 서피싱에 필요한 도구이기 때문입니다.
- LTM의 기본 실행 명령은 `ltm_mcp_command=memtomem-server`입니다. 다른 명령을 사용한다면 `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND`에 같은 값을 설정하세요.

## 로그는 어디에 있나

- **MCP 서버 로그**(LTM `memtomem-server`, STM `mms`)는 기본적으로 **stderr**로 출력됩니다. 서버를 실행한 MCP 클라이언트가 이 로그를 저장하거나 버립니다. 로그 수준은 `MEMTOMEM_LOG_LEVEL`로 조정합니다.
- **STM 파일 로그**는 기본적으로 꺼져 있습니다. `MEMTOMEM_STM_LOG_FILE`을 설정하면 일정 크기마다 새 파일로 교체되는 로그가 생성됩니다(0.1.32에서 강화).
- **Web UI 로그**는 `~/.memtomem/logs/web.log`에 있습니다(`mm web -b`로 백그라운드 실행 시). 이는 MCP 서버 로그가 아니라 Web UI 전용 로그입니다.

## 파일 위치 요약

| 경로 | 내용 |
|---|---|
| `~/.memtomem/memtomem.db` | LTM SQLite 저장소(청크 + 벡터) |
| `~/.memtomem/config.json` | LTM 설정 |
| `~/.memtomem/stm_proxy.json` | STM 프록시 설정 |
| `~/.memtomem/logs/web.log` | Web UI 로그 |

더 자세한 설정 키는 [환경 변수](/ko/reference/configuration/)를 참고하세요.
