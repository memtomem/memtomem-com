---
title: 환경 변수
description: memtomem LTM 및 STM 환경 변수 설정 레퍼런스.
---

memtomem (LTM)과 memtomem-stm (STM) 모두 환경 변수로 설정합니다. CLI 플래그와 환경 변수가 동시에 설정된 경우, CLI 플래그가 우선합니다.

## LTM 설정 (memtomem)

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMTOMEM_EMBEDDING_PROVIDER` | 임베딩 프로바이더: `onnx`, `ollama`, 또는 `openai` | `onnx` |
| `MEMTOMEM_DB_PATH` | SQLite 데이터베이스 파일 경로 | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_TOOL_MODE` | 도구 노출 모드: `core` (9개 도구 + mem_do) 또는 `full` (74개 도구) | `core` |
| `MEMTOMEM_DEFAULT_NAMESPACE` | 새 기억의 기본 네임스페이스 | `default` |
| `MEMTOMEM_OLLAMA_MODEL` | Ollama 모델 이름 (ollama 프로바이더 사용 시) | `nomic-embed-text` |
| `MEMTOMEM_OPENAI_API_KEY` | OpenAI API 키 (openai 프로바이더 사용 시) | — |

### 임베딩 프로바이더 비교

| Provider | GPU 필요 | 비용 | 지연 시간 | 비고 |
|----------|----------|------|-----------|------|
| `onnx` | 아니오 | 무료 | 빠름 | 기본값. 첫 실행 시 약 270MB 모델 다운로드 |
| `ollama` | 아니오 | 무료 | 보통 | Ollama 설치 필요. `ollama pull nomic-embed-text` |
| `openai` | 아니오 | 유료 | 가변 | OpenAI API 사용. API 키 필요 |

## STM 설정 (memtomem-stm)

| Variable | Description | Default |
|----------|-------------|---------|
| `MEMTOMEM_STM_COMPRESSION` | 기본 압축 전략 | `auto` |
| `MEMTOMEM_STM_SURFACING` | 선제적 서피싱 활성화 | `true` |
| `MEMTOMEM_STM_CACHE_ENABLED` | 응답 캐싱 활성화 | `true` |
| `MEMTOMEM_STM_CACHE_TTL` | 캐시 유효 기간 (초 단위) | `300` |
| `MEMTOMEM_STM_MIN_SCORE` | 서피싱 관련성 초기 임계값 | `0.3` |

### 압축 전략

`MEMTOMEM_STM_COMPRESSION`에 사용 가능한 값:

| Strategy | Description |
|----------|-------------|
| `auto` | 콘텐츠 유형에 따라 자동 선택 (권장) |
| `truncate` | 단순 잘라내기 |
| `hybrid` | 키워드 + 구조적 압축 |
| `selective` | 관련 섹션만 유지 |
| `progressive` | 목차 + 커서 기반 전달 |
| `extract_fields` | 구조화된 데이터에서 핵심 필드 추출 |
| `schema_pruning` | 미사용 스키마 필드 제거 |
| `skeleton` | 구조만 남기는 스켈레톤 |
| `llm_summary` | LLM 기반 요약 |
| `none` | 압축 없음 |

## 우선순위

설정은 다음 순서로 적용됩니다 (우선순위 높은 순):

1. **CLI 플래그** — `mm serve --db-path /custom/path`
2. **환경 변수** — `MEMTOMEM_DB_PATH=/custom/path`
3. **설정 파일** — `mm init` 마법사로 설정
4. **기본값** — 내장 기본값

> 초기 설정은 [설치 가이드](/ko/guides/installation/), 전체 설정 레퍼런스는 각 저장소의 README를 참조하세요.
