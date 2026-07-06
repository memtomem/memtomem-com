---
title: 문제 해결
description: 설치, MCP 연결, STM 프록시·서피싱에서 자주 겪는 문제와 해결 방법.
---

처음 설정에서 자주 마주치는 증상과 해결 방법을 모았습니다. 위에서 아래로 흔한 순서대로 정리되어 있습니다.

## 설치

### `mm: command not found` / `mms: command not found`

설치는 됐지만 셸이 명령을 찾지 못하는 경우입니다. `uv`가 실행 파일 shim을 두는 `~/.local/bin`이 `PATH`에 없기 때문입니다. 다음을 실행하고 터미널을 다시 여세요:

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

### `mm status`가 무엇을 보여줘야 하나

`mm status`는 설치 후 첫 점검 명령입니다. 저장소 경로, 임베딩 프로바이더, 청크 수 요약이 나오면 정상입니다. **아직 `mm index`를 실행하기 전이라면 청크가 0개인 것이 정상입니다** — 인덱싱 후 다시 확인하면 늘어납니다. 스크립트에서 다루려면 `mm status --json`으로 기계가 읽을 수 있는 형태를 받을 수 있습니다.

### 에이전트에 memtomem 도구가 보이지 않음

에이전트에게 "`mem_status`를 호출해줘"라고 요청했는데 도구가 없다고 하면, 대부분 MCP 설정의 command 문제입니다.

- command가 반드시 `memtomem-server`여야 합니다 — `memtomem`은 CLI이며 MCP 서버를 기동하지 않습니다.
- Claude Code라면 `claude mcp list`로 등록 여부를, 다른 클라이언트라면 설정 파일의 `mcpServers` 블록을 확인하세요([Quick Start → MCP 클라이언트 연결](/ko/guides/quickstart/#4-mcp-클라이언트-연결) 참고).
- 설정을 고친 뒤에는 클라이언트를 재시작해야 새 서버가 기동됩니다.

## STM 프록시

### 프록시 도구가 사라짐 (64자 이름 제한)

STM의 프록시 도구는 `<prefix>__<tool>`로 노출되고, 클라이언트가 이를 `mcp__<server>__<prefix>__<tool>`로 합성합니다. 이 합성 이름이 **64자를 넘으면 해당 도구는 조용히 제외됩니다.** 두 가지 해결책이 있습니다:

- 업스트림 `--prefix`를 더 짧게 지정합니다(예: `filesystem` → `fs`).
- STM을 짧은 클라이언트 이름 `mms`로 등록하고 **동시에** `MMS_CLIENT_SERVER_NAME=mms`를 export합니다. `mms init --mcp claude`는 기본적으로 더 긴 이름 `memtomem-stm`으로 등록하므로, 3자 이름의 여유분을 자동으로 얻지는 못합니다.

`mms health`로 discovered / advertised 도구 수를 확인해 무엇이 제외됐는지 진단할 수 있습니다.

### 프록시가 아무 동작도 하지 않음

STM 설정의 `proxy.enabled`는 기본값이 `false`이며, `mms add` 또는 `mms init`이 설정을 기록해야 켜집니다. 다음으로 확인하세요:

```bash
mms status    # 프록시가 활성화되어 올바른 설정 파일을 가리키는가?
mms health    # 업스트림에 실제로 연결되는가?
```

### 서피싱(자동 기억 주입)이 동작하지 않음

STM은 SURFACE 단계에서 LTM에 질의해 관련 기억을 주입합니다. 이 연결이 준비되어야 하며, `mms health`가 LTM을 `connected`로 보고해야 합니다.

- LTM 서버가 `mem_search`를 광고해야 `connected`로 잡힙니다 — 서피싱 어댑터에 필요한 도구입니다.
- 기본 LTM 기동 명령은 `ltm_mcp_command=memtomem-server`입니다. LTM을 다른 방식으로 실행한다면 `MEMTOMEM_STM_SURFACING__LTM_MCP_COMMAND`로 맞추세요.

## 로그는 어디에 있나

- **MCP 서버 로그**(LTM `memtomem-server`, STM `mms`)는 기본적으로 **stderr**로 나가며, 이를 기동한 MCP 클라이언트가 캡처하거나 버립니다. 상세도는 `MEMTOMEM_LOG_LEVEL`로 조정합니다.
- **STM 파일 로그**는 기본적으로 꺼져 있습니다(opt-in). `MEMTOMEM_STM_LOG_FILE`을 설정하면 일정 크기마다 새로 쓰는(rotating) 로그 파일이 생깁니다(0.1.32에서 강화).
- **Web UI 로그**는 `~/.memtomem/logs/web.log`에 있습니다(`mm web -b`로 백그라운드 실행 시). 이는 MCP 서버 로그가 아니라 Web UI 전용 로그입니다.

## 파일 위치 요약

| 경로 | 내용 |
|---|---|
| `~/.memtomem/memtomem.db` | LTM SQLite 저장소(청크 + 벡터) |
| `~/.memtomem/config.json` | LTM 설정 |
| `~/.memtomem/stm_proxy.json` | STM 프록시 설정 |
| `~/.memtomem/logs/web.log` | Web UI 로그 |

더 자세한 설정 키는 [환경 변수](/ko/reference/configuration/)를 참고하세요.
