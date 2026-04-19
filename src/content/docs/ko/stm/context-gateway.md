---
title: Context Gateway
description: 에이전트 정의·스킬·커맨드를 6종 런타임에 자동 동기화.
---

여러 AI 런타임(Claude Code, Gemini CLI, Codex CLI 등)을 병행 사용하는 경우, 각 런타임은 에이전트 정의·스킬·커맨드를 고유한 포맷과 디렉터리에 저장합니다. Context Gateway는 이들을 하나의 정규 폴더에서 동기화하므로, 단일 파일 수정만으로 모든 런타임에 반영됩니다.

Context Gateway는 에이전트 정의, 스킬, 커맨드를 하나의 정규 소스(`.memtomem/`)에서 여러 AI 에디터 런타임으로 자동 동기화합니다. 하나의 에이전트를 정의하면 6종 AI 에디터에서 동일하게 동작합니다.

## 동기화 구조

```
.memtomem/                  # 정규(canonical) 소스
├── agents/                 # 에이전트 정의
├── skills/                 # 스킬 정의
└── commands/               # 커맨드 정의

     ↕ 자동 동기화

.claude/agents/             # Claude Code
.claude/skills/             # Claude Code
.gemini/agents/             # Gemini CLI
.gemini/skills/             # Gemini CLI
~/.codex/agents/            # Codex CLI
```

## 양방향 추출

기존에 Claude Code나 Gemini CLI에서 만든 에이전트/스킬 파일이 있다면, 정규 소스로 역추출할 수 있습니다:

```bash
mm context import            # 기존 런타임 파일 → .memtomem/ 역추출
mm context sync              # .memtomem/ → 모든 런타임 동기화
```

## 포맷 변환

런타임마다 설정 포맷이 다릅니다. Context Gateway가 자동으로 변환합니다:

| 런타임 | 포맷 |
|---|---|
| Claude Code / Gemini CLI | Markdown + YAML frontmatter |
| Codex CLI | TOML |

변환 시 필드 손실이 발생하면 심각도별로 추적합니다:

| 심각도 | 동작 |
|---|---|
| `ignore` | 무시 (해당 런타임에서 지원하지 않는 필드) |
| `warn` | 경고 출력 후 진행 |
| `error` | 변환 중단 |

## 지원 런타임

| 런타임 | 에이전트 | 스킬 | 커맨드 |
|---|---|---|---|
| Claude Code | O | O | O |
| Gemini CLI | O | O | - |
| Codex CLI | O | - | - |
| Cursor | O | - | - |
| Windsurf | O | - | - |
| Claude Desktop | O | - | - |

## LangGraph 어댑터

LangGraph/CrewAI 에이전트에서 Context Gateway를 통해 에이전트 정의와 스킬을 로드할 수 있습니다:

```python
from memtomem.context import load_agent_definition

# .memtomem/agents/ 에서 에이전트 정의 로드
agent_def = load_agent_definition("analyzer")
```
