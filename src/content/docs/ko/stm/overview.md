---
title: STM 개요
description: memtomem-stm 개요 — 관련 기억을 자동으로 제시(서피싱)하고 도구 응답을 압축하는 MCP 프록시를 소개합니다.
---

## memtomem-stm이란?

`memtomem-stm`은 AI 에이전트와 기존 MCP 서버 사이에서 호출을 중계하는 **단기 기억(STM) 프록시**입니다. 에이전트 코드를 수정하지 않아도 STM을 거치는 호출에 **응답 압축**, **서피싱**(관련 기억 자동 제시), **노출 도구 정리**를 적용할 수 있습니다. 토큰 절감률은 응답 구조, 설정한 예산, 작업 특성에 따라 달라집니다.

<a id="이럴-때-씁니다"></a>

## 주요 활용 상황

- **MCP 도구 응답이 커서 컨텍스트 윈도우가 빠르게 소모될 때** — STM은 경유하는 filesystem, GitHub 등의 업스트림 MCP 응답을 콘텐츠 형식에 맞춰 문자·토큰 예산 안으로 압축합니다.
- **에이전트의 명시적 검색 요청 없이 관련 기억을 주입하고 싶을 때** — LTM 단독 구성에서는 에이전트가 검색 도구를 직접 호출해야 하지만, STM을 거쳐 조건을 충족한 응답에는 별도 검색 호출 없이 관련 기억을 자동으로 덧붙입니다.
- **에이전트에 노출되는 도구 목록을 정돈하고 싶을 때** — 응답하지 않는 서버의 도구, 설명에 자격증명이 포함된 도구, 이름이 중복되는 도구를 에이전트 노출 목록에서 자동으로 제외합니다.
- **언제든 되돌릴 수 있는 방식으로 프록시를 시험하고 싶을 때** — STM은 기존 MCP 서버 설정을 가져와 앞단에서 중계하며, 되돌리는 것도 간단합니다. `mms eject`로 가져온 서버를 원래 클라이언트 설정으로 복원하면 STM 도입 이전 상태로 돌아갑니다.

## 3단계로 시작하기

```bash
uv tool install memtomem-stm                             # 1. 설치
mms init --demo --client auto                            # 2. 실행 가능한 데모 구성 + 감지된 클라이언트 등록
mms doctor                                               # 3. 전체 설정 진단
```

`mms init --demo`는 항상 동일한 결과를 반환하는 내장 읽기 전용 MCP 서버를 구성하고, `--client auto`는 감지된 지원 클라이언트에 STM을 등록합니다. 이후 `mms register --client claude`, `--client codex`, `--client auto`로 등록 대상을 변경할 수 있습니다. 실제 호출 확인, 지표 조회, 중복 경로 정리, 원복 절차는 [MCP 서버에 STM 추가](/ko/stm/first-proxy/)를 참고하세요.

## 핵심 기능

