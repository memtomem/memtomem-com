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
mm web --open        # 기본 브라우저에서 해당 URL을 자동 실행
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

### `mm config unset <key>`

`~/.memtomem/config.json`에서 특정 키의 오버라이드를 제거하여 내장 기본값(또는 `config.d/*.json` 프래그먼트 값)으로 되돌립니다. 다른 머신에서 이전된 `memory_dirs`의 경로, 또는 프래그먼트를 덮고 있는 단일 필드를 정리할 때 유용합니다.

```bash
mm config unset memory_dirs
mm config unset rerank.model
```

### `mm init --fresh`

마법사가 수정하지 않은 필드 중 내장 기본값과 값이 다른 모든 키를 제거한 뒤 설정 마법사를 다시 실행합니다. 이전 버전에서 누적된 설정 항목을 정리하는 안전한 일괄 정리 옵션입니다. 이전 `config.json`은 `config.json.bak-<unix-ts>`로 백업된 후 재작성됩니다.

```bash
mm init --fresh      # 일괄 정리 + 마법사 재실행
```

### `mm purge --matching-excluded`

내장 자격 증명 denylist 또는 사용자 지정 `indexing.exclude_patterns`와 일치하는 이미 인덱싱된 청크를 제거합니다. 기본 동작은 dry-run이며, `--apply` 플래그를 추가해야 실제 삭제가 수행됩니다. v0.1.10 보안 수정 이후 권장되는 정리 워크플로우의 일부입니다.

```bash
mm purge --matching-excluded              # dry-run — 삭제 대상 미리보기
mm purge --matching-excluded --apply      # 실제 삭제 실행
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
