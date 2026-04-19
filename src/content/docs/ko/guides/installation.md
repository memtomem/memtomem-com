---
title: 설치
description: memtomem과 memtomem-stm의 상세 설치 가이드.
---

:::caution[memtomem 0.1.0–0.1.9 사용자 보안 공지]
이전 버전의 memtomem은 `~/.claude/projects`, `~/.gemini`, `~/.codex/memories` 같은 자동 탐색 기억 디렉터리 안에 있던 자격 증명 파일(`oauth_creds.json`, `credentials*`, `id_rsa*`, `*.pem`, `*.key`)을 인덱싱할 수 있었습니다. Gemini CLI와 함께 사용 중이었다면, 약 1시간 주기의 OAuth 토큰 갱신으로 인해 지속적으로 재인덱싱이 일어났습니다.

**0.1.10 이상으로 업그레이드**(`pip install -U memtomem` 또는 `uv tool upgrade memtomem`)한 뒤, 기존 인덱스를 정리하고 자격 증명을 로테이션하세요.

```bash
mm purge --matching-excluded              # 삭제 대상 미리보기 (dry-run)
mm purge --matching-excluded --apply      # 실제 삭제 실행
```

해당 기간 동안 인덱싱되었을 가능성이 있는 자격 증명(Gemini OAuth 토큰, API 키 등)은 로테이션을 권장합니다. 자세한 내용은 [v0.1.10 릴리즈 노트](https://github.com/memtomem/memtomem/releases/tag/v0.1.10)를 참고하세요.
:::

## 요구 사항

- **Python 3.12+**
- **pip**, **uv**, 또는 **pipx**
- 시맨틱 검색용 임베딩 프로바이더 — `mm init` 단계에서 선택합니다(아래 [임베딩 프로바이더](#임베딩-프로바이더) 섹션). 초기 단계에서는 선택을 유보해도 무방합니다. 선택 이전에는 키워드 검색만으로 동작합니다.

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

기본 패키지만으로도 동작합니다. 실제로 필요한 확장만 선택적으로 설치하면 됩니다.

```bash
pip install memtomem[onnx]         # fastembed 로컬 임베딩 (권장 기본값)
pip install memtomem[ollama]       # Ollama 프로바이더 클라이언트
pip install memtomem[openai]       # OpenAI 프로바이더 클라이언트
pip install memtomem[korean]       # kiwipiepy 한국어 형태소 분석
pip install memtomem[code]         # tree-sitter (Python / JS / TS) AST 청킹
pip install memtomem[web]          # FastAPI + uvicorn 기반 Web UI
pip install memtomem[all]          # 전체
```

설치 후 `mm` CLI를 사용할 수 있습니다:

```bash
mm init          # 대화형 설정 마법사
mm serve         # MCP 서버 시작
mm web           # Web UI 대시보드
```

## STM 프록시 (memtomem-stm)

```bash
# uv (권장)
uv tool install memtomem-stm

# 설치 없이 실행
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
mms init                           # 최초 설정 마법사
mms add <name> --command <cmd>     # 업스트림 MCP 서버 등록
mms list                           # 등록된 서버 목록
mms health                         # 업스트림 연결 상태 점검
mms serve                          # STM 프록시 시작
```

## 임베딩 프로바이더

| 프로바이더 | 설치 | GPU | 비용 |
|---|---|---|---|
| **ONNX** (fastembed) | 기본 내장 | 불필요 | 무료 |
| **Ollama** | `ollama pull nomic-embed-text` | 불필요 | 무료 |
| **OpenAI** | API 키 필요 | — | 유료 |

**어떤 프로바이더를 선택할지 결정하기 어려운 경우**, **ONNX**를 권장합니다. 완전 로컬에서 동작하고 무료이며, 별도 데몬이나 API 키가 필요하지 않습니다. 이후 `mm init`을 다시 실행하거나 `MEMTOMEM_EMBEDDING__PROVIDER` 환경 변수를 설정하여 변경할 수 있습니다(중첩된 pydantic-settings 키에는 `__` 이중 언더스코어를 사용합니다).

## 기술 스택

참고용 정보이며, memtomem을 사용하는 데 필수 지식은 아닙니다.

| 범주 | 기술 |
|------|------|
| MCP | FastMCP (stdio, SSE, Streamable HTTP) |
| 프레임워크 | Pydantic v2, Click (CLI), FastAPI (Web UI) |
| 데이터베이스 | SQLite (FTS5 전문 검색), sqlite-vec (벡터 검색) |
| 코드 파싱 | tree-sitter (Python, JS, TS AST) |
| 한국어 | kiwipiepy 형태소 분석기 (선택) |
| 관측성 | Langfuse (선택) |
