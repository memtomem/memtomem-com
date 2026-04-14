---
title: 개요
description: memtomem-stm이란 — AI 에이전트를 위한 선제적 서피싱과 압축 기능을 제공하는 MCP 프록시.
---

## memtomem-stm이란?

**memtomem-stm**은 AI 에이전트와 업스트림 MCP 서버 사이에 위치하는 MCP 프록시입니다. 에이전트가 자체적으로 갖추지 못한 두 가지 기능을 제공합니다:

1. **선제적 서피싱** — 에이전트가 명시적으로 검색하지 않아도, 모든 도구 호출에 관련 장기 기억을 자동으로 주입합니다.
2. **응답 압축** — 10가지 콘텐츠 인식 전략을 사용하여 대용량 MCP 응답을 컨텍스트 윈도우에 맞게 압축합니다.

에이전트 코드 변경이 필요 없습니다 — STM은 투명한 프록시로 작동합니다.

## 작동 방식

```
AI Agent
    ↕  MCP protocol
memtomem-stm (STM Proxy)
    ├── ↕ Surfacing queries → memtomem (LTM)
    └── ↕ Proxied calls → Upstream MCP Servers
                           (filesystem, GitHub, …)
```

STM은 모든 MCP 도구 호출을 가로챕니다. 각 호출에 대해:

1. 요청을 **정제**합니다 (노이즈 제거, 형식 정규화)
2. 응답을 **압축**합니다 (10가지 전략 중 자동 선택)
3. LTM에서 관련 기억을 **서피싱**합니다 (5단계 관련성 게이팅)
4. 향후 검색을 위해 상호작용을 **인덱싱**합니다

## 주요 기능

- **5단계 관련성 게이팅** — 구체성 우선순위에 따른 컨텍스트 추출
- **10가지 압축 전략** — 콘텐츠 유형에 따라 자동 선택 (truncate, hybrid, selective, progressive, extract_fields, schema_pruning, skeleton, llm_summary, auto, none)
- **모델 인식 기본값** — 소형 (32K 이하), 중형 (32K~200K), 대형 (200K 초과) 컨텍스트 윈도우에 맞게 자동 조정
- **피드백 루프** — 에이전트 피드백으로 서피싱 임계값 자동 조정
- **서킷 브레이커** — 과도한 기억 주입을 방지하는 안전 메커니즘
- **Context Gateway** — 6개 런타임 간 에이전트 정의 자동 동기화

## LTM과의 관계

STM과 LTM은 **독립적인 패키지**입니다 — Python 종속성이 없습니다. MCP 프로토콜을 통해 통신하며, 각각 독립적으로 배포, 업그레이드, 설정할 수 있습니다.

| | LTM (memtomem) | STM (memtomem-stm) |
|---|---|---|
| **역할** | 영구 저장 및 검색 | 실시간 프록시 및 압축 |
| **필수 여부** | 예 (핵심) | 선택 사항 (경험 향상) |
| **통신 방식** | 직접 MCP 서버 | MCP 프록시 → LTM 쿼리 |

## 패키지 정보

| | |
|---|---|
| **PyPI** | [`memtomem-stm`](https://pypi.org/project/memtomem-stm/) |
| **CLI** | `mms` |
| **라이선스** | Apache 2.0 |
| **GitHub** | [memtomem/memtomem-stm](https://github.com/memtomem/memtomem-stm) |

## 다음 단계

- [선제적 서피싱](/ko/stm/surfacing/) — 5단계 게이팅 및 피드백 자동 조정
- [압축 전략](/ko/stm/compression/) — 10가지 전략과 자동 선택 로직
- [Context Gateway](/ko/stm/context-gateway/) — 크로스 런타임 동기화
- [MCP 도구](/ko/stm/mcp-tools/) — STM 관리 도구
- [CLI 레퍼런스](/ko/stm/cli/) — `mms` 명령어 레퍼런스
