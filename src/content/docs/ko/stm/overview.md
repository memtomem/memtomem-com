---
title: 개요
description: memtomem-stm이란 — AI 에이전트를 위한 능동적 서피싱과 압축 기능을 제공하는 MCP 프록시.
---

## memtomem-stm이란?

memtomem-stm은 AI 에이전트와 기존 MCP 서버 사이에 놓이는 **단기 기억(STM) 프록시**입니다. 에이전트 코드 변경 없이 도구 호출에 **응답 압축**, **능동적 기억 주입**, **노출 도구 정리**를 추가하여, 일반적으로 토큰 사용량을 20~80% 절감합니다.

## 이럴 때 씁니다

- **MCP 도구 응답이 너무 커서 컨텍스트가 금방 찰 때** — filesystem이나 GitHub MCP가 8000 토큰짜리 응답을 반환한다면, STM이 콘텐츠 유형에 맞는 전략으로 이를 2000 토큰대로 축소합니다.
- **에이전트에 명시 요청 없이 과거 기억을 자동으로 붙여주고 싶을 때** — LTM 단독 구성에서는 에이전트가 `mem_search`를 호출해야 기억을 받지만, STM이 앞단에 있으면 모든 도구 응답에 관련 기억이 자동 주입됩니다.
- **에이전트에 노출되는 도구 목록을 정리하고 싶을 때** — STM이 노출 시점에 응답하지 않는 서버, 자격 증명이 포함된 설명, 이름이 중복되는 도구를 advertised 목록에서 제외합니다.
- **프록시를 부담 없이 먼저 시험해 보고 싶을 때** — STM이 기존 MCP 서버를 import해 앞단에서 프록시하며, 이 과정은 되돌릴 수 있습니다. `mms eject`로 import한 서버를 원래 host 설정으로 복원하면 STM 도입 이전 상태로 되돌아갑니다.

## 3단계로 시작하기

```bash
uv tool install memtomem-stm                             # 1. 설치
mms init --mcp claude                                    # 2. 업스트림 + Claude Code 등록 한 번에
mms health                                               # 3. 연결 상태 확인
```

`mms init`은 업스트림 서버를 묻고 이어서 `memtomem-stm`을 MCP 클라이언트에 등록합니다 (`--mcp claude`, `--mcp json`, `--mcp skip` 중 선택). 전체 설정 절차는 [빠른 시작](/ko/guides/quickstart/) 참조.

## 핵심 기능

- **능동적 서피싱** — 도구 호출마다 5단계 관련성 게이팅(컨텍스트 추출 → 쿼리 적합성 → LTM 검색 → 점수 임계값 → 중복 제거)을 거친 기억만 응답에 주입됩니다. 서피싱은 업스트림 단위로 켜고 끌 수 있어(`mms surfacing <server> on|off`), 특정 서버의 응답만 서피싱 대상에서 제외할 수 있습니다. 상세는 [능동적 서피싱](/ko/stm/surfacing/) 참조.
- **응답 압축** — 10가지 전략을 제공하며, 콘텐츠 유형(JSON, 마크다운, API 문서, 자유 텍스트 등)에 따라 자동 선택되고, 쿼리 인식 랭킹과 더 안전한 JSON 출력 계층을 사용합니다. 상세는 [압축 전략](/ko/stm/compression/) 참조.
- **노출 도구 정리** — STM은 단순히 모든 업스트림 도구를 그대로 중계하지 않고, 노출 시점에 advertised 도구 목록을 정리합니다. 응답하지 않는 서버, 자격 증명이 노출되는 설명, 이름이 중복·초과되는 도구는 에이전트에 노출되지 않습니다. 노출 정책은 `exposure.profile`(`strict` 기본 / `review` / `explore`)로 조정하며, `stm_proxy_health`가 "discovered N / advertised M"를 보고합니다.
- **되돌릴 수 있는 import** — import한 업스트림은 출처(origin)를 기록하므로, `mms list`의 ORIGIN 열에서 직접 등록한 서버와 import한 서버를 구분할 수 있습니다(`*`는 정리(prune)된 host 원본을 표시). `mms eject`는 복원을 검증한 뒤에야 STM 항목을 제거합니다.

## 작동 방식

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM은 모든 MCP 도구 호출을 다음 파이프라인으로 처리합니다:

1. **CLEAN** — 요청 정규화 (노이즈 제거, 형식 통일)
2. **COMPRESS** — 응답 크기 축소 (10가지 전략 중 자동 선택)
3. **SURFACE** — LTM에서 관련 기억 조회·주입 (5단계 게이팅)

STM은 런타임에 LTM으로 기억을 다시 기록하지 않습니다. 서피싱은 LTM에서 읽기만 하며, INDEX(자동 축적) 단계는 standalone `mms` 서버에서 설계상 동작하지 않습니다.

## LTM과의 관계

STM과 LTM은 **독립적인 패키지**로, Python 종속성 없이 MCP 프로토콜로만 통신합니다. 각각 독립적으로 배포·업그레이드할 수 있습니다.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 |
| **통신 방식** | 직접 MCP 서버 | MCP 프록시 → LTM 쿼리 |

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem-stm`](https://pypi.org/project/memtomem-stm/) |
| **최신 릴리스** | `0.1.32` |
| **CLI** | `mms` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 설치부터 에이전트 연결까지
- [능동적 서피싱](/ko/stm/surfacing/) — 5단계 게이팅과 피드백 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 로직
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구와 관찰성 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령어 레퍼런스
