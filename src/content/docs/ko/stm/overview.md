---
title: 개요
description: memtomem-stm이란 — 관련 기억을 자동으로 제시하고 도구 응답을 압축해 주는 MCP 프록시.
---

## memtomem-stm이란?

memtomem-stm은 AI 에이전트와 기존 MCP 서버 사이에서 호출을 중계하는 **단기 기억(STM) 프록시**입니다. 에이전트 코드를 바꾸지 않아도 STM을 거치는 호출에 **응답 압축**, **관련 기억 자동 추가**, **노출 도구 정리**를 적용할 수 있습니다. 토큰 절감률은 응답 형태, 설정한 예산, 작업 특성에 따라 달라집니다.

## 이럴 때 씁니다

- **MCP 도구 응답이 너무 커서 컨텍스트가 금방 찰 때** — STM은 경유하는 filesystem, GitHub 등의 MCP 응답을 내용에 맞춰 정해진 문자·토큰 예산 안으로 줄입니다.
- **에이전트에 명시 요청 없이 과거 기억을 자동으로 붙여주고 싶을 때** — LTM 단독 구성에서는 에이전트가 검색 도구를 호출하지만, STM 앞단을 통과한 적격 응답에는 별도 검색 호출 없이 관련 기억을 붙일 수 있습니다.
- **에이전트에 노출되는 도구 목록을 정리하고 싶을 때** — STM이 응답하지 않는 서버, 자격 증명이 담긴 설명, 이름이 겹치는 도구를 에이전트에 보여 주는 목록에서 걸러 냅니다.
- **프록시를 부담 없이 먼저 시험해 보고 싶을 때** — STM은 기존 MCP 서버 설정을 가져와 앞단에서 호출을 중계합니다. `mms eject`로 서버를 원래 클라이언트 설정에 복원하면 STM 도입 이전 상태로 돌아갈 수 있습니다.

## 3단계로 시작하기

```bash
uv tool install memtomem-stm                             # 1. 설치
mms init --demo --client auto                            # 2. 실행 가능한 데모 구성 + 감지된 클라이언트 등록
mms doctor                                               # 3. 전체 설정 진단
```

`mms init --demo`는 실행 결과가 일정한 내장 읽기 전용 MCP 서버를 구성합니다. `--client auto`는 감지한 지원 클라이언트에 STM을 등록합니다. 이후에는 `mms register --client claude`, `--client codex`, `--client auto`로 등록 대상을 바꿀 수 있습니다. 전체 설정 절차는 [빠른 시작](/ko/guides/quickstart/)을 참고하세요.

## 핵심 기능

- **능동적 서피싱** — 에이전트가 따로 요청하지 않아도 관련 기억을 찾아 응답에 붙이는 기능입니다. 도구를 호출할 때마다 5단계 관련성 검사(맥락 추출 → 검색어 적합성 → LTM 검색 → 점수 기준 → 중복 제거)를 거치며, 조건을 충족한 기억만 넣습니다. 연결한 MCP 서버별로 켜고 끌 수 있어(`mms surfacing <server> on|off`) 특정 서버의 응답만 제외할 수도 있습니다. 자세한 내용은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.
- **응답 압축** — JSON, 마크다운, API 문서, 일반 텍스트 등 내용의 형식에 맞춰 10가지 전략 가운데 하나를 선택합니다. 현재 검색어와의 관련성을 반영해 공간을 배분하고, JSON은 유효한 형식을 유지합니다. 자세한 내용은 [압축 전략](/ko/stm/compression/)을 참고하세요.
- **노출 도구 정리** — STM은 연결한 서버의 도구를 모두 그대로 넘기지 않고, 에이전트에 보여 줄 목록을 정리합니다. 응답하지 않는 서버의 도구, 설명에 자격 증명으로 보이는 문자열이 있는 도구, 이름이 겹치거나 길이 제한을 넘는 도구는 제외합니다. 노출 정책은 `exposure.profile`(`strict` 기본 / `review` / `explore`)로 조정합니다. `stm_proxy_health`에서는 발견한 도구 수와 실제로 보여 준 도구 수(`discovered N / advertised M`)를 확인할 수 있습니다.
- **되돌릴 수 있는 가져오기** — 가져온 서버의 출처를 기록하므로 `mms list`의 ORIGIN 열에서 직접 등록한 서버와 가져온 서버를 구분할 수 있습니다. `*`는 클라이언트의 원본 등록을 정리했다는 뜻입니다. `mms eject`는 원본 등록이 정상적으로 복원된 뒤에만 STM 항목을 제거합니다.

## 작동 방식

```
AI 에이전트
    ↕  MCP 프로토콜
memtomem-stm (STM 프록시)
    ├── ↕ 관련 기억 검색 → memtomem (LTM)
    └── ↕ 중계된 호출 → 연결한 MCP 서버
                           (filesystem, GitHub, …)
```

STM은 모든 MCP 도구 호출을 다음 순서로 처리합니다.

1. **CLEAN** — 요청 정규화 (노이즈 제거, 형식 통일)
2. **COMPRESS** — 응답 크기 축소 (10가지 전략 중 자동 선택)
3. **SURFACE** — LTM에서 관련 기억 조회·주입 (5단계 관련성 검사)

기본 제공 `mms` 실행 환경은 기억을 LTM에 다시 기록하지 않습니다. 응답 처리 순서는 **CLEAN → COMPRESS → SURFACE**이며, SURFACE 단계에서는 MCP를 통해 LTM의 기억을 읽기만 합니다.

## LTM과의 관계

STM과 LTM은 **독립적인 패키지**로, Python 종속성 없이 MCP 프로토콜로만 통신합니다. 각각 독립적으로 배포·업그레이드할 수 있습니다.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 |
| **통신 방식** | 직접 MCP 서버 | MCP 프록시 → LTM 검색 |

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
- [능동적 서피싱](/ko/stm/surfacing/) — 5단계 관련성 검사와 피드백 기반 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 과정
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구와 관찰성 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령 전체 목록
