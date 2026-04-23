---
title: 압축 전략
description: 10종 압축 전략의 동작 원리, 자동 선택 로직, 쿼리 인식 예산 배분.
---

> 처음이라면 [STM 개요](/ko/stm/overview/)에서 전체 파이프라인을 먼저 확인하세요.

모든 MCP 도구 응답은 에이전트에 전달되기 전에 STM을 거칩니다. 응답이 에이전트의 컨텍스트 예산을 초과할 경우 STM이 압축을 수행하며, 압축 방식은 콘텐츠 유형에 따라 달라집니다.

memtomem-stm은 MCP 도구 응답을 콘텐츠 유형에 따라 자동으로 압축하여 토큰을 절감합니다. 에이전트가 필요로 하는 정보를 유지하면서 응답 크기를 축소하는 10가지 전략을 제공합니다. 전략 선택이 어려운 경우 `auto` 설정을 유지하면 응답별로 적절한 전략이 자동 선택됩니다.

## 10가지 압축 전략

| 전략 | 대상 콘텐츠 | 동작 |
|---|---|---|
| **truncate** | 소형 텍스트 | 길이 제한 절삭 (기본 폴백) |
| **hybrid** | Markdown | 구조 보존 + 불필요 섹션 축약 |
| **selective** | 일반 텍스트 | 쿼리와 관련된 부분만 보존 |
| **progressive** | 대형 콘텐츠 | 커서 기반 순차 전달 (제로 정보손실) |
| **extract_fields** | JSON 딕셔너리 | 주요 필드만 추출 |
| **schema_pruning** | JSON 배열 | 스키마 유지 + 샘플 축소 |
| **skeleton** | API 문서 | 구조 뼈대만 보존 |
| **llm_summary** | 복잡한 텍스트 | LLM 기반 요약 (Ollama/OpenAI) — 타임아웃 보호(기본 60초), 초과 시 `truncate`로 폴백 |
| **auto** | 모든 유형 | 콘텐츠 분석 후 최적 전략 자동 선택 |
| **none** | — | 압축 없이 원본 전달 |

## 자동 선택 로직

`auto` 전략(기본값)은 콘텐츠를 분석하여 최적 전략을 선택합니다:

| 콘텐츠 유형 | 선택되는 전략 |
|---|---|
| JSON 딕셔너리 | `extract_fields` |
| 대형 JSON 배열 | `schema_pruning` |
| Markdown 문서 | `hybrid` |
| API 문서 | `skeleton` |
| 소형 텍스트 (< 임계값) | `truncate` |
| 기타 대형 텍스트 | `selective` |

## 쿼리 인식 예산 배분

압축 시 에이전트의 현재 쿼리를 인식하여, 관련 섹션에 더 많은 토큰 예산을 할당합니다. 예를 들어, "인증 모듈"에 대해 질문한 상태에서 API 문서를 압축하면, 인증 관련 엔드포인트에 더 많은 공간을 배분합니다.

## 제로 정보손실: Progressive Delivery

`progressive` 전략은 대형 콘텐츠를 정보 손실 없이 전달합니다:

1. 첫 응답에서 목차(TOC)와 첫 번째 청크 전달
2. 에이전트가 추가 부분을 요청하면 커서 기반으로 다음 청크 전달
3. 전체 내용을 순차적으로 확인 가능

모든 progressive 청크는 정규 푸터 `\n---\n[progressive: chars=<n>]` 로 끝납니다 — 에이전트는 `memtomem_stm.proxy.progressive` 에서 export 되는 전체 문자열 `PROGRESSIVE_FOOTER_TOKEN` 으로 분할해야 합니다. `\n---\n` 만으로 분할하면 본문 안의 Markdown 수평선이나 YAML 펜스에 걸려 바이트가 조용히 누락될 수 있습니다.

## 폴백 래더

보존 하한(`MEMTOMEM_STM_PROXY__MIN_RESULT_RETENTION`, 기본 `0.65`)이 과도한 압축을 방지합니다. 출력이 하한보다 작아지면 3단계 폴백이 자동 동작합니다:

```
progressive → hybrid → truncate
```

각 단계에서 하한을 충족하면 해당 전략의 결과를 사용합니다. 도구별 `max_result_chars` 가 하한 이상으로 깎으려 할 경우, 절삭 전에 char 예산이 `len(response) * min_result_retention` 까지 상향됩니다.

`llm_summary` 전략은 별도의 **타임아웃 가드**를 가집니다: `compression.llm.llm_timeout_seconds` (기본 `60`, env var `MEMTOMEM_STM_PROXY__COMPRESSION__LLM_TIMEOUT_SECONDS`). 느리거나 멈춘 LLM 엔드포인트가 더 이상 프록시 전체를 멈추지 않으며 — 타임아웃 발생 시 STM이 `truncate` 로 폴백해 에이전트에 한정된 길이의 응답이 반환됩니다.

## 압축 예산 설정

에이전트의 피드백으로 도구별 압축 예산을 자동 조정합니다:

- 에이전트가 **정보 손실을 보고**하면 → 해당 도구의 보존 비율 상향
- 에이전트가 **응답이 너무 길다**고 하면 → 보존 비율 하향
