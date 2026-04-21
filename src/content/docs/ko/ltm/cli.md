---
title: CLI 레퍼런스
description: memtomem LTM 서버 관리를 위한 mm CLI 명령어.
---

`mm` 명령어는 `memtomem` 패키지와 함께 설치됩니다. 설정, 검색, 인덱싱, 세션 추적, 런타임 간 컨텍스트 동기화 기능을 제공합니다. 전체 명령 목록은 `mm --help`, 설치된 버전은 `mm --version`으로 확인할 수 있습니다.

## 명령어

### `mm init`

대화형 설정 마법사를 실행합니다. 임베딩 프로바이더, 데이터베이스 경로, 토크나이저, 리랭커, 기본 네임스페이스를 구성합니다.

마법사 시작 시 **프리셋 피커** (Minimal / English / Korean)가 임베딩·리랭커·토크나이저·네임스페이스 기본값 번들을 한 번에 적용합니다. 비대화 모드에서는 `--preset <name>`으로 직접 선택하거나, `--advanced`로 전체 10단계 마법사를 강제 실행할 수 있습니다.

```bash
mm init                              # 대화형 설정 + 프리셋 피커
mm init -y                           # 자동 수락; `--preset minimal -y`와 동일
mm init --preset korean              # 한국어 프리셋을 비대화 모드로 적용
mm init --preset english -y          # 영어 프리셋, 프롬프트 없음
mm init --advanced                   # 피커 생략, 10단계 전체 마법사
```

### MCP 서버 실행

memtomem의 MCP 서버는 `memtomem-server` 콘솔 스크립트로 제공됩니다. 일반적으로 직접 실행하지 않습니다 — MCP 클라이언트(Claude Desktop, Claude Code, Cursor 등)가 자신의 설정 파일에 등록된 항목에 따라 자동으로 기동합니다. 설정 예시는 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.

서버가 노출할 도구 범위를 조정하려면 MCP 클라이언트 설정의 `env`에 `MEMTOMEM_TOOL_MODE`를 지정합니다. 모드와 도구 목록은 [MCP 도구](/ko/ltm/mcp-tools/) 페이지를 참조하세요.

### `mm web`

브라우저 기반 검색 및 기억 관리를 위한 Web UI 대시보드를 실행합니다.

```bash
mm web                               # 기본: http://localhost:8080 (prod 티어)
mm web --port 9000
mm web --open                        # 기본 브라우저에서 URL 자동 실행
mm web --dev                         # --mode dev 의 단축 플래그
mm web --mode dev                    # 메인테이너용 페이지 추가 노출
```

`--mode prod`(기본)는 정돈된 페이지 세트를 노출하고, `--mode dev`는 Sessions · Namespaces · Health Report 등 메인테이너 전용 페이지를 추가로 표시합니다. 기본값은 환경 변수 `MEMTOMEM_WEB__MODE`로도 지정할 수 있습니다.

### `mm search <query>`

