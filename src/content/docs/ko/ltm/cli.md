---
title: CLI 레퍼런스
description: memtomem LTM 서버 관리를 위한 mm CLI 명령어.
---

`mm` 명령어는 `memtomem` 패키지와 함께 설치됩니다. 설정, 검색, 인덱싱, 세션 추적, 런타임 간 컨텍스트 동기화 기능을 제공합니다. 전체 명령 목록은 `mm --help`, 설치된 버전은 `mm --version`(또는 `mm version` 서브명령)으로 확인할 수 있습니다.

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

재설치 경로에서 `mm init`은 기존 `~/.memtomem/memtomem.db`에 저장된 임베딩 프로바이더·모델·차원이 새 프리셋과 일치하는지 검사합니다. 불일치가 감지되면 대화형에서는 벡터 인덱스(`chunks_vec`)의 in-place 재생성을 제안하고, `-y` 비대화 모드에서는 `mm embedding-reset --mode apply-current` 복구 안내를 출력합니다. 청크 테이블은 보존되므로 이후 `mm index <path>`로 재인덱싱하면 작업 집합이 복원됩니다.

### MCP 서버 실행

memtomem의 MCP 서버는 `memtomem-server` 콘솔 스크립트로 제공됩니다. 일반적으로 직접 실행하지 않습니다 — MCP 클라이언트(Claude Desktop, Claude Code, Cursor 등)가 자신의 설정 파일에 등록된 항목에 따라 자동으로 기동합니다. 설정 예시는 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.

서버가 노출할 도구 범위를 조정하려면 MCP 클라이언트 설정의 `env`에 `MEMTOMEM_TOOL_MODE`를 지정합니다. 모드와 도구 목록은 [MCP 도구](/ko/ltm/mcp-tools/) 페이지를 참조하세요.

### `mm web`

브라우저 기반 검색 및 기억 관리를 위한 Web UI 대시보드를 실행합니다.

`mm web` 을 실행하면 `http://127.0.0.1:8080` 에서 대시보드가 열리며 다음 탭이 제공됩니다: **Home · Search · Sources · Index · Tags · Timeline · More**. **More** 탭에는 Settings, Dedup, Age-out, Export/Import, Reset Database 가 포함됩니다.

`--dev` 를 전달하거나 `MEMTOMEM_WEB__MODE=dev` 를 설정하면 유지보수용 페이지가 추가로 노출됩니다: **Namespaces, Sessions, Working Memory, Health Report**. 대부분의 사용자는 필요하지 않습니다.

```bash
mm web                               # 기본: http://localhost:8080 (prod 티어)
mm web --port 9000
mm web --open                        # 기본 브라우저에서 URL 자동 실행
mm web --dev                         # --mode dev 의 단축 플래그
mm web --mode dev                    # 메인테이너용 페이지 추가 노출
```

### `mm search <query>`

커맨드 라인에서 지식 베이스를 검색합니다.

```bash
mm search "how does the auth middleware work"
mm search "deployment config" --namespace project-x --limit 5
```

### `mm index <path>`

디스크에 이미 존재하는 파일을 **한 번에 시드**하는 one-shot 명령입니다. 해시 기반 변경 감지로 증분 인덱싱을 수행하므로 재실행은 안전합니다.

```bash
mm index .                           # 현재 디렉토리 인덱싱
mm index ~/docs/architecture         # 특정 디렉토리 인덱싱
mm index README.md                   # 단일 파일 인덱싱
```

`indexing.memory_dirs` 에 등록된 경로는 `mm server` 가 시작하는 파일 워처가 **반응형(reactive)** 으로 감시합니다 — 워처 기동 이후에 발생하는 modify/create/move 이벤트만 재인덱싱하므로, 기동 시점에 **이미 존재하던 파일은 자동 스캔되지 않습니다**. 그래서 `mm index <dir>` (또는 `mem_index(path="<dir>")`) 로 한 번 시드한 뒤 워처에 맡기는 흐름이 기본입니다. `mm init` 마법사의 `Next steps` 가 `mm index {memory_dir}` 를 1단계로 출력하는 이유이기도 합니다.

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

### `mm embedding-reset`

저장된 임베딩 모델/차원과 현재 설정이 어긋났을 때(주로 프로바이더 교체·재설치 경로) 상태를 점검하거나 복구합니다. `--mode`로 동작을 선택합니다.

```bash
mm embedding-reset                            # --mode status (기본): DB 저장값 vs 현재 설정 비교
mm embedding-reset --mode apply-current       # DB를 현재 설정으로 재설정 (파괴적 — 재인덱싱 필요)
mm embedding-reset --mode revert-to-stored    # 런타임 임베더를 DB 저장값에 맞춤 (비파괴적)
```

`apply-current`는 `chunks_vec`를 현재 설정의 차원으로 재생성합니다. 청크 테이블 자체는 보존되지만 모든 벡터가 삭제되므로 이후 `mm index <path>`로 재인덱싱해야 합니다. `revert-to-stored`는 설정을 바꾸지 않고 런타임만 DB 저장값으로 되돌리므로, 해당 상태를 영구화하려면 `~/.memtomem/config.json`에서 임베딩 필드를 직접 맞춰주세요.

### `mm purge --matching-excluded`

내장 자격 증명 denylist 또는 사용자 지정 `indexing.exclude_patterns`와 일치하는 이미 인덱싱된 청크를 제거합니다. 기본 동작은 dry-run이며, `--apply` 플래그를 추가해야 실제 삭제가 수행됩니다.

```bash
mm purge --matching-excluded              # dry-run — 삭제 대상 미리보기
mm purge --matching-excluded --apply      # 실제 삭제 실행
```

### `mm uninstall`

바이너리 제거와는 별개로 `~/.memtomem/` 상태(설정·DB·프래그먼트·백업·업로드)를 정리합니다. `uv tool uninstall memtomem` 같은 패키지 매니저 명령은 바이너리만 제거하므로, 재설치 시 구 버전 상태가 그대로 남아 문제가 될 수 있습니다 — v0.1.23부터 이 간극을 닫는 전용 명령이 추가되었습니다.

```bash
mm uninstall                  # 대화형, 전체 삭제
mm uninstall -y               # 확인 프롬프트 스킵
mm uninstall --keep-config    # config.json + config.d/* + 백업 보존
mm uninstall --keep-data      # SQLite DB + ~/.memtomem/memories/ 보존
mm uninstall --force          # 서버 실행 중 안전장치 우회
```

이 명령은 기본 경로 바깥의 `storage.sqlite_path` 도 인벤토리에 포함시키고, WAL 손상 위험 때문에 MCP 서버가 살아 있을 때는 실행을 거부합니다. 외부 에디터의 MCP 엔트리(`~/.claude.json`, `~/.codex/config.toml` 등)는 감지해서 경로만 알려주며 수정하지는 않습니다. 실행 후 마지막에 설치 컨텍스트에 맞는 바이너리 제거 명령(예: `uv tool uninstall memtomem`, `pip uninstall memtomem`)을 출력하므로 그 단계를 이어서 수행하면 됩니다.

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
