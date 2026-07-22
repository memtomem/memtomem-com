---
title: 개요
description: memtomem-stm이란 — 관련 기억을 자동으로 제시하고 도구 응답을 압축해 주는 MCP 프록시.
---

## memtomem-stm이란?

memtomem-stm은 AI 에이전트와 기존 MCP 서버 사이에 놓이는 **단기 기억(STM) 프록시**입니다(프록시는 둘 사이에서 오가는 내용을 다듬어 중계하는 계층입니다). 에이전트 코드를 바꾸지 않고도 프록시를 통해 라우팅된 호출에 **응답 압축**, **관련 기억 자동 주입**, **노출 도구 정리**를 더합니다. 토큰 절감률은 응답 형태, 설정한 예산, 워크로드에 따라 달라집니다.

## 이럴 때 씁니다

- **MCP 도구 응답이 너무 커서 컨텍스트가 금방 찰 때** — STM이 라우팅된 filesystem, GitHub 등의 MCP 응답에 콘텐츠 인식 문자·토큰 예산을 적용합니다.
- **에이전트에 명시 요청 없이 과거 기억을 자동으로 붙여주고 싶을 때** — LTM 단독 구성에서는 에이전트가 검색 도구를 호출하지만, STM 앞단을 통과한 적격 응답에는 별도 검색 호출 없이 관련 기억을 붙일 수 있습니다.
- **에이전트에 노출되는 도구 목록을 정리하고 싶을 때** — STM이 응답하지 않는 서버, 자격 증명이 담긴 설명, 이름이 겹치는 도구를 에이전트에 보여 주는 목록에서 걸러 냅니다.
- **프록시를 부담 없이 먼저 시험해 보고 싶을 때** — STM이 기존 MCP 서버를 가져와(import) 앞단에서 중계하며, 이 과정은 되돌릴 수 있습니다. `mms eject`로 가져온 서버를 원래 호스트 설정으로 복원하면 STM 도입 이전 상태로 돌아갑니다.

## 3단계로 시작하기

```bash
uv tool install memtomem-stm                             # 1. 설치
mms init --demo --client auto                            # 2. 실행 가능한 demo + 감지된 클라이언트 등록
mms doctor                                               # 3. 전체 설정 진단
```

`mms init --demo`는 결정적인 demo upstream을 만듭니다. `--client auto`는 감지된 지원 host에 등록하며, 이후에는 `mms register --client claude`, `--client codex`, `--client auto`로 등록을 바꿀 수 있습니다. 전체 설정 절차는 [빠른 시작](/ko/guides/quickstart/) 참조.

## 핵심 기능

- **능동적 서피싱** — 에이전트가 따로 요청하지 않아도 관련 기억을 자동으로 찾아 붙여 주는 기능입니다. 도구 호출마다 5단계 관련성 검사(맥락 추출 → 질의 적합성 → LTM 검색 → 점수 기준 → 중복 제거)를 통과한 기억만 응답에 넣습니다. 서피싱은 업스트림(연결한 외부 MCP 서버) 단위로 켜고 끌 수 있어(`mms surfacing <server> on|off`), 특정 서버의 응답만 대상에서 뺄 수 있습니다. 상세는 [능동적 서피싱](/ko/stm/surfacing/) 참조.
- **응답 압축** — 10가지 전략을 제공하며, 콘텐츠 유형(JSON, 마크다운, API 문서, 자유 텍스트 등)에 따라 자동 선택되고, 쿼리 인식 랭킹과 더 안전한 JSON 출력 계층을 사용합니다. 상세는 [압축 전략](/ko/stm/compression/) 참조.
- **노출 도구 정리** — STM은 업스트림 도구를 그대로 다 넘기지 않고, 에이전트에 보여 줄 도구 목록을 다듬습니다. 응답하지 않는 서버, 자격 증명이 드러나는 설명, 이름이 겹치거나 길이 제한을 넘는 도구는 에이전트에 보이지 않습니다. 노출 정책은 `exposure.profile`(`strict` 기본 / `review` / `explore`)로 조정하며, `stm_proxy_health`가 발견한 도구 수와 실제로 보여 준 도구 수(discovered N / advertised M)를 알려 줍니다.
- **되돌릴 수 있는 가져오기** — 가져온(import) 업스트림은 출처를 기록하므로, `mms list`의 ORIGIN 열에서 직접 등록한 서버와 가져온 서버를 구분할 수 있습니다(`*`는 정리된 호스트 원본을 뜻합니다). `mms eject`는 복원이 검증된 뒤에야 STM 항목을 제거합니다.

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
3. **SURFACE** — LTM에서 관련 기억 조회·주입 (5단계 관련성 검사)

기본 제공 `mms` 런타임은 LTM으로 기억을 다시 기록하지 않습니다. 활성 응답 파이프라인은 **CLEAN → COMPRESS → SURFACE**이며, surfacing은 MCP를 통해 LTM에서 읽습니다.

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
| **최신 릴리스** | `0.1.41` |
| **CLI** | `mms` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 설치부터 에이전트 연결까지
- [능동적 서피싱](/ko/stm/surfacing/) — 5단계 게이팅과 피드백 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 로직
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구와 관찰성 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령어 레퍼런스