커맨드 라인에서 지식 베이스를 검색합니다.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --limit 5
```

### `mm index <path>`

파일 또는 디렉토리를 지식 베이스에 인덱싱합니다. 해시 기반 변경 감지로 증분 인덱싱을 수행합니다.

```bash
mm index .                           # 현재 디렉토리 인덱싱
mm index ~/docs/architecture         # 특정 디렉토리 인덱싱
mm index README.md                   # 단일 파일 인덱싱
```

### `mm ingest`

다른 AI 도구의 기억을 memtomem으로 통합합니다. `--source` 경로는 필수이며, 재실행 시 콘텐츠 해시로 변경된 파일만 증분 반영됩니다.

```bash
mm ingest claude-memory --source ~/.claude/projects/    # Claude Code 메모리 수집
mm ingest codex-memory --source ~/.codex/memories/      # Codex CLI 메모리 수집
```

### `mm session`

에이전트 세션을 관리합니다 — start · end · list · events · wrap. 세션은 활동 이벤트를 묶어 에이전트 런타임에 연결합니다.

```bash
mm session start --agent-id claude-code --title "리팩터링 auth"
mm session list --json                           # 스크립트용 JSON 출력
mm session events <session-id> --json            # 이벤트 타임라인 JSON
mm session wrap -- <command...>                  # 명령어 실행 전후로 세션 자동 start/end
mm session end
```

현재 세션 ID는 `~/.memtomem/.current_session`에 저장되어 `mm activity log` 등 후속 명령이 자동으로 참조합니다.

### `mm activity log`

현재 세션에 활동 이벤트(도구 호출, 결정, 오류, 서브에이전트 라이프사이클)를 기록합니다. 훅 호출이 실패하지 않도록 기본은 침묵 출력이며, `--json`을 지정하면 스크립트용 ack를 내보냅니다.

```bash
mm activity log --type tool_call --content "ran tests"
mm activity log --type decision --content "전략 X 채택" --meta '{"k":"v"}' --json
```

`--json` 옵션에서는 성공 시 `{"ok": true, ...}`, 활성 세션이 없거나 쓰기 실패 시 `{"ok": false, "reason": ...}`을 stdout으로 내보냅니다. 종료 코드는 항상 0입니다.

### `mm context sync`

Context Gateway를 통해 에이전트 정의, 스킬, 명령어를 런타임 간에 동기화합니다.

```bash
mm context sync                      # 정규 설정 → 모든 런타임
```

### `mm context import`

런타임별 파일을 정규 소스로 역추출합니다.

```bash
mm context import                    # 런타임 파일 → 정규 소스
```

### `mm config show`

현재 설정을 표시합니다(API 키는 마스킹). `--json`(또는 `--format json`)은 전체 설정을 기계 판독용 JSON으로 출력합니다.

```bash
mm config show                       # 읽기 좋은 테이블
mm config show --json                # 스크립트용 JSON
```

### `mm config unset <key>`

`~/.memtomem/config.json`에서 특정 키의 오버라이드를 제거하여 내장 기본값(또는 `config.d/*.json` 프래그먼트 값)으로 되돌립니다. 다른 머신에서 이전된 `memory_dirs` 경로, 또는 프래그먼트를 덮고 있는 단일 필드를 정리할 때 유용합니다.

```bash
mm config unset memory_dirs
mm config unset rerank.model
```

### `mm agent migrate`

구 형식 `agent/{id}` 네임스페이스를 현재 `agent-runtime:{id}` 형식으로 변환합니다. 이미 신형식인 행은 건드리지 않으므로 반복 실행해도 안전합니다. 변경 전 확인용으로 `--dry-run`을 사용하세요.

```bash
mm agent migrate --dry-run           # 변경 계획만 출력
mm agent migrate                     # 실제 적용
```

### `mm init --fresh`

마법사가 수정하지 않은 필드 중 내장 기본값과 값이 다른 모든 키를 제거한 뒤 설정 마법사를 다시 실행합니다. 이전 버전에서 누적된 설정 항목을 정리하는 안전한 일괄 정리 옵션입니다. 이전 `config.json`은 `config.json.bak-<unix-ts>`로 백업된 후 재작성됩니다.

```bash
mm init --fresh                      # 일괄 정리 + 마법사 재실행
```

### `mm purge --matching-excluded`

내장 자격 증명 denylist 또는 사용자 지정 `indexing.exclude_patterns`와 일치하는 이미 인덱싱된 청크를 제거합니다. 기본 동작은 dry-run이며, `--apply` 플래그를 추가해야 실제 삭제가 수행됩니다.

```bash
mm purge --matching-excluded              # dry-run — 삭제 대상 미리보기
mm purge --matching-excluded --apply      # 실제 삭제 실행
```

## 예제 워크플로우

```bash
# 1. 초기 설정 (프리셋 피커가 대화형으로 실행됨)
mm init

# 2. 프로젝트 인덱싱
mm index ~/projects/my-app

# 3. 기존 AI 도구 메모리 수집
mm ingest claude-memory --source ~/.claude/projects/

# 4. CLI에서 검색
mm search "database migration patterns"

# 5. Web UI로 기억 탐색
mm web --open
```

MCP 서버는 `memtomem`이 MCP 클라이언트에 등록되면 해당 AI 클라이언트 하위에서 자동 실행됩니다.

> 전체 시작 가이드는 [빠른 시작](/ko/guides/quickstart/)을 참조하세요.
