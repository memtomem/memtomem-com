---
title: 개요
description: memtomem-stm이란 — AI 에이전트를 위한 선제적 서피싱과 압축 기능을 제공하는 MCP 프록시.
---

## memtomem-stm이란?

memtomem-stm은 에이전트의 토큰 사용량을 일반적으로 20~80% 절감하고, 기존 MCP 서버를 수정하지 않고도 세션을 넘나드는 기억을 제공합니다.

**memtomem-stm**은 AI 에이전트와 업스트림 MCP(Model Context Protocol) 서버 사이에 위치하는 단기 기억(STM) 프록시입니다. 에이전트는 기존 도구와 동일한 방식으로 통신하며, STM이 모든 호출을 중계하면서 다음 두 기능을 추가합니다:

1. **능동적 서피싱** — LTM에서 관련 기억을 조회하여 응답에 주입하므로, 에이전트가 별도의 검색을 수행하지 않아도 기억이 자연스럽게 반영됩니다.
2. **응답 압축** — JSON, 마크다운, API 문서, 자유 텍스트 등 10가지 콘텐츠 인식 전략으로 대용량 도구 응답을 컨텍스트 윈도우 크기에 맞게 축소합니다.

에이전트 코드 수정은 필요하지 않습니다. STM은 기존 MCP 서버 앞단에서 투명한 프록시로 동작합니다.

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

- **관련성 게이팅** — 후보 기억이 컨텍스트 추출, 쿼리 적합성 판정, LTM 검색, 점수 임계값, 중복 제거 윈도우의 5단계를 통과한 후에만 에이전트에 전달됩니다. 관련성이 낮은 후보는 토큰을 소비하기 전에 필터링됩니다.
- **10가지 압축 전략** — 콘텐츠 유형에 따라 자동 선택됩니다(`auto`, `hybrid`, `selective`, `progressive`, `extract_fields`, `schema_pruning`, `skeleton`, `llm_summary`, `truncate`, `none`).
- **Progressive 서피싱 (F6, 미출시)** — `append` / `section` 주입 모드에서 progressive 연속 응답에도 Stage 3 SURFACE가 동작합니다.
- **백그라운드 자동 인덱싱 (F4, 미출시)** — `MEMTOMEM_STM_PROXY__AUTO_INDEX__BACKGROUND=true`로 활성화합니다. Stage 4가 요청 경로 외부에서 실행됩니다.
- **Progressive Footer Token** — 표준 분할 토큰 `\n---\n[progressive: chars=`이 `PROGRESSIVE_FOOTER_TOKEN`으로 노출됩니다(마크다운 HR / YAML 펜스와의 충돌을 방지).
- **모델 인식 기본값** — 소형(≤32K), 중형(32K~200K), 대형(>200K) 컨텍스트 윈도우에 따라 동작을 자동 조정합니다.
- **피드백 루프** — `stm_surfacing_feedback`와 `stm_compression_feedback`이 도구별 자동 튜너에 입력되어, 에이전트 피드백에 따라 `min_score` 임계값을 상향/하향 조정합니다.
- **수평 확장** — `PendingStore` 프로토콜을 통해 인메모리(기본) 또는 SQLite 공유 백엔드를 지원합니다.
- **Langfuse 관측성** — 파이프라인 단계별 스팬 생성 및 업스트림 `_trace_id` 전파를 지원합니다.
- **서킷 브레이커** — 3상태 안전 장치로, 연속 실패 시 과도한 기억 주입을 차단합니다.
- **Context Gateway** — 6종 런타임 간 에이전트 정의를 자동 동기화합니다.

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
