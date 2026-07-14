---
title: 운영 및 Web API
description: readiness, API 검증, 인덱싱 결과, 업그레이드, 운영 안전 규칙.
---

## Readiness와 API 문서

`mm web`을 실행하고 로컬 `/api/docs`에서 OpenAPI 인터페이스를 확인합니다.
자동화는 `GET /api/readiness`를 호출해야 합니다. 준비되면 `200`, 필수
startup 구성요소가 준비되지 않았으면 `startup_unavailable`과 `503`을
반환합니다.

검색은 `source_exact`, `chunk_type`, `created_from`, `created_before`를
지원합니다. 시간에는 timezone이 필요하며 잘못되거나 역전된 범위는
`422`입니다. Export는 namespace 필터를 지원합니다. 초기 인덱싱은
결과를 `success`, `partial`, `failed`로 구분합니다.

## 운영 점검

```bash
mm status
mm status --json
mm warmup
mm web status
```

CI에서는 `mm status --json`의 최상위 `error` 필드를 실패로 처리합니다.
초기화 오류에서도 JSON 형식을 유지하기 위해 프로세스 종료 코드는 0일
수 있습니다.

`mm upgrade`는 `uv tool` 설치를 관리합니다. pipx는 `pipx upgrade
memtomem`, 프로젝트 의존성은 lockfile 갱신 후 `uv sync`, 소스 설치는
Git 갱신 후 `uv sync --extra all`을 사용합니다.

Web UI는 기본적으로 loopback에 바인딩됩니다. 외부 접근에는 remote UI,
trusted-origin, trusted-host 플래그가 모두 필요하며 인증 reverse proxy
뒤에서만 노출해야 합니다.
