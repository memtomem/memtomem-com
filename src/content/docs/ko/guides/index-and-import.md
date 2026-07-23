---
title: 기존 자료 색인·가져오기
description: 노트 폴더나 Claude·Codex·Gemini/Antigravity 내장 기억을 안전하게 가져와 검색 결과와 출처를 확인합니다.
---

**예상 시간:** 10분

**목표:** 작은 자료 하나를 가져오고, 알고 있는 문구를 검색해 출처 경로까지 확인합니다.

먼저 [빠른 시작](/ko/guides/quickstart/)을 완료하세요.

## 알맞은 명령 고르기

| 자료 | 사용할 명령 | 동작 |
|---|---|---|
| 노트·문서·코드·Obsidian vault·내보낸 Notion 파일 | `mm index PATH` | 선택한 파일이나 폴더를 현재 위치에서 색인 |
| Claude Code auto-memory 폴더 | `mm ingest claude-memory` | `claude-memory:<slug>` 네임스페이스에 읽기 전용 스냅샷 생성 |
| Codex memories 폴더 | `mm ingest codex-memory` | `codex-memory:<slug>` 네임스페이스에 읽기 전용 스냅샷 생성 |
| Gemini·Antigravity `GEMINI.md` | `mm ingest gemini-memory` | `gemini-memory:<slug>` 네임스페이스에 읽기 전용 스냅샷 생성 |

두 명령 모두 원본 파일을 지우거나 고치지 않습니다. 백그라운드 감시도 시작하지 않습니다. 변경 내용을 반영하고 싶을 때 같은 작업을 다시 실행하세요.

## 경로 A: 노트·코드 폴더 색인

자격 증명이나 개인정보가 없는 작은 폴더부터 시작합니다. 편집기에서 `memtomem-demo-notes/deployment.md` 파일을 만들고 다음 내용을 저장하세요.

```markdown
# 배포 결정

blue-green 배포를 사용한다. 트래픽 전환 전에 smoke suite를 실행한다.
```

폴더를 색인하고 검색합니다.

```bash
mm index ./memtomem-demo-notes
mm status
mm search "smoke suite 트래픽 전환"
```

결과에 저장한 문장과 `memtomem-demo-notes/deployment.md`로 끝나는 출처 경로가 나오면 성공입니다.

문장 하나를 고친 뒤 같은 색인 명령을 다시 실행하세요. 바뀌지 않은 청크는 건너뛰고, 바뀐 청크만 갱신합니다.

```bash
mm index ./memtomem-demo-notes
mm search "smoke suite 트래픽 전환"
```

Markdown, Python, JavaScript, TypeScript, JSON, YAML, TOML 자료도 같은 `mm index` 흐름을 사용합니다. 지원 형식과 전체 색인 옵션은 [LTM CLI 레퍼런스](/ko/ltm/cli/#mm-index-path)에 있습니다.

## 경로 B: AI 도구 내장 기억 가져오기

항상 미리보기부터 실행하세요. 예시 경로는 내 컴퓨터에 실제로 있는 자료 경로로 바꿉니다.

### Claude Code

```bash
mm ingest claude-memory --source ~/.claude/projects/PROJECT_SLUG/memory/ --dry-run
mm ingest claude-memory --source ~/.claude/projects/PROJECT_SLUG/memory/
mm search "CLAUDE_MEMORY에_실제로_있는_문구" --namespace claude-memory:PROJECT_SLUG
```

여러 프로젝트 기억 폴더를 찾으려면 `~/.claude/projects/`를 소스로 지정할 수도 있습니다.

### Codex CLI

```bash
mm ingest codex-memory --source ~/.codex/memories/ --dry-run
mm ingest codex-memory --source ~/.codex/memories/
mm search "CODEX_MEMORY에_실제로_있는_문구"
```

### Gemini·Antigravity

```bash
mm ingest gemini-memory --source ~/.gemini/GEMINI.md --dry-run
mm ingest gemini-memory --source ~/.gemini/GEMINI.md
mm search "GEMINI_MD에_실제로_있는_문구"
```

`--dry-run`은 청크 수를 바꾸지 않고 찾은 파일만 보여 줘야 합니다. 적용 명령은 자료별 네임스페이스에 내용을 색인합니다. 같은 적용 명령을 다시 실행하면 내용 해시가 같은 파일은 건너뜁니다.

## 다음 단계로 가기 전 확인

각 자료에 대해 다음 순서로 확인합니다.

1. 원본에서 민감 정보가 없는 고유한 문구를 복사합니다.
2. 같은 문구를 검색합니다.
3. 결과의 네임스페이스와 절대 출처 경로가 예상과 같은지 확인합니다.
4. 같은 가져오기 명령을 다시 실행해 바뀌지 않은 파일을 건너뛰는지 확인합니다.

검색 결과가 비어 있으면 다음 명령으로 다시 확인하세요.

```bash
mm status
mm search "파일에_실제로_있는_문구"
```

Minimal 프리셋은 키워드 검색을 사용합니다. 첫 검증에서는 원본에 실제로 들어 있는 단어로 검색하세요. 의미 검색은 나중에 `mm init`을 다시 실행해 English 또는 Korean-optimized 프리셋으로 추가할 수 있습니다.

## 안전 범위

- API 키, 토큰, 비밀번호, 개인 키, 개인정보, 대화 원문 전체를 색인하지 마세요.
- 사용자가 제외 패턴을 반대로 지정해도 내장 자격 증명 제외 규칙은 유지됩니다.
- `mm ingest`는 사용자가 직접 실행하는 읽기 전용 스냅샷입니다. 플러그인 설치, MCP 연결, STM 활성화만으로 자동 실행되지 않습니다.
- 가져오기를 적용하기 전에 `--dry-run`에서 경로와 파일 수를 확인하세요.
- 선택한 제공자가 외부로 내용을 보낼 수 있는지는 [로컬 우선 · 정보 보호](/ko/guides/privacy/)에서 확인하세요.

## 다음 단계

- [AI 클라이언트 연결](/ko/guides/connect-ai-client/)
- [하이브리드 검색](/ko/ltm/hybrid-search/)
- [멀티 에이전트 협업](/ko/ltm/multi-agent/)
- [문제 해결](/ko/guides/troubleshooting/)
