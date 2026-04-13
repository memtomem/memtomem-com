---
title: API 레퍼런스
description: memtomem MCP 도구 목록과 CLI 명령어 요약.
---

## LTM MCP 도구 (memtomem — 74 도구)

### 핵심 도구

| 도구 | 설명 |
|------|------|
| `mem_status` | 서버 연결 상태 및 통계 확인 |
| `mem_add` | 기억 저장 (content, tags, namespace) |
| `mem_search` | 하이브리드 검색 (BM25 + 벡터 + RRF) |
| `mem_recall` | ID 기반 단일 기억 조회 |
| `mem_list` | 기억 목록 조회 (필터, 페이징) |
| `mem_read` | 소스 파일 읽기 |
| `mem_index` | 경로/파일 인덱싱 |
| `mem_stats` | 인덱스/검색 통계 |
| `mem_do` | 메타 도구 — core 모드에서 비핵심 작업 라우팅 |

### 멀티 에이전트 도구

| 도구 | 설명 |
|------|------|
| `mem_agent_register` | 에이전트 등록 (id, description) |
| `mem_agent_search` | 에이전트 네임스페이스 + 공유 검색 |
| `mem_agent_share` | 특정 기억을 공유 네임스페이스로 내보내기 |

### 유지보수 도구

| 도구 | 설명 |
|------|------|
| `mem_tag` | 태그 관리 (추가, 제거, 목록) |
| `mem_namespace` | 네임스페이스 관리 |
| `mem_health` | 인덱스 건강 진단 |
| `mem_cleanup` | 만료/중복 기억 정리 |

> 전체 74개 도구 목록은 [memtomem 리포지토리 문서](https://github.com/memtomem/memtomem/tree/main/docs)를 참고하세요.

## STM MCP 도구 (memtomem-stm — 10 도구)

프록시된 업스트림 도구 외에, STM 자체 관리 도구:

| 도구 | 설명 |
|------|------|
| `stm_status` | STM 프록시 상태 확인 |
| `stm_cache_stats` | 응답 캐시 통계 |
| `stm_cache_clear` | 캐시 초기화 |
| `stm_compression_stats` | 압축 전략별 통계 |
| `stm_surfacing_stats` | 서피싱 통계 (적중률, 피드백) |
| `stm_feedback` | 서피싱/압축 품질 피드백 전달 |

## CLI 명령어

### `mm` (LTM)

```bash
mm init              # 초기 설정 마법사
mm serve             # MCP 서버 시작
mm web               # 웹 UI 대시보드 시작
mm search <query>    # CLI에서 직접 검색
mm index <path>      # CLI에서 직접 인덱싱
mm ingest claude-memory   # Claude Code 기억 통합
mm ingest gemini-memory   # Gemini CLI 기억 통합
mm ingest codex-memory    # Codex CLI 기억 통합
mm context sync      # Context Gateway 동기화
mm context import    # 런타임 파일 → 정규 소스 역추출
```

### `mms` (STM)

```bash
mms add <name> --command <cmd> --args <args> --prefix <prefix>
                     # 업스트림 MCP 서버 등록
mms list             # 등록된 서버 목록
mms remove <name>    # 서버 제거
mms serve            # STM 프록시 시작
mms stats            # 프록시 통계
```

## 환경 변수

주요 설정은 환경 변수로 제어합니다. 전체 목록은 각 리포지토리의 Configuration 문서를 참고하세요.

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `MEMTOMEM_EMBEDDING_PROVIDER` | 임베딩 프로바이더 (onnx/ollama/openai) | `onnx` |
| `MEMTOMEM_DB_PATH` | SQLite DB 경로 | `~/.memtomem/memtomem.db` |
| `MEMTOMEM_STM_COMPRESSION` | 기본 압축 전략 | `auto` |
| `MEMTOMEM_STM_SURFACING` | 서피싱 활성화 여부 | `true` |
