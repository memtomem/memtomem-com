---
title: CLI 레퍼런스
description: memtomem LTM 서버 관리를 위한 mm CLI 명령어.
---

`mm` 명령어는 `memtomem` 패키지와 함께 설치됩니다. 서버 관리, 검색, 인덱싱, 크로스 런타임 컨텍스트 동기화 기능을 제공합니다.

## 명령어

### `mm init`

대화형 8단계 설정 마법사를 실행합니다. 임베딩 프로바이더, 데이터베이스 경로, 기본 네임스페이스를 설정합니다.

```bash
mm init              # interactive setup
mm init -y           # auto-accept defaults (for CI)
```

### `mm serve`

memtomem MCP 서버를 시작합니다.

```bash
mm serve             # default: stdio transport
mm serve --transport sse --port 8765
mm serve --transport http --port 8765
```

### `mm web`

브라우저 기반 검색 및 기억 관리를 위한 Web UI 대시보드를 실행합니다.

```bash
mm web               # default: http://localhost:8766
mm web --port 9000
```

### `mm search <query>`

커맨드 라인에서 지식 베이스를 검색합니다.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --limit 5
```

### `mm index <path>`

파일 또는 디렉토리를 지식 베이스에 인덱싱합니다. 해시 기반 변경 감지를 사용하여 증분 인덱싱을 수행합니다.

```bash
mm index .                    # index current directory
mm index ~/docs/architecture  # index a specific directory
mm index README.md            # index a single file
```

### `mm ingest`

다른 AI 도구의 기억을 memtomem으로 통합합니다.

```bash
mm ingest claude-memory    # import Claude Code memories
mm ingest gemini-memory    # import Gemini CLI memories
mm ingest codex-memory     # import Codex CLI memories
```

### `mm context sync`

Context Gateway를 통해 에이전트 정의, 스킬, 명령어를 런타임 간에 동기화합니다.

```bash
mm context sync      # push canonical config → all runtimes
```

### `mm context import`

런타임별 파일을 정규 소스로 역추출합니다.

```bash
mm context import    # pull runtime files → canonical source
```

## 예제 워크플로우

```bash
# 1. Initial setup
mm init

# 2. Index your project
mm index ~/projects/my-app

# 3. Import existing AI tool memories
mm ingest claude-memory

# 4. Search from CLI
mm search "database migration patterns"

# 5. Start the MCP server for agent access
mm serve
```

> 전체 시작 가이드는 [빠른 시작](/ko/guides/quickstart/)을 참조하세요.
