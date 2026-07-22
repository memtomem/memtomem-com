---
title: 압축 전략
description: 10가지 압축 전략의 동작 원리, 자동 선택 과정, 검색어를 반영한 예산 배분.
---

> 처음이라면 [STM 개요](/ko/stm/overview/)에서 전체 파이프라인을 먼저 확인하세요.

STM을 거치는 MCP 도구 응답은 에이전트에 전달되기 전에 압축 조건을 확인합니다. 연결한 MCP 서버를 직접 호출하면 STM을 우회합니다. 응답이 설정한 예산을 초과할 때만 압축하며, 내용의 형식에 따라 방식을 달리합니다.

memtomem-stm은 MCP 도구 응답을 내용의 형식에 맞춰 자동으로 압축해 토큰 사용량을 줄입니다. 내용별 축소 전략 8가지와 자동 선택인 `auto`, 원문을 그대로 보내는 `none`까지 모두 10가지 전략을 제공합니다. 어떤 전략을 쓸지 정하기 어렵다면 `auto`를 유지하세요. 응답을 바로 반환할 수 있는 전략 중에서 매번 알맞은 방식을 고릅니다.

## 압축 전략

| 전략 | 대상 콘텐츠 | 동작 |
|---|---|---|
| **truncate** | 소형 텍스트 | 길이 제한에 맞춰 자름(기본 대체 전략) |
| **hybrid** | Markdown | 구조 보존 + 불필요 섹션 축약 |
| **selective** | 대형 구조화 데이터 | 먼저 TOC를 반환하고 필요한 섹션을 후속 호출로 선택 |
| **progressive** | 대형 콘텐츠 | 커서를 사용해 원문을 빠짐없이 순차 전달 |
| **extract_fields** | JSON 딕셔너리 | 최상위 구조와 대표적인 중첩(nested) 값을 보존 |
| **schema_pruning** | JSON 배열 | 스키마(구조)를 보존하며 재귀적으로 표본 추출 |
| **skeleton** | API 문서 | 헤딩과 섹션 첫 줄 중심으로 구조 보존 |
| **llm_summary** | 복잡한 텍스트 | LLM 기반 요약(OpenAI/Anthropic/Ollama). 제한 시간 기본 60초 |
| **auto** | 모든 유형 | 콘텐츠 분석 후 최적 전략 자동 선택 |
| **none** | — | 압축 없이 원본 전달 |

<a id="자동-선택-로직"></a>

## 자동 선택 과정

`auto` 전략(기본값)은 내용을 분석해 알맞은 전략을 선택합니다.

| 콘텐츠 유형 | 선택되는 전략 |
|---|---|
| 이미 예산 안에 들어오는 응답 | `none` |
| 대형 JSON 배열 또는 대형 배열을 포함한 딕셔너리 | `schema_pruning` |
| 중첩 JSON 딕셔너리 | `extract_fields` |
| HTTP 엔드포인트가 있는 API 문서 | `skeleton` |
| 큰 구조화 Markdown / 코드 비중이 높은 텍스트 | `hybrid` |
| 기타 텍스트 또는 단순 JSON | `truncate` |

`selective`, `progressive`, `llm_summary`는 사용자가 직접 지정해야 합니다. 에이전트의 상호작용 방식이 달라지거나 외부 LLM 호출로 지연될 수 있으므로 `auto`에서는 선택하지 않습니다.

<a id="쿼리-인식-예산-배분"></a>

## 검색어를 반영한 예산 배분

압축할 때 현재 검색어나 요청을 반영해 관련 섹션에 더 많은 토큰 예산을 배정합니다. 예를 들어 “인증 모듈”을 묻는 상황에서 API 문서를 압축하면 인증 관련 엔드포인트에 더 많은 공간을 줍니다. `selective` / `hybrid` / `schema_pruning` / `skeleton`의 목차 항목도 현재 검색어와의 BM25 관련성 순으로 정렬합니다. 이때 계산한 BM25 점수는 선택 기록에 남으므로 나중에 분석할 수 있습니다([설정](/ko/reference/configuration/) 참고).

