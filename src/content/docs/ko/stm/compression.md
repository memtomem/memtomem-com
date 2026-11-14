---
title: 압축 전략
description: 10가지 압축 전략의 동작 원리, 자동 선택 과정, 검색어 관련성을 반영한 예산 배분을 설명합니다.
---

> 처음이라면 [STM 개요](/ko/stm/overview/)에서 전체 파이프라인을 먼저 확인하세요.

STM은 중계하는 MCP 도구 응답을 에이전트에 전달하기 전에 압축 대상인지 확인합니다(업스트림 MCP 서버를 직접 호출하면 STM을 우회합니다). 응답이 설정된 예산을 초과할 때만 압축을 수행하며, 콘텐츠 형식에 맞는 전략을 적용합니다.

**예외 — 메타데이터가 포함된 다중 블록 응답:** 오류(`isError`)가 아닌 응답 중 텍스트 블록이 둘 이상이고 그중 하나라도 메타데이터(`annotations` 또는 `_meta`)를 포함한 응답은 단일 문자열로 합쳐 압축하지 않고 블록 경계를 보존합니다. 각 텍스트 블록을 개별적으로 정제(clean)하고 원문 크기를 `max_upstream_chars`로 제한한 뒤, 정제된 텍스트를 도구의 문자 예산(`max_result_chars`, 토큰 예산이 설정된 경우 `max_result_tokens`)에 맞춰 자릅니다(이 경로에는 보존 하한 `retention_floor`가 적용되지 않습니다). 블록 메타데이터, 비텍스트 콘텐츠, `structuredContent`, `_meta`는 그대로 유지되며 압축·**서피싱**(관련 기억 자동 제시)·캐시를 거치지 않고 반환됩니다(지표 전략 표기: `none→metadata_bypass`). 더 많은 분량을 받으려면 도구 예산을 늘리고, `max_upstream_chars`가 그보다 작다면 함께 상향하세요. 실험 기능인 [구조화 전달](#structured-chunk-delivery)에서는 업스트림 `structuredContent`나 비텍스트 콘텐츠가 포함된 성공 응답도 모두 이 경로로 처리합니다.

`memtomem-stm`은 콘텐츠 형식별 축소 전략 8가지와 자동 선택(`auto`), 무압축 원본 전달(`none`)까지 총 10가지 전략을 제공합니다. 어떤 전략을 고를지 정하기 어렵다면 호출마다 즉시 반환 가능한 최적 전략을 고르는 기본값 `auto`를 유지하세요. 이 문서는 기본값인 `legacy` 전달 형식을 기준으로 설명하며, 실험 기능인 구조화 형식은 [구조화 청크 전달](#structured-chunk-delivery)에서 다룹니다.

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

`selective` 목차의 각 Markdown 섹션은 헤딩 줄을 포함합니다. 헤딩은 Markdown 규칙을 따릅니다. 코드 블록(fence) 안의 `#` 줄은 헤딩이 아니고, 헤딩은 최대 세 칸까지 들여 쓸 수 있으며, 끝에 붙은 `#` 기호는 키에 포함되지 않습니다(`## Title ##`의 키는 `Title`). JSON 목차 항목은 `number`, `boolean`, `null`처럼 값의 실제 타입을 표시합니다.

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

중첩 깊이가 512단계를 초과하는 JSON은 구조화 JSON으로 파싱하지 않고 일반 텍스트 압축 경로로 대체하여, 호출 실패 없이 일반 텍스트처럼 압축합니다.

<a id="쿼리-인식-예산-배분"></a>

## 검색어를 반영한 예산 배분

압축할 때 현재 검색어나 요청을 반영해 관련 섹션에 더 많은 토큰 예산을 배정합니다. 예를 들어 “인증 모듈”을 묻는 상황에서 API 문서를 압축하면 인증 관련 엔드포인트에 더 많은 분량을 할당합니다. `selective` / `hybrid` / `schema_pruning` / `skeleton`의 목차 항목도 현재 검색어와의 BM25 관련성 순으로 정렬합니다. 이때 계산한 BM25 점수는 선택 기록에 남으므로 나중에 분석할 수 있습니다([설정](/ko/stm/configuration/) 참고).

예산은 `max_result_chars` 또는 `max_result_tokens`로 지정합니다. 토큰 수는 `chars_per_token`과 `token_estimation_mode`(`static` 또는 유니코드를 고려하는 `unicode`)로 추정합니다. `consumer_model`과 `context_budget_ratio`를 설정하면 응답을 받을 모델의 컨텍스트 크기에 맞춰 상한을 정할 수 있습니다. 서버별·도구별 값이 프록시 기본값보다 우선합니다.

## JSON 안전성

JSON을 다루는 압축 계층은 압축 후 결과를 엄격한 JSON으로 다시 직렬화합니다. `NaN`, `Infinity`, `-Infinity` 같은 값은 표준 JSON이 아니므로 출력 전에 `null`로 바꿉니다. 따라서 결과를 받는 파서가 Python 전용 토큰을 만나지 않습니다. 예산이 줄어들어도 JSON 결과의 품질은 급격히 저하되지 않고 점진적으로 낮아집니다. 다만 legacy 전달의 `selective`에는 예외가 있습니다. 먼저 각 항목의 미리보기를 줄이지만 섹션이 아주 많으면 미리보기를 0으로 줄여도 목차 구조만으로 예산을 넘을 수 있습니다. 항목 자체를 제거하면 선택 기능이 성립하지 않으므로 이 경우에는 예산을 약간 초과합니다.

<a id="제로-정보손실-progressive-delivery"></a>

## 원문을 빠짐없이 나누어 보내는 `progressive`

`progressive` 전략은 보관된 소스를 여러 번에 나눠 전달하며, 아래 복구 범위와 만료 조건이 적용됩니다.

1. 첫 응답에서 목차(TOC)와 첫 번째 청크 전달
2. 에이전트가 `stm_proxy_read_more(key, offset)`을 호출하면 커서 기반으로 다음 청크 전달
3. 전체 내용을 순차적으로 확인 가능

legacy 전달에서는 모든 `progressive` 청크가 표준 바닥글 `\n---\n[progressive: chars=<n>]`로 끝납니다. 에이전트는 `memtomem_stm.proxy.progressive`가 제공하는 전체 문자열 `PROGRESSIVE_FOOTER_TOKEN`을 기준으로 나눠야 합니다. `\n---\n`만 기준으로 삼으면 본문의 Markdown 수평선이나 YAML 구분선과 겹쳐 일부 내용이 빠질 수 있습니다.

`progressive` 전달의 후속 요청률과 전체 내용 확인 비율은 `stm_admin(action="progressive_stats")`에서 확인할 수 있습니다. 기본 저장소 오류로 압축 없이 원문을 전달한 횟수도 함께 표시합니다([MCP 도구](/ko/stm/mcp-tools/) 참고). [`mms stats`](/ko/stm/cli/#mms-stats)는 같은 기록을 디스크에서 읽어, 만든 문자 수와 전달한 문자 수를 비교하는 **Progressive delivery** 항목을 표시합니다(`--json`: `progressive`).

응답 캐시는 스키마 7을 사용하며 `content`, `structuredContent`, `_meta`를 포함한 표준 MCP 응답 형식을 보존합니다. 호환되지 않는 이전 캐시를 발견하면 서로 다른 형식을 섞지 않고 한 번 초기화합니다. 업스트림 응답이 STM의 progressive footer(`\n---\n[progressive: chars=`)를 인용하더라도 `stm_proxy_read_more(key="…")` 호출까지 함께 담고 있지 않으면 캐시합니다.

<a id="structured-chunk-delivery"></a>

## 구조화 청크 전달

:::caution[Experimental]
구조화 청크 전달(`delivery_format: "structured"`)은 0.7.0부터 제공되는 실험적(experimental) 기능이며 기본값은 꺼져 있습니다. 기능 구현과 테스트는 완료되었으나 실사용 검증을 거치는 단계이므로, 기본 `legacy` 전달 방식보다 사양 변경 폭이 클 수 있습니다.
:::

전체(`MEMTOMEM_STM_PROXY__DELIVERY_FORMAT`), 연결 서버, `tool_overrides` 항목 중 한 곳에 `delivery_format: "structured"`를 설정하며, 가장 가까운 설정이 우선합니다. `progressive`, `selective`, `hybrid` 키는 발행될 때의 형식을 유지하고, 이어 읽기 도구는 호출마다 `response_format`(`legacy` 또는 `structured`)으로 형식을 바꿀 수 있습니다.

- **페이로드:** 조건을 만족하는 텍스트 전용 응답이면 STM은 버전이 붙은 JSON 봉투(envelope)를 텍스트 블록에 넣고, 이어 읽기 응답은 이를 텍스트와 `structuredContent` 양쪽으로 반환합니다. 내용과 제어 필드는 `stm.payload`에서 읽습니다. `progressive`로 이어 읽을 때는 `content` 필드를 그대로 이어 붙이고 각 `next_offset`을 바꾸지 않고 다시 전달합니다. 위의 바닥글 규칙은 legacy 전달에만 적용되며, 본문에 바닥글 문자열이 들어 있어도 됩니다. 오프셋과 한도는 유니코드 코드 포인트 단위로 셉니다.
- **원래 페이로드 유지:** 업스트림 `structuredContent`나 텍스트가 아닌 콘텐츠가 있는 성공 응답(`isError`가 아닌 응답)은 그대로 유지됩니다. 텍스트 블록마다 따로 정리하고 전체 텍스트 길이를 도구의 문자 예산으로 제한하며, 압축·관련 기억 추가·색인·캐시를 건너뛰며 이어 읽기 키도 발급하지 않습니다.
- **예산:** 문자 예산은 JSON 이스케이프를 포함해 직렬화된 전체 MCP 결과 크기를 기준으로 계산하며, 이어 읽기 응답에서는 두 가지 표현을 모두 합산합니다. 관련 기억과 색인 알림 같은 보충 내용(supplements)은 이 확인 뒤에 추가되므로 최종 결과는 예산보다 클 수 있습니다. `selective`와 `hybrid`의 압축 생략(passthrough) 응답도 직렬화된 결과 예산 안으로 제한하므로 예산을 넘는 성공 응답 대신 목차, `progressive` 전달, 또는 `budget_exceeded`를 반환합니다. 모든 키를 담은 목차가 예산에 맞지 않으면 `progressive` 전달로 바뀌고, 원문을 한 글자도 전달하지 못할 만큼 예산이 작으면 `budget_exceeded`를 반환합니다. 대기 저장소 오류가 발생하면 `selective`와 `hybrid`는 예산에 맞는 더 짧은 절삭 결과나 `budget_exceeded`로 대체되고, `progressive`는 전체 원문 대신 이어 읽기 키 없는 경계 기반 절삭 결과(한 글자도 담을 수 없으면 `budget_exceeded`)로 대체됩니다(`legacy` 전달은 바뀌지 않음). 구조화 `selective`와 목차 방식 `hybrid`는 키로 원문을 복구할 수 있으므로 `retention_floor`를 맞추려고 예산을 늘리지 않습니다.
- **선택:** 선택한 섹션은 잘리지 않습니다. 선택한 키가 저장된 예산을 넘으면 키 수를 줄이거나 `response_format: "legacy"`로 요청합니다.
- **관련 기억 추가:** 기억은 응답 텍스트가 아닌 `stm.supplements.surfacing`으로 전달되므로 `prepend`를 포함한 모든 `injection_mode`가 동작합니다.
- **캐시와 통계:** 응답 캐시 키에는 전달 형식이 포함됩니다. `mms stats`는 구조화 호출을 별도의 `Structured delivery:` 줄(`--json`: `compression.structured_delivery`)로 보고하여 legacy 절감 비율과 분리하며, 튜너의 보존 비율 계산에서도 제외합니다.

봉투 필드와 오류 코드는 upstream [구조화 청크 전달 레퍼런스](https://github.com/memtomem/memtomem-stm/blob/v0.7.8/docs/compression.md#structured-chunk-delivery)에서 확인하세요.

<a id="폴백-래더"></a>

## 단계별 대체 처리

최소 보존 비율(`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, 기본 `0.65`)은 지나친 압축을 막습니다. 결과가 이 비율보다 작아지면 다음 세 전략을 차례로 시도합니다.

```
progressive → hybrid → truncate
```

각 단계에서 하한을 충족하면 해당 전략의 결과를 사용합니다. 도구별 `max_result_chars` 설정이 이 하한보다 더 많이 줄이도록 설정되어 있으면, 절삭 전에 글자 수 예산을 `len(response) * min_result_retention` 까지 상향합니다.

- **최소 분량 계산:** 하한에 해당하는 최소 분량은 정수 글자 수로 올림합니다. 일반 텍스트 절삭은 이 분량 이상에서만 문장·단어 경계를 고르고, 그런 경계가 없으면 예산 위치에서 자릅니다. 이 절삭은 `truncate` 전략, LLM이 설정되지 않은 `llm_summary`, schema-pruning·skeleton의 일반 텍스트 대체, 저장소 오류 시 대체, 마지막 `truncate` 단계에 적용됩니다.
  - 이전에는 하한에 몇 글자 모자란 결과가 progressive 전달로 바뀌었습니다. 이제는 하한 이상의 절삭 결과 하나로 전달합니다.
  - 구조적 절삭처럼 여전히 하한에 못 미치는 결과는 이전처럼 대체 단계로 넘어갑니다.
- **명시적 `retention_floor`:** 도구의 `retention_floor`는 서버 값보다, 서버 값은 전역 비율보다 우선합니다. `null`이면 상위 값을 상속하고, 명시적 `0`이면 그 수준에서 하한을 끕니다. 명시적 `retention_floor`는 전역 `min_result_retention`이 `0`이어도 적용됩니다(위의 메타데이터 블록 예외에는 적용되지 않습니다). 예를 들어 `1.0`으로 지정한 도구는 문자 예산으로 자르지 않고 응답 전체를 보존합니다.

`llm_summary` 전략에는 별도의 **시간 제한**이 있습니다. 서버·도구별 `llm` 블록의 `llm_timeout_seconds` 필드로 지정하며 기본값은 `60`초입니다. LLM 응답이 지연되거나 중단되어도 프록시 전체가 멈추지 않습니다. 제한 시간을 넘기면 STM은 `truncate`를 대신 사용해 정해진 길이 안에서 응답합니다. LLM이 빈 요약이나 공백만 반환하면 압축기는 잘라 낸 원문으로 대체합니다. 이 결과가 보존 하한을 충족하면 `llm_summary→llm_empty_fallback`으로 기록하고, 충족하지 못하면 다른 결과와 마찬가지로 하한 검사가 대체합니다(예: `llm_summary→progressive_fallback`). 엔드포인트는 응답했으므로 빈 요약은 회로 차단기 실패로 집계하지 않습니다. Anthropic 응답은 첫 블록만이 아니라 모든 text 블록에서 요약을 읽습니다.

## 압축 예산 설정

에이전트의 피드백을 바탕으로 도구별 압축 예산을 자동으로 조정합니다.

- 에이전트가 **정보 손실을 보고**하면 → 해당 도구의 보존 비율 상향
- 에이전트가 **응답이 너무 길다**고 하면 → 보존 비율 하향

이 피드백 루프는 `stm_compression_feedback` 도구로 구동되며, 누적된 피드백과 도구별 조정 현황은 `stm_admin(action="compression_stats")`으로 확인할 수 있습니다([MCP 도구](/ko/stm/mcp-tools/) 참고).

## 복구 범위

단계적 공개(`progressive` 전달)는 업스트림 크기 제한과 정제를 거친 소스를 보관하며, 원본 응답 전체를 무제한·바이트 단위로 보존하는 기능은 아닙니다. 대기 중인 선택 항목은 기본적으로 메모리에 보관되며 SQLite 영속 저장은 선택 사항(opt-in)입니다. `pending_store: "sqlite"`로 설정했을 때 저장 대상인 `SELECTIVE`·`HYBRID`·`PROGRESSIVE` 응답에 자격증명 패턴이 감지되면 `pending_selections.db`에 기록하지 않고, `SELECTIVE`·`HYBRID`는 경계를 보존해 잘라낸 결과(`truncate_on_sensitive`)로, `PROGRESSIVE`는 정제된 응답 전체(`passthrough_on_sensitive`)로 캐시 없이 반환합니다(이메일 주소는 제외 대상이 아닙니다). `progressive.ttl_seconds: 0`이면 즉시 만료되어 첫 번째 청크에 만료 안내가 함께 붙습니다. TTL이 지나 만료된 ID는 오류를 반환하며 업스트림을 자동으로 재호출하지 않습니다. 원래 읽기 전용 호출을 다시 실행하는 것은 별도의 명시적 동작이므로, 콘텐츠 복구를 위해 상태 변경(쓰기) 호출을 반복하지 마세요.

캐시 스키마 7은 길이 접두사를 붙인 키 구성과 유니코드 직렬화를 사용하며, 캐시된 응답을 업스트림 연결 설정(URL, 헤더, 전송 방식, 실행 명령)에 묶어 연결 설정이 바뀌면 이전 연결의 응답을 재사용하지 않습니다. 구버전 캐시 행은 최초 초기화 시 삭제되지만 지표와 피드백 데이터는 유지되며, LTM 기억 삭제와는 무관합니다.
