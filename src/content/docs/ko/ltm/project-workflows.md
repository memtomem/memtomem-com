---
title: 프로젝트 워크플로
description: handoff, brief, update로 한 Git 프로젝트의 작업을 다른 세션이나 AI 도구로 넘기고, 작업 전에 맥락을 확인하고, 작업 후에 결정을 저장합니다.
---

한 저장소에서 작업을 이어 가다 보면 같은 질문이 반복됩니다. 어제 Claude Code에서 어디까지 했는지, 이 작업과 관련해 어떤 결정이 있었는지, 오늘 정한 내용을 다음 세션이 알 수 있는지입니다. memtomem 플러그인에 포함된 세 가지 프로젝트 워크플로는 이 질문을 프로젝트 기억으로 해결합니다. 기록은 저장소의 `project_local` tier에 남으므로 같은 로컬 memtomem 저장소를 사용하는 다른 AI 도구에서도 읽을 수 있습니다.

다음과 같은 경우에 사용합니다.

- **`handoff`** — 작업을 다른 세션이나 다른 AI 도구에 넘길 때. 진행 상황을 짧은 기록으로 저장(`save`)하고, 이어받는 쪽에서 불러옵니다(`resume`).
- **`brief`** — 작업을 시작하기 전에 관련 결정, 최근 업데이트, 대기 중인 handoff, 사용자 선호를 한 번에 확인할 때. 읽기 전용입니다.
- **`update`** — 작업을 마친 뒤 세션 결과와 최근 커밋에서 오래 유지할 결정, 버그 원인, 선호만 골라 저장할 때.

세 워크플로는 사용자가 명시적으로 요청해 실행하도록 설계되었습니다. Claude Code와 Codex CLI에서는 에이전트가 자동으로 호출하지 않도록 설정되어 있습니다. 대화 전체를 기록하거나 여러 에이전트의 동시 작업을 조율하지는 않습니다.

<figure class="flow-diagram">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 500" role="img" aria-labelledby="loop-flow-title loop-flow-desc">
<title id="loop-flow-title">handoff, brief, update로 이어지는 흐름</title>
<desc id="loop-flow-desc">세션 1의 Claude Code에서 /memtomem:handoff save를 실행하면 프로젝트의 .memtomem/memories.local Markdown 파일에 기록 하나가 저장됩니다. 세션 2의 Codex CLI에서 $memtomem-brief는 최근 업데이트와 handoff ID를 보여 주고, $memtomem-handoff resume은 그 기록을 불러옵니다. 작업하고 커밋한 뒤 다시 Claude Code에서 /memtomem:update를 실행하면 결정, 버그 원인, 선호가 같은 파일에 저장됩니다.</desc>
<defs><marker id="loop-flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-head" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<rect class="fd-box" x="20" y="16" width="270" height="64" rx="8"/>
<text class="fd-title" x="155" y="42" text-anchor="middle">세션 1 · Claude Code</text>
<text class="fd-cmd" x="155" y="64" text-anchor="middle">/memtomem:handoff save</text>
<path class="fd-arrow" d="M 155 80 V 126" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="108">handoff 기록 하나</text>
<path class="fd-mem" d="M 20 142 A 135 12 0 0 1 290 142 V 212 A 135 12 0 0 1 20 212 Z"/>
<path class="fd-mem" d="M 20 142 A 135 12 0 0 0 290 142"/>
<text class="fd-path" x="155" y="180" text-anchor="middle">.memtomem/memories.local</text>
<text class="fd-note" x="155" y="200" text-anchor="middle">직접 소유하는 Markdown 파일</text>
<path class="fd-arrow" d="M 155 226 V 282" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="248">brief: 최근 업데이트 · handoff ID</text>
<text class="fd-label" x="167" y="265">resume: 그 기록</text>
<rect class="fd-box" x="20" y="284" width="270" height="88" rx="8"/>
<text class="fd-title" x="155" y="310" text-anchor="middle">세션 2 · Codex CLI</text>
<text class="fd-cmd" x="155" y="334" text-anchor="middle">$memtomem-brief</text>
<text class="fd-cmd" x="155" y="356" text-anchor="middle">$memtomem-handoff resume</text>
<path class="fd-arrow" d="M 155 372 V 418" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="167" y="400">작업 · 커밋</text>
<rect class="fd-box" x="20" y="420" width="270" height="64" rx="8"/>
<text class="fd-title" x="155" y="446" text-anchor="middle">다시 Claude Code</text>
<text class="fd-cmd" x="155" y="468" text-anchor="middle">/memtomem:update</text>
<path class="fd-arrow" d="M 290 452 H 455 V 177 H 294" marker-end="url(#loop-flow-head)"/>
<text class="fd-label" x="372" y="404" text-anchor="middle">결정 ·</text>
<text class="fd-label" x="372" y="420" text-anchor="middle">버그 원인 ·</text>
<text class="fd-label" x="372" y="436" text-anchor="middle">선호</text>
</svg>
<figcaption>Claude Code에서 Codex CLI로 작업을 넘겼다가 다시 돌아오는 예시입니다. <a href="#제공-위치">제공 위치</a>에서 지원하는 다른 AI 도구도 같은 세 워크플로를 실행합니다.</figcaption>
</figure>