예산은 `max_result_chars` 또는 `max_result_tokens`로 지정합니다. 토큰 수는 `chars_per_token`과 `token_estimation_mode`(`static` 또는 유니코드를 고려하는 `unicode`)로 추정합니다. `consumer_model`과 `context_budget_ratio`를 설정하면 응답을 받을 모델의 컨텍스트 크기에 맞춰 상한을 정할 수 있습니다. 서버별·도구별 값이 프록시 기본값보다 우선합니다.

## JSON 안전성

JSON을 다루는 압축 계층은 압축을 마친 뒤 결과를 다시 유효한 엄격한 JSON으로 만듭니다. `NaN`, `Infinity`, `-Infinity` 같은 값은 표준 JSON이 아니므로 출력 전에 `null`로 바꿉니다. 따라서 결과를 받는 파서가 Python 전용 토큰을 만나지 않습니다. 예산이 줄어들어도 JSON 결과의 품질은 갑자기 무너지지 않고 점진적으로 낮아집니다. 다만 `selective`에는 예외가 있습니다. 먼저 각 항목의 미리보기를 줄이지만 섹션이 아주 많으면 미리보기를 0으로 해도 목차 뼈대만으로 예산을 넘을 수 있습니다. 항목 자체를 지우면 선택 기능의 전제가 깨지므로 이때는 예산을 조금 넘깁니다.

<a id="제로-정보손실-progressive-delivery"></a>

## 원문을 빠짐없이 나누어 보내는 `progressive`

`progressive` 전략은 큰 내용을 여러 번에 나눠 원문 그대로 전달합니다.

1. 첫 응답에서 목차(TOC)와 첫 번째 청크 전달
2. 에이전트가 `stm_proxy_read_more(key, offset)`을 호출하면 커서 기반으로 다음 청크 전달
3. 전체 내용을 순차적으로 확인 가능

모든 `progressive` 청크는 표준 바닥글 `\n---\n[progressive: chars=<n>]`로 끝납니다. 에이전트는 `memtomem_stm.proxy.progressive`가 제공하는 전체 문자열 `PROGRESSIVE_FOOTER_TOKEN`을 기준으로 나눠야 합니다. `\n---\n`만 기준으로 삼으면 본문의 Markdown 수평선이나 YAML 구분선과 겹쳐 일부 내용이 빠질 수 있습니다.

`progressive` 전달의 후속 요청률과 전체 내용 확인 비율은 `stm_progressive_stats`에서 확인할 수 있습니다. 기본 저장소에 문제가 생겨 압축 없이 원문을 전달한 횟수도 함께 표시합니다([MCP 도구](/ko/stm/mcp-tools/) 참고).

응답 캐시는 스키마 4를 사용하며 `content`, `structuredContent`, `_meta`를 포함한 표준 MCP 응답 형식을 보존합니다. 호환되지 않는 이전 캐시를 발견하면 서로 다른 형식을 섞지 않고 한 번 초기화합니다.

<a id="폴백-래더"></a>

## 단계별 대체 처리

최소 보존 비율(`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, 기본 `0.65`)은 지나친 압축을 막습니다. 결과가 이 비율보다 작아지면 다음 세 전략을 차례로 시도합니다.

```
progressive → hybrid → truncate
```

각 단계에서 하한을 충족하면 해당 전략의 결과를 사용합니다. 도구별 `max_result_chars` 설정이 이 하한보다 더 많이 깎으려 하면, 절삭하기 전에 글자 수 예산을 `len(response) * min_result_retention` 까지 끌어올립니다.

`llm_summary` 전략에는 별도의 **시간 제한**이 있습니다. 서버·도구별 `llm` 블록의 `llm_timeout_seconds` 필드로 지정하며 기본값은 `60`초입니다. LLM 응답이 느리거나 멈춰도 프록시 전체가 멈추지 않습니다. 제한 시간을 넘기면 STM은 `truncate`를 대신 사용해 정해진 길이 안에서 응답합니다.

## 압축 예산 설정

에이전트의 피드백을 바탕으로 도구별 압축 예산을 자동으로 조정합니다.

- 에이전트가 **정보 손실을 보고**하면 → 해당 도구의 보존 비율 상향
- 에이전트가 **응답이 너무 길다**고 하면 → 보존 비율 하향

이 피드백 루프는 `stm_compression_feedback` 도구로 구동되며, 누적된 피드백과 도구별 조정 현황은 `stm_compression_stats`로 확인할 수 있습니다([MCP 도구](/ko/stm/mcp-tools/) 참고).
