---
title: 설치
description: memtomem과 memtomem-stm의 상세 설치 가이드.
---

## 요구 사항

- **Python 3.12+**
- **pip**, **uv**, 또는 **pipx**
- 임베딩: ONNX (기본, 추가 설치 불필요) / Ollama (~270MB) / OpenAI API

## LTM 서버 (memtomem)

```bash
# uv (권장)
uv tool install memtomem

# pipx
pipx install memtomem

# pip
pip install memtomem
```

### 선택적 확장

```bash
pip install memtomem[korean]       # kiwipiepy 한국어 형태소 분석
```

설치 후 `mm` CLI를 사용할 수 있습니다:

```bash
mm init          # 초기 설정 마법사
mm serve         # MCP 서버 시작
mm web           # 웹 UI 대시보드
```

## STM 프록시 (memtomem-stm)

```bash
# uv (권장)
uv tool install memtomem-stm

# 또는 설치 없이 실행
uvx memtomem-stm --help

# pip
pip install memtomem-stm
```

### 선택적 확장

```bash
pip install memtomem-stm[langfuse]     # Langfuse 관측성 트레이싱
pip install memtomem-stm[langchain]    # LangChain 에이전트 통합
```

설치 후 `mms` CLI를 사용할 수 있습니다:

```bash
mms add <name> --command <cmd>     # 업스트림 MCP 서버 등록
mms list                           # 등록된 서버 목록
mms serve                          # STM 프록시 시작
```

## 임베딩 프로바이더

| 프로바이더 | 설치 | GPU | 비용 |
|---|---|---|---|
| **ONNX** (fastembed) | 기본 내장 | 불필요 | 무료 |
| **Ollama** | `ollama pull nomic-embed-text` | 불필요 | 무료 |
| **OpenAI** | API 키 필요 | - | 유료 |

`mm init` 마법사에서 프로바이더를 선택하거나, `MEMTOMEM_EMBEDDING_PROVIDER` 환경 변수로 설정합니다.

## 기술 스택

| 범주 | 기술 |
|------|------|
| MCP | FastMCP (stdio, SSE, Streamable HTTP) |
| 프레임워크 | Pydantic v2, Click (CLI), FastAPI (웹 UI) |
| 데이터베이스 | SQLite (FTS5 전문 검색), sqlite-vec (벡터 검색) |
| 코드 파싱 | tree-sitter (Python, JS, TS AST) |
| 한국어 | kiwipiepy 형태소 분석기 (선택적) |
| 관측성 | Langfuse (선택적) |
