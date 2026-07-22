---
title: 압축 전략
description: 10종 압축 전략의 동작 원리, 자동 선택 로직, 쿼리 인식 예산 배분.
---

> 처음이라면 [STM 개요](/ko/stm/overview/)에서 전체 파이프라인을 먼저 확인하세요.

STM을 통해 라우팅된 MCP 도구 응답은 에이전트에 전달되기 전에 압축 gate를 거칩니다. upstream을 직접 호출하면 STM을 우회합니다. 라우팅된 응답이 설정 예산을 초과하면 STM이 압축하며, 방식은 콘텐츠 유형에 따라 달라집니다.

memtomem-stm은 MCP 도구 응답을 콘텐츠 유형에 따라 자동으로 압축하여 토큰을 절감합니다. 총 10종 전략을 제공하며 — 콘텐츠 유형별 축소 전략 8종에 더해 자동 선택자 `auto`와 무압축 통과 `none`을 포함합니다 — 에이전트에 필요한 정보를 유지하면서 응답 크기를 축소합니다. 전략 선택이 어려운 경우 `auto` 설정을 유지하면 즉시 응답형 전략 중에서 응답별로 적절한 축소 전략이 자동 선택됩니다.

## 압축 전략

| 전략 | 대상 콘텐츠 | 동작 |
|---|---|---|
| **truncate** | 소형 텍스트 | 길이 제한 절삭 (기본 폴백) |
| **hybrid** | Markdown | 구조 보존 + 불필요 섹션 축약 |
| **selective** | 대형 구조화 데이터 | 먼저 TOC를 반환하고 필요한 섹션을 후속 호출로 선택 |
| **progressive** | 대형 콘텐츠 | 커서 기반 순차 전달 (제로 정보손실) |
| **extract_fields** | JSON 딕셔너리 | 최상위 구조와 대표적인 중첩(nested) 값을 보존 |
| **schema_pruning** | JSON 배열 | 스키마(구조)를 보존하며 재귀적으로 표본 추출 |
| **skeleton** | API 문서 | 헤딩과 섹션 첫 줄 중심으로 구조 보존 |
| **llm_summary** | 복잡한 텍스트 | LLM 기반 요약 (OpenAI/Anthropic/Ollama) — 타임아웃 보호(기본 60초) |
| **auto** | 모든 유형 | 콘텐츠 분석 후 최적 전략 자동 선택 |
| **none** | — | 압축 없이 원본 전달 |

## 자동 선택 로직

`auto` 전략(기본값)은 콘텐츠를 분석하여 최적 전략을 선택합니다:

| 콘텐츠 유형 | 선택되는 전략 |
|---|---|
| 이미 예산 안에 들어오는 응답 | `none` |
| 대형 JSON 배열 또는 대형 배열을 포함한 딕셔너리 | `schema_pruning` |
| 중첩 JSON 딕셔너리 | `extract_fields` |
| HTTP 엔드포인트가 있는 API 문서 | `skeleton` |
| 큰 구조화 Markdown / 코드 비중이 높은 텍스트 | `hybrid` |
| 기타 텍스트 또는 단순 JSON | `truncate` |

`selective`, `progressive`, `llm_summary`는 직접 지정해야만 쓰이는 전략입니다(opt-in). 에이전트의 상호작용 방식을 바꾸거나 외부 LLM 때문에 지연이 생길 수 있어 `auto`가 자동으로 고르지 않습니다.

## 쿼리 인식 예산 배분

압축 시 에이전트의 현재 쿼리를 인식하여, 관련 섹션에 더 많은 토큰 예산을 할당합니다. 예를 들어, "인증 모듈"에 대해 질문한 상태에서 API 문서를 압축하면, 인증 관련 엔드포인트에 더 많은 공간을 배분합니다. `selective` / `hybrid` / `schema_pruning` / `skeleton`의 TOC 항목도 활성 쿼리와의 BM25 관련성으로 정렬됩니다. 이때 사용되는 결정적 BM25 점수는 selection telemetry로 기록되어 오프라인 분석에 활용할 수 있습니다([설정](/ko/reference/configuration/) 참고).

