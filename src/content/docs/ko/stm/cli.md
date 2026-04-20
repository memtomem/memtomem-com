---
title: CLI 레퍼런스
description: memtomem-stm 프록시 관리를 위한 mms CLI 명령어.
---

`mms` 명령어는 `memtomem-stm` 패키지와 함께 설치됩니다. 업스트림 서버 등록과 프록시 라이프사이클을 관리합니다.

## 명령어

### `mms add <name>`

STM을 통해 프록시할 업스트림 MCP 서버를 등록합니다.

```bash
mms add filesystem --command filesystem-server
mms add github --command github-mcp --args "--token $GH_TOKEN" --prefix gh_
```

| Flag | Description |
|------|-------------|
| `--command` | 실행할 서버 명령어 |
| `--args` | 서버에 전달할 인수 |
| `--prefix` | 이름 충돌 방지를 위한 도구 이름 접두사 |

### `mms list`

등록된 모든 업스트림 서버를 조회합니다.

```bash
mms list
```

### `mms remove <name>`

등록된 업스트림 서버를 제거합니다.

```bash
mms remove filesystem
```

### `mms serve`

STM 프록시 서버를 시작합니다. 등록된 모든 업스트림 서버를 실행하고 프록시를 시작합니다.

```bash
mms serve            # default: stdio transport
mms serve --transport sse --port 8770
```

### `mms stats`

캐시 적중률, 압축률, 서피싱 지표를 포함한 프록시 통계를 표시합니다.

```bash
mms stats
```

## 예제 워크플로우

```bash
# 1. Register upstream servers
mms add memtomem --command memtomem-server
mms add filesystem --command filesystem-server --prefix fs_

# 2. Start the proxy
mms serve

# 3. Check proxy stats
mms stats
```

이제 에이전트는 개별 서버 대신 STM에 연결합니다. 모든 업스트림 도구가 프록시를 통해 사용 가능하며, 자동 기억 서피싱과 응답 압축이 적용됩니다.

> 설정 방법은 [설치 가이드](/ko/guides/installation/), 서피싱 작동 방식은 [능동적 서피싱](/ko/stm/surfacing/)을 참조하세요.
