---
title: MCP 도구
description: 프록시 상태, 캐시, 압축, 서피싱을 모니터링하는 STM 관리 도구.
---

모든 업스트림 MCP 도구를 투명하게 프록시하는 것 외에도, memtomem-stm은 프록시 동작을 모니터링하고 제어하기 위한 **6개의 관리 도구**를 노출합니다.

## 관리 도구

### `stm_status`

STM 프록시 상태와 연결된 업스트림 서버를 확인합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

프록시 가동 시간, 연결된 업스트림 서버 수, 메모리 사용량을 반환합니다.

### `stm_cache_stats`

응답 캐시 통계를 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

적중률, 캐시 크기, 도구별 캐시 사용량을 반환합니다.

### `stm_cache_clear`

응답 캐시를 비웁니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tool_name` | string | No | 특정 도구의 캐시만 삭제 |

파라미터 없이 호출하면 전체 캐시를 비웁니다.

### `stm_compression_stats`

전략별 압축 통계를 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

10가지 전략 각각의 압축률, 호출 횟수, 평균 지연 시간을 반환합니다.

### `stm_surfacing_stats`

적중률 및 피드백 지표를 포함한 서피싱 통계를 조회합니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| — | — | — | 파라미터 없음 |

서피싱 적중률, 관련/비관련 비율, 현재 `min_score` 임계값, 피드백 수를 반환합니다.

### `stm_feedback`

서피싱 또는 압축 결과에 대한 품질 피드백을 제출합니다. 피드백은 피드백 루프를 통해 서피싱 임계값을 자동 조정하는 데 사용됩니다.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | Yes | `helpful`, `not_relevant`, 또는 `already_known` |
| `tool_name` | string | No | 피드백 대상 도구 호출 |
| `details` | string | No | 추가 컨텍스트 |

## 프록시된 업스트림 도구

등록된 업스트림 MCP 서버의 모든 도구는 STM을 통해 투명하게 프록시됩니다. 에이전트가 업스트림 도구를 호출하면:

1. STM이 요청을 가로챕니다
2. LTM에서 관련 기억을 호출과 함께 서피싱합니다
3. 업스트림 서버로 호출을 전달합니다
4. 응답이 컨텍스트 예산을 초과하면 압축합니다
5. 압축된 응답 + 서피싱된 기억을 에이전트에 반환합니다

업스트림 도구에 선택적으로 접두사를 붙여 이름 충돌을 방지할 수 있습니다. 서버 등록 시 접두사를 설정합니다:

```bash
mms add filesystem --command filesystem-server --prefix fs_
# Upstream tool "read_file" becomes "fs_read_file"
```

> [선제적 서피싱](/ko/stm/surfacing/) 및 [압축 전략](/ko/stm/compression/) 문서에서 이러한 메커니즘의 작동 방식을 자세히 확인할 수 있습니다.
