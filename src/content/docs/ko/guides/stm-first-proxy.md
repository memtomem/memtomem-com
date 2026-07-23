---
title: MCP 서버에 STM 추가
description: 내장 데모로 STM 프록시를 확인한 뒤 실제 MCP 서버를 연결하고, 호출 증거와 원복 절차까지 점검합니다.
---

**예상 시간:** 10~15분

**목표:** STM을 통해 도구 하나를 호출하고, 호출 기록을 확인한 뒤 변경을 되돌리는 방법까지 익힙니다.

## STM이 필요한 상황인가요?

이미 MCP 서버를 사용하고 있으며 응답 압축, 캐시, 관련 LTM 기억 자동 제시가 필요할 때 STM을 사용합니다. 장기 기억을 저장하고 검색하는 데는 STM이 필요하지 않습니다.

클라이언트 내장 `Read`, `Bash`, `apply_patch` 호출은 MCP 프록시를 거치지 않습니다. 이 가이드에서는 실제 STM MCP 별칭을 호출해 경로를 확인합니다.

## 1. 설치하고 로컬 데모 실행

```bash
python --version
uv tool install memtomem-stm
mms --version
mms init --demo --client auto
mms doctor
```

내장 데모는 결과가 일정한 읽기 전용 서버이며 Node.js나 네트워크가 필요하지 않습니다. `mms doctor`가 종료 코드 0이면 성공이고 WARN은 허용됩니다. LTM 경고는 관련 기억 자동 제시만 사용할 수 없다는 뜻이며 프록시·압축·캐시는 계속 동작합니다.

자동 감지가 STM을 등록하지 못했다면 사용하는 클라이언트 하나를 선택합니다.

```bash
mms register --client claude
mms register --client codex
mms register --client auto
```

그 밖의 JSON 방식 클라이언트:

```json
{
  "mcpServers": {
    "memtomem-stm": {
      "command": "memtomem-stm"
    }
  }
}
```

등록 뒤 클라이언트를 다시 시작합니다.

## 2. 프록시 데모 도구 호출

AI 클라이언트에 다음처럼 요청합니다.

```text
memtomem-stm MCP의 demo__demo_search 도구를 topic="privacy"로 호출해줘.
클라이언트 내장 파일·셸 도구는 사용하지 마.
```

클라이언트에는 전체 이름이 `mcp__memtomem-stm__demo__demo_search`처럼 표시될 수 있습니다. `memtomem-stm` 아래에 있고 `demo__` prefix가 붙어 있으면 됩니다.

호출 기록을 확인합니다.

```bash
mms doctor
mms stats --source mcp
```

다음 조건을 모두 만족하면 데모가 끝났습니다.

- `mms doctor` 종료 코드가 0임
- 클라이언트에 `memtomem-stm`과 `demo__demo_search`가 표시됨
- 호출 결과에 정해진 privacy 데모 문장이 나옴
- `mms stats --source mcp`에 해당 MCP 호출이 기록됨

## 3. 실제 MCP 서버 추가

가장 안전한 경로는 기존 클라이언트 등록을 찾고 가져올 서버를 직접 선택하는 방식입니다.

```bash
mms add --from-clients --validate
mms list
mms doctor
```

직접 등록한 경로는 명시적으로 정리하기 전까지 남아 있습니다. 원래 경로를 지우기 전에 STM 경로가 동작하는지 먼저 확인하세요.

새 stdio 서버를 직접 등록할 수도 있습니다. 클라이언트가 조합한 최종 이름이 MCP 64자 제한을 넘지 않도록 짧은 prefix를 사용합니다.

```bash
mms add filesystem \
  --command npx \
  --args "-y @modelcontextprotocol/server-filesystem /절대/프로젝트/경로" \
  --prefix fs \
  --validate
```

클라이언트를 다시 시작하고 `fs__...` 도구를 호출한 뒤 `mms stats --source mcp`를 다시 확인합니다. 최종 이름은 `mcp__<server>__<prefix>__<tool>`처럼 보일 수 있습니다.

## 4. 중복된 직접 경로 제거

원래 MCP 서버와 STM 별칭이 함께 보이면 정리 계획을 먼저 확인한 뒤 적용합니다.

```bash
mms prune --all --dry-run
mms prune --all
```

정리 후 클라이언트를 다시 시작하고 STM prefix를 통해서만 도구가 보이는지 확인합니다.

## 5. 원래 등록으로 복원

가져온 서버는 다음 순서로 원복합니다.

```bash
mms eject SERVER_NAME --dry-run
mms eject SERVER_NAME
```

`mms eject`는 기록해 둔 원래 호스트 항목을 복원하고 검증한 뒤 STM 항목을 제거합니다. 복원이 실패하면 STM 항목을 남겨 서버가 소리 없이 사라지지 않게 합니다.

내장 데모는 설정 전에 원래 호스트 항목이 없었습니다. 일반 서버 제거 명령으로 STM에서 삭제하세요.

```bash
mms remove demo
```

## 확인에 실패할 때

- **클라이언트에 STM이 없음:** `mms register --client ...`를 다시 실행하고 클라이언트를 재시작합니다.
- **프록시 도구가 없음:** `mms health --names`를 실행하세요. 연결 상태와 최종 이름이 64자를 넘어 제외된 도구를 확인할 수 있습니다.
- **특정 도구가 사라짐:** STM 서버 이름과 upstream prefix를 줄여 최종 이름을 64자 안으로 맞춥니다.
- **통계가 비어 있음:** 내장 도구가 아니라 MCP 별칭을 실제로 호출했는지 확인합니다.
- **LTM 자동 제시만 실패:** `mms health`를 확인합니다. 선택형 LTM 연결이 끊겨도 프록시는 정상일 수 있습니다.

## 다음 단계

- [STM 개요](/ko/stm/overview/)
- [능동적 서피싱](/ko/stm/surfacing/)
- [압축 전략](/ko/stm/compression/)
- [STM CLI 레퍼런스](/ko/stm/cli/)
- [문제 해결](/ko/guides/troubleshooting/)