- **능동적 서피싱** — 에이전트가 별도로 검색을 요청하지 않아도 관련 기억을 찾아 응답에 주입합니다. 도구 호출마다 5단계 파이프라인(맥락 추출 → 검색어 적합성 확인 → LTM 검색 → 점수 필터링 → 중복 제거)을 거치며, 기준을 통과한 기억만 전달합니다. 업스트림 MCP 서버별로 켜고 끌 수 있어(`mms surfacing <server> on|off`) 특정 서버의 응답만 제외할 수도 있습니다. 자세한 내용은 [능동적 서피싱](/ko/stm/surfacing/)을 참고하세요.
- **응답 압축** — JSON, Markdown, API 문서, 일반 텍스트 등 콘텐츠 형식에 맞춰 10가지 전략 중 하나를 선택합니다. 현재 검색어와의 관련성을 반영해 예산을 배분하며, JSON은 유효한 구문을 유지합니다. 자세한 내용은 [압축 전략](/ko/stm/compression/)을 참고하세요.
- **노출 도구 정리** — 업스트림 도구를 그대로 중계하는 데 그치지 않고 노출 시점에 에이전트에 표시할 목록을 추립니다. 응답하지 않는 서버의 도구, 설명에 자격증명 패턴이 포함된 도구, 이름이 겹치거나 길이 한도를 초과하는 도구를 제외하며, MCP 도구 이름 문법(`[A-Za-z0-9._-]`, 1~128자)에 어긋나는 도구는 프록시하지 않습니다. 노출 정책은 `exposure.profile`(`strict` 기본값 / `review` / `explore`)로 조정하며, `stm_admin(action="proxy_health")`에서 발견한 도구 수와 실제 노출된 도구 수(`discovered N / advertised M`)를 확인할 수 있습니다.
- **되돌릴 수 있는 가져오기** — 가져온 서버의 출처를 기록하므로 `mms list`의 ORIGIN 열에서 직접 등록한 서버와 가져온 서버를 구분할 수 있습니다(`*` 표시는 클라이언트의 원본 등록까지 정리했다는 뜻입니다). `mms eject`는 원본 등록 복원이 검증된 뒤에만 STM 항목을 제거합니다.

## 작동 방식

<figure class="flow-diagram">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 430" role="img" aria-labelledby="stm-flow-title stm-flow-desc">
<title id="stm-flow-title">memtomem-stm을 거치는 도구 호출의 흐름</title>
<desc id="stm-flow-desc">AI 에이전트가 보낸 도구 호출을 memtomem-stm 프록시가 연결한 MCP 서버로 전달합니다. 반환된 텍스트 응답은 기본적으로 CLEAN, COMPRESS, SURFACE 세 단계를 거치며, 예외 조건에 해당하는 응답은 COMPRESS와 SURFACE를 거치지 않습니다. SURFACE는 memtomem(LTM)을 검색하고, 관련성 검사를 통과한 기억이 있으면 응답에 덧붙입니다. 에이전트는 그 기억과 함께 응답을 받습니다.</desc>
<defs><marker id="stm-flow-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="fd-head" d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>
<rect class="fd-box" x="90" y="16" width="300" height="56" rx="8"/>
<text class="fd-title" x="240" y="40" text-anchor="middle">AI 에이전트</text>
<text class="fd-note" x="240" y="60" text-anchor="middle">Claude Code · Codex CLI · 기타 MCP 클라이언트</text>
<path class="fd-arrow" d="M 135 72 V 120" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="145" y="100">도구 호출</text>
<path class="fd-arrow" d="M 345 160 V 74" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="335" y="94" text-anchor="end">응답</text>
<text class="fd-label" x="335" y="110" text-anchor="end">+ 관련 기억(있을 때)</text>
<rect class="fd-proxy" x="20" y="122" width="440" height="188" rx="10"/>
<text class="fd-title" x="36" y="148">memtomem-stm</text>
<text class="fd-note" x="36" y="167">선택 사항인 프록시</text>
<text class="fd-label" x="36" y="232">호출 전달</text>
<rect class="fd-stage" x="250" y="160" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="181" text-anchor="middle">SURFACE</text>
<rect class="fd-stage" x="250" y="208" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="229" text-anchor="middle">COMPRESS</text>
<rect class="fd-stage" x="250" y="256" width="170" height="32" rx="6"/>
<text class="fd-stage-text" x="335" y="277" text-anchor="middle">CLEAN</text>
<path class="fd-arrow" d="M 335 256 V 242" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 335 208 V 194" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 135 310 V 348" marker-end="url(#stm-flow-head)"/>
<path class="fd-arrow" d="M 200 350 V 272 H 248" marker-end="url(#stm-flow-head)"/>
<text class="fd-label" x="208" y="334">응답</text>
<path class="fd-arrow" d="M 440 350 V 176 H 422" marker-start="url(#stm-flow-head)" marker-end="url(#stm-flow-head)"/>
<rect class="fd-box" x="20" y="350" width="210" height="64" rx="8"/>
<text class="fd-title" x="125" y="376" text-anchor="middle">연결한 MCP 서버</text>
<text class="fd-note" x="125" y="396" text-anchor="middle">filesystem, GitHub, …</text>
<rect class="fd-mem" x="270" y="350" width="190" height="64" rx="8"/>
<text class="fd-title" x="365" y="376" text-anchor="middle">memtomem (LTM)</text>
<text class="fd-note" x="365" y="396" text-anchor="middle">MCP로 검색</text>
</svg>
<figcaption>텍스트 응답의 일반적인 처리 경로입니다. 일부 응답은 아래 설명처럼 COMPRESS와 SURFACE를 거치지 않습니다.</figcaption>
</figure>