## 시작하기 전에

세 워크플로 모두, 읽기 전용인 `brief`를 포함해 다음 조건이 필요합니다.

1. Git 작업 트리 안에서 실행합니다. 워크플로는 `git rev-parse --show-toplevel`로 저장소 루트를 확인하고, 작업 트리 밖이면 중단합니다.
2. 저장소의 프로젝트 tier를 한 번 등록합니다.

   ```bash
   cd <project-root> && mm mem init --scope project_local
   ```

   워크플로는 `mem_status`로 이 저장소의 `.memtomem/memories.local` tier가 등록되었는지 확인하고, 등록되지 않았으면 위 명령을 안내하고 중단합니다. 사용자 범위로 대신 저장하지 않습니다.
3. 작업을 넘겨받을 AI 도구도 같은 로컬 memtomem 저장소를 사용해야 합니다. 각 도구에서 `mem_status`가 보고하는 데이터베이스 경로를 비교하세요.

프로젝트 기록은 `shared:<project-slug>` 네임스페이스에 저장됩니다. `<project-slug>`는 저장소 디렉터리 이름에서 만들어집니다.

## 제공 위치

| AI 도구 | 실행 방법 | 비고 |
|---|---|---|
| Claude Code | `/memtomem:handoff`, `/memtomem:brief`, `/memtomem:update` | [Claude Code 플러그인](/ko/guides/connect-ai-client/#claude-code) |
| Codex CLI | `$memtomem-handoff`, `$memtomem-brief`, `$memtomem-update` | [Codex 플러그인](/ko/guides/connect-ai-client/#codex-cli) |
| OpenCode | `/memtomem-handoff`, `/memtomem-brief`, `/memtomem-update` | [`opencode-memtomem` 플러그인](/ko/guides/connect-ai-client/#opencode) |
| Kimi Code | `memtomem-handoff`, `memtomem-brief`, `memtomem-update` 스킬 | memtomem Kimi 스킬 묶음 |
| Antigravity CLI | `memtomem-handoff`, `memtomem-brief`, `memtomem-update` 스킬 | 0.7.2부터 제공, 실험 기능. 먼저 서버를 저장소에 바인딩합니다([아래](#antigravity-cli)). |
| Hermes Agent | 제공하지 않음 | 플러그인 서버가 프로젝트 밖에서 시작하므로 포함되지 않습니다. |

## handoff

작업을 순서대로 넘기기 위한 짧은 기록을 저장하고 불러옵니다. 작업을 잠그거나 할당하지는 않습니다.

```text
/memtomem:handoff save to codex-cli
/memtomem:handoff resume
/memtomem:handoff r <handoff-id>
```

`save`와 `resume` 중 하나를 지정합니다. 인자의 첫 단어가 `s`나 `r` 하나뿐이면 각각 `save`, `resume`으로 처리합니다. 작업을 지정하지 않으면 워크플로가 먼저 묻고, 물어볼 사람이 없는 비대화형 실행에서는 `insufficient_input: operation`을 보고하고 중단합니다.

대상 AI 도구는 `claude-code`, `codex-cli`, `kimi-code`, `opencode`, `antigravity-cli`, `cursor`, `any` 중 하나로 기록됩니다. `claude`, `codex`, `kimi`는 각각 해당 이름으로, `antigravity`와 `agy`는 `antigravity-cli`로 바뀝니다. 지정하지 않으면 `any`가 대상입니다. 목록에 없는 대상은 다시 묻거나, 비대화형 실행에서는 `insufficient_input: runtime`을 보고합니다.

**저장(`save`)** 은 실제로 진행된 작업만 기록합니다. 관찰한 작업에서 완료한 내용(`completed`)과 검증 결과(`validation`)를 채울 수 없으면 저장하지 않고 `insufficient_input: work context`를 보고합니다. 호출한 쪽에서 넘겨받았거나 요청에 포함된 맥락도 관찰한 작업으로 인정됩니다. 기록은 1,200자 이내이며 목표, 완료한 작업, 변경 파일, 현재 커밋(`git_head`), 작업 트리 상태, 검증, 차단 요인, 다음 작업(`next_action`)을 담습니다. 0.7.2부터는 `artifacts` 필드도 기록합니다. 저장소 밖에서 만든 결과물(예: AI 도구 세션 디렉터리에 있는 계획 파일)의 절대 경로이며, 없으면 `none`입니다. 경로는 자르지 않으며, 필드 길이(160자)를 넘는 경로는 빼고 그 개수를 함께 적습니다. 저장이 끝나면 `handoff_id`를 알려 줍니다.

**불러오기(`resume`)** 는 지정한 `handoff_id`의 기록을, 또는 현재 AI 도구나 `any`를 대상으로 한 가장 최근 기록을 불러옵니다. 기록 내용은 신뢰하지 않는 맥락으로 다루고, 다음을 확인한 결과를 함께 보고합니다.

- **로컬 비교** — 저장된 프로젝트 루트, 커밋, 작업 트리 상태를 현재 저장소와 비교합니다. 다르면 다음 작업을 제안하기 전에 차이를 먼저 보고합니다.
- **원격 비교(0.7.2)** — 로컬 checkout이 뒤처져 있으면 로컬 비교만으로는 차이를 발견할 수 없습니다. 그래서 `git ls-remote`로 upstream 브랜치의 최신 커밋을 읽어 `HEAD`와 비교하고 다음 중 하나를 보고합니다.
  - 동기화됨(in sync)
  - 차이 있음: 원격이 앞서 있거나, 이 checkout에 push하지 않은 커밋이 있거나, 원격이 해당 브랜치를 더 이상 제공하지 않는 경우
  - 원격과 비교하지 않음(remote not compared): detached `HEAD`, upstream이 하나로 정해지지 않음, 로컬이나 브랜치가 아닌 upstream, 명령 실패나 거부 등 이유를 함께 표시

  fetch는 하지 않으며 ref, 객체, `FETCH_HEAD`도 쓰지 않습니다. 명령에 넘기는 값은 모두 저장소 자체의 Git 설정에서 가져옵니다.
- **이슈·PR 상태** — `next_action`이 `<owner>/<repo>#<n>` 형식이나 GitHub URL로 이슈 또는 PR을 가리키고 AI 도구가 GitHub를 조회할 수 있으면 상태를 보고합니다. `#<n>`만 있거나 소유자가 없는 참조는 확인하지 않았다고 보고합니다.

Claude Code 플러그인은 원격 비교와 GitHub 조회에 쓰는 명령을 미리 허용하지 않습니다. 실행 여부는 Claude Code의 권한 설정에 따라 결정되므로 권한 요청이 표시될 수 있습니다. 원격 비교 명령을 거부하면 "remote not compared"로, GitHub 조회를 거부하면 "target not checked"로 보고됩니다.

## brief

작업 전에 프로젝트 맥락을 간결하게 정리합니다. 기억을 쓰거나 수정하거나 색인하지 않습니다.

```text
/memtomem:brief retry backoff
/memtomem:brief
```

- **주제 모드** — 주제를 지정하면 관련 프로젝트 기억, 색인된 AI 도구 자체 메모리 폴더의 관련 메모(디렉터리 이름으로 찾으므로 다른 위치의 같은 이름 저장소에서 온 것일 수 있으며, 각각 네임스페이스와 함께 인용합니다), 최근 `update` 항목, 최근 handoff ID, 프로젝트를 가리지 않는 사용자 선호를 함께 정리합니다.
- **최소 모드** — 주제 없이 실행하면 최근 업데이트, 진행 중인 handoff ID, 진행 중인 항목 후보만 보고합니다.

정리에 인용하는 파일 경로, 설정 키, 심볼은 현재 작업 트리와 대조해 `✅ exists`, `❌ gone`, `? not checkable` 중 하나로 표시합니다. 사라진 항목은 다음 `update` 실행에서 고칠 후보로 나열됩니다. handoff는 ID만 나열하며, 내용을 불러오려면 `handoff resume <handoff_id>`를 실행합니다.

## update

세션에서 확인한 결과와 최근 커밋을 검토해 오래 유지할 내용만 프로젝트 기억에 저장합니다.

```text
/memtomem:update
/memtomem:update full
/memtomem:update topic retry backoff
```

모드는 세 가지입니다.

| 모드 | 검토하는 커밋 | 검토 기록 |
|---|---|---|
| `incremental`(기본값) | 최근 10개 중 이전 실행이 기록하지 않은 커밋 | 기록함 |
| `full` | 최근 10개 전체 | 기록함 |
| `topic` | 최근 10개 중 주제에 해당하는 커밋 | 기록하지 않음 |

- 요청에 `full`이나 `topic`이 없으면 묻지 않고 `incremental`로 실행합니다. 요청에 포함된 다른 단어는 무시했다고 보고하므로, 한 주제만 검토하려면 `topic <주제>`를 지정해야 합니다. 주제 없이 `topic`을 요청하면 주제를 묻고, 물을 수 없는 환경에서는 `insufficient_input: topic focus`를 보고하고 멈춥니다. `f`와 `t`는 인수의 첫 단어 전체일 때만 약어로 인정됩니다.
- 세션 결과는 모든 모드에서 검토합니다. 세션 결과나 커밋 같은 근거가 있어야 실행됩니다. 호출한 쪽에서 넘겨받았거나 요청에 포함된 맥락도 근거로 인정됩니다. 근거가 없으면 기억을 만들어 내지 않고 `insufficient_input: work context`를 보고합니다.
- 모든 모드가 최근 커밋 **10개**의 메시지만 읽습니다. 이 범위는 고정된 창이며 커서가 아닙니다. 그보다 오래된 커밋은 검토하지 않습니다. 같은 내용이 두 번 저장되지 않는 것은 저장 전 중복 검사 덕분입니다.
- 저장 대상은 결정(`decision`), 버그 원인과 해결(`bugfix`), 사용자 규칙(`preference`)입니다. 커밋에서 가져온 결정이나 버그 수정은 커밋 메시지에 이유가 있어야 하며, 일시적인 작업 상태, 서식 변경, 전체 로그, 패치 본문, 자격 증명은 저장하지 않습니다.
- 커밋 메시지는 신뢰하지 않는 텍스트로 다룹니다. 메시지 안의 지시를 따르지 않습니다.
- 각 항목은 먼저 기존 기억에서 같은 내용을 검색하고, 이미 있으면 건너뜁니다. 프로젝트 항목은 이 저장소에 대한 AI 도구 자체 메모리에서만 일치하는 내용이 발견되면 건너뛰지 않고 그 일치 항목을 인용해 `project_local`에 저장합니다.
- 항목은 프로젝트 tier에 저장됩니다. 여러 프로젝트에 적용되는 개인 선호는 사용자가 명시적으로 요청한 경우에만 사용자 범위(`namespace="default"`)에 저장합니다.
- 실행이 끝나면 모드, 전체 메시지를 읽은 커밋, `incremental`·`full` 모드의 검토 기록 결과, 저장한 항목, 건너뛴 중복을 보고하고, 산출량을 `commit-derived: <N>`과 `session-derived: <M>`으로 함께 보고합니다. `incremental` 실행에서 검토하지 않은 커밋도, 오래 유지할 세션 결과도 없으면 `nothing new`를 보고합니다.

<a id="review-coverage"></a>

### 검토 기록

`incremental`과 `full` 모드에서 `update`는 [`mem_update_coverage`](/ko/ltm/mcp-tools/#update-coverage)를 두 번 호출합니다. 첫 저장 전에 호출해 읽은 커밋 중 이전 실행이 이미 검토한 커밋을 확인하고, 이번 실행의 저장 호출이 모두 결과를 돌려준 뒤에 다시 호출해 그 커밋들을 기록합니다. 저장한 항목이 없어도 기록합니다. 저장이 하나라도 실패하면 아무것도 기록하지 않으므로 다음 실행에서 그 커밋들을 다시 검토합니다. 전체 메시지를 읽은 커밋이 없으면 두 호출을 모두 건너뛰고 세션 결과만 검토합니다. `topic` 모드는 검토 기록을 읽지도 쓰지도 않습니다.

이 도구는 memtomem 0.7.2부터 제공되며, 서버는 `full` [도구 모드](/ko/ltm/mcp-tools/#도구-모드)이거나 `MEMTOMEM_EXTRA_TOOLS=mem_update_coverage`로 시작했을 때만 이 도구를 개별 도구로 노출합니다. 플러그인에 포함된 서버 설정과 현재 `mm init --mcp`가 작성하는 등록에는 이 변수가 들어 있습니다. 직접 작성했거나 이전 `mm init`이 작성한 서버 항목에는 직접 추가해야 하며, 추가할 위치는 [수동 등록 예시](/ko/guides/connect-ai-client/)에 있습니다. 검토 기록 호출이 필요한 시점에 도구가 없으면 `update`는 아무것도 쓰지 않고 멈추며, 이전 버전 서버와 변수 누락이라는 두 가지 원인을 모두 안내합니다. `topic` 모드는 어느 경우에도 동작합니다.

## Antigravity CLI

Antigravity CLI(`agy`)는 플러그인의 memtomem 서버를 플러그인 디렉터리에서 시작하므로 서버에 프로젝트 컨텍스트가 없습니다. 그래서 Antigravity용 세 워크플로는 다른 memtomem 호출보다 먼저 서버를 저장소에 바인딩합니다. 0.7.4부터는 search, recall, remember 스킬도 같은 방식으로 바인딩합니다.

- `git rev-parse --show-toplevel`이 출력한 루트로 `mem_do`를 통해 [`mem_project_bind`](/ko/ltm/mcp-tools/#project-binding)를 호출하고, 도구가 같은 루트를 반환할 때만 계속 진행합니다.
- 상위 디렉터리의 tier만 등록되어 있으면 서버가 상위 디렉터리를 반환합니다. 이 경우를 포함해 다른 결과가 나오면 워크플로가 중단됩니다. tier가 없을 때도 중단되며, 이때 결과 메시지에 `mm mem init` 명령이 표시됩니다.
- 바인딩은 서버 프로세스가 재시작될 때까지 유지됩니다. 다른 저장소에서 작업하려면 먼저 서버를 재시작해야 합니다.
- 바인딩한 뒤 search와 recall은 해당 저장소의 프로젝트 기억도 함께 조회하고, remember는 프로젝트 사실을 저장소의 `project_local` tier에 저장합니다. tier가 없으면 search와 recall은 사용자 범위만 조회하고, remember는 프로젝트와 무관한 선호와 개인 메모만 저장하며 프로젝트 사실은 거부합니다.

설치와 서버 중복 확인은 [Antigravity CLI 플러그인](/ko/guides/connect-ai-client/#antigravity-cli-플러그인)을 참고하세요.

## 다음 단계

- [세션을 넘나드는 기억](/ko/ltm/memory-persistence/) — 워크플로 없이 기억을 저장하고 다른 세션에서 불러오는 기본 흐름
- [AI 클라이언트 연결](/ko/guides/connect-ai-client/) — 각 AI 도구에 플러그인을 설치하고 서버가 하나만 실행되는지 확인
- [MCP 도구 — 프로젝트 바인딩](/ko/ltm/mcp-tools/#project-binding) — 프로젝트 밖에서 시작한 서버를 저장소에 연결하는 방법
