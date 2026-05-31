---
title: 개요
description: memtomem-stm이란 — AI 에이전트를 위한 능동적 서피싱과 압축 기능을 제공하는 MCP 프록시.
---

## memtomem-stm이란?

memtomem-stm은 AI 에이전트와 기존 MCP 서버 사이에 놓이는 **단기 기억(STM) 프록시**입니다. 에이전트 코드 변경 없이 도구 호출에 **응답 압축**과 **능동적 기억 주입**을 추가하여, 일반적으로 토큰 사용량을 20~80% 절감합니다.

현재 PyPI 최신 릴리스는 **memtomem-stm v0.1.24**입니다. 이 버전은 Claude Code 네이티브 도구 서피싱을 위한 `mms hook`, hook 호출을 빠르게 처리하는 로컬 warm daemon, 네트워크 LTM MCP 전송, 쿼리 인식 압축, 관련성 버킷, 확장된 피드백, 쿼리 텍스트 프라이버시 제어를 포함합니다.

## 이럴 때 씁니다

- **MCP 도구 응답이 너무 커서 컨텍스트가 금방 찰 때** — filesystem이나 GitHub MCP가 8000 토큰짜리 응답을 반환한다면, STM이 콘텐츠 유형에 맞는 전략으로 이를 2000 토큰대로 축소합니다.
- **에이전트에 명시 요청 없이 과거 기억을 자동으로 붙여주고 싶을 때** — LTM 단독 구성에서는 에이전트가 `mem_search`를 호출해야 기억을 받지만, STM이 앞단에 있으면 모든 도구 응답에 관련 기억이 자동 주입됩니다.
- **Claude Code 네이티브 도구에도 기억을 붙이고 싶을 때** — `mms hook`은 read-like PostToolUse 이벤트에 `additionalContext`를 붙일 수 있으며, 기본적으로 daemon이 데워 둔 LTM 연결을 사용합니다.

## 3단계로 시작하기

```bash
uv tool install memtomem-stm                             # 1. 설치
mms init --mcp claude                                    # 2. 업스트림 + Claude Code 등록 한 번에
mms health                                               # 3. 연결 상태 확인
```

`mms init`은 업스트림 서버를 묻고 이어서 `memtomem-stm`을 MCP 클라이언트에 등록합니다 (`--mcp claude`, `--mcp json`, `--mcp skip` 중 선택). 전체 설정 절차는 [빠른 시작](/ko/guides/quickstart/) 참조.

## 핵심 기능

- **능동적 서피싱** — 도구 호출마다 5단계 관련성 게이팅(컨텍스트 추출 → 쿼리 적합성 → LTM 검색 → 점수 임계값 → 중복 제거)을 거친 기억만 응답에 주입됩니다. 상세는 [능동적 서피싱](/ko/stm/surfacing/) 참조.
- **응답 압축** — 10가지 전략이 콘텐츠 유형(JSON, 마크다운, API 문서, 자유 텍스트 등)에 따라 자동 선택되며, 쿼리 인식 랭킹과 더 안전한 JSON 출력 계층을 사용합니다. 상세는 [압축 전략](/ko/stm/compression/) 참조.
- **Hook + Daemon 경로** — `mms hook`이 지원 host의 PostToolUse payload를 STM 서피싱으로 연결하고, `mms daemon`이 LTM 세션을 따뜻하게 유지해 hook 호출의 반복 cold start를 피합니다.
- **선택적 INDEX hook** — Stage 4 설정은 라이브러리 통합을 위해 존재하지만, standalone `mms` 서버는 아직 index engine을 연결하지 않습니다. 따라서 `auto_index`와 extraction은 MCP-only adapter가 도입될 때까지 inert 상태입니다.

## 작동 방식

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM은 모든 MCP 도구 호출을 4단계 파이프라인으로 처리합니다:

1. **CLEAN** — 요청 정규화 (노이즈 제거, 형식 통일)
2. **COMPRESS** — 응답 크기 축소 (10가지 전략 중 자동 선택)
3. **SURFACE** — LTM에서 관련 기억 조회·주입 (5단계 게이팅)
4. **INDEX** — 향후 LTM 축적을 위한 선택적 write-back hook. 현재 standalone `mms` 서버에서는 inert 상태

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
| **최신 릴리스** | `0.1.24` |
| **CLI** | `mms` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## 다음 단계

- [빠른 시작](/ko/guides/quickstart/) — 설치부터 에이전트 연결까지
- [능동적 서피싱](/ko/stm/surfacing/) — 5단계 게이팅과 피드백 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 로직
- [Context Gateway](/ko/ltm/context-gateway/) — 크로스 런타임 동기화 (LTM 기능)
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령어 레퍼런스