STM은 모든 MCP 도구 호출을 다음 순서로 처리합니다.

1. **CLEAN** — 업스트림 응답 정리 (노이즈 제거, 형식 통일)
2. **COMPRESS** — 응답 크기 축소 (10가지 전략 중 자동 선택)
3. **SURFACE** — LTM에서 관련 기억 조회·주입 (5단계 관련성 검사)

오류가 아닌 응답 중 텍스트 블록이 둘 이상이고 그중 하나라도 `annotations`나 `_meta`를 포함한 응답은 블록별로 정제한 뒤 예산에 맞춰 자르며, COMPRESS와 SURFACE를 건너뜁니다. 실험 기능인 구조화 전달에서는 업스트림 `structuredContent`나 비텍스트 콘텐츠가 포함된 성공 응답도 같은 경로로 처리합니다([압축 전략](/ko/stm/compression/) 참고).

기본 제공 `mms` 실행 환경은 응답을 LTM에 다시 기록하지 않습니다. 활성 응답 파이프라인은 **CLEAN → COMPRESS → SURFACE**이며, SURFACE 단계는 MCP를 통해 LTM의 기억을 읽기만 합니다.

## LTM과의 관계

STM과 LTM은 **독립된 패키지**로, Python 패키지 의존성 없이 MCP 프로토콜로만 통신하므로 각각 독립적으로 배포·업그레이드할 수 있습니다.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 |
| **통신 방식** | 직접 MCP 서버 | MCP 프록시 → LTM 검색 |

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem-stm`](https://pypi.org/project/memtomem-stm/) |
| **최신 릴리스** | `0.7.8` |
| **CLI** | `mms` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## 제한과 안전한 재시도

기본 `proxy.max_upstream_bytes`는 디코딩 후 compact JSON 기준 40 MiB(41,943,040바이트)이며 메타데이터·비텍스트 블록·오류 콘텐츠를 포함합니다. 네트워크 전송 바이트나 프로세스 최대 메모리 사용량 자체를 보장하는 한도는 아닙니다.

타임아웃이나 연결 끊김이 발생하더라도 업스트림 서버에서는 이미 작업이 실행되었을 수 있습니다. 실행 여부가 불명확한 실패는 재실행 안전 정책과 남은 재시도 횟수·시간 예산을 모두 충족할 때만 재시도하며, 주석(annotation)이 없는 도구를 임의로 안전하다고 간주하지 않습니다. 세션을 재시작해도 이미 발생한 부수효과는 되돌려지지 않습니다. 종료 감시(teardown watchdog)와 부모 프로세스 생존 확인 설정은 [환경 변수 레퍼런스](/ko/stm/configuration/)를 참고하세요.

## 다음 단계

- [MCP 서버에 STM 추가](/ko/stm/first-proxy/) — 데모, 실제 프록시 호출, 지표, 원복
- [능동적 서피싱](/ko/stm/surfacing/) — 5단계 관련성 검사와 피드백 기반 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 과정
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구와 관측성 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령 전체 목록