예산은 `max_result_chars` 또는 `max_result_tokens`로 지정할 수 있습니다. 토큰 예산은 `chars_per_token`과 `token_estimation_mode`(`static` 또는 유니코드 인식 `unicode`)를 사용하며, `consumer_model`과 `context_budget_ratio`로 수신 모델의 컨텍스트 윈도우에 맞춘 상한을 적용할 수 있습니다. upstream별·도구별 값이 proxy 기본값보다 우선합니다.

## JSON 안전성

JSON을 다루는 압축 계층은 압축을 마친 뒤 결과를 다시 올바른(엄격한) JSON으로 만듭니다. `NaN`, `Infinity`, `-Infinity` 같은 값은 표준 JSON이 아니므로 출력 전에 `null`로 바꿔, 이를 받는 파서가 Python 전용 토큰을 만나지 않게 합니다. 예산이 줄어들수록 JSON 계층은 품질이 급격히 무너지지 않고 완만하게 떨어집니다. 다만 `selective` 하나는 예외입니다: 먼저 각 항목의 미리보기를 줄이지만, 섹션이 아주 많으면 미리보기를 0으로 해도 목차(TOC) 뼈대만으로 예산을 넘을 수 있습니다. 이때 항목 자체를 지우면 '선택' 동작의 전제가 깨지므로, 예산을 조금 넘기는 쪽을 택합니다.

## 제로 정보손실: Progressive Delivery

`progressive` 전략은 대형 콘텐츠를 정보 손실 없이 전달합니다:

1. 첫 응답에서 목차(TOC)와 첫 번째 청크 전달
2. 에이전트가 `stm_proxy_read_more(key, offset)`을 호출하면 커서 기반으로 다음 청크 전달
3. 전체 내용을 순차적으로 확인 가능

모든 progressive 청크는 정규 푸터 `\n---\n[progressive: chars=<n>]` 로 끝납니다 — 에이전트는 `memtomem_stm.proxy.progressive` 에서 제공되는 전체 문자열 `PROGRESSIVE_FOOTER_TOKEN` 으로 분할해야 합니다. `\n---\n` 만으로 분할하면 본문 안의 Markdown 수평선이나 YAML 펜스에 걸려 내용이 조용히 누락될 수 있습니다.

progressive 전달의 후속 요청률·커버리지, 그리고 primary store 장애 시 패스스루로의 저하 지표는 `stm_progressive_stats` 도구로 확인할 수 있습니다([MCP 도구](/ko/stm/mcp-tools/) 참고).

응답 캐시는 schema 4를 사용하며 `content`, `structuredContent`, `_meta`를 포함한 정규 MCP envelope을 보존합니다. 호환되지 않는 구 cache는 envelope 버전을 섞지 않고 한 번 초기화합니다.

## 폴백 래더

보존 하한(`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, 기본 `0.65`)이 과도한 압축을 방지합니다. 출력이 하한보다 작아지면 3단계 폴백이 자동 동작합니다:

```
progressive → hybrid → truncate
```

각 단계에서 하한을 충족하면 해당 전략의 결과를 사용합니다. 도구별 `max_result_chars` 설정이 이 하한보다 더 많이 깎으려 하면, 절삭하기 전에 글자 수 예산을 `len(response) * min_result_retention` 까지 끌어올립니다.

`llm_summary` 전략에는 별도의 **타임아웃 가드**가 있습니다: 서버·도구별 `llm` 블록의 `llm_timeout_seconds` 필드(기본 `60`초). 느리거나 멈춘 LLM 엔드포인트가 더 이상 프록시 전체를 멈추지 않으며 — 타임아웃 발생 시 STM이 `truncate` 로 폴백해 에이전트에 한정된 길이의 응답이 반환됩니다.

## 압축 예산 설정

에이전트의 피드백으로 도구별 압축 예산을 자동 조정합니다:

- 에이전트가 **정보 손실을 보고**하면 → 해당 도구의 보존 비율 상향
- 에이전트가 **응답이 너무 길다**고 하면 → 보존 비율 하향

이 피드백 루프는 `stm_compression_feedback` 도구로 구동되며, 누적된 피드백과 도구별 조정 현황은 `stm_compression_stats`로 확인할 수 있습니다([MCP 도구](/ko/stm/mcp-tools/) 참고).
