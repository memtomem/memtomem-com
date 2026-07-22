---
title: 운영 및 Web API
description: 준비 상태 확인, Web API, 색인 결과, 업그레이드와 운영 안전 규칙.
---

<a id="readiness와-api-문서"></a>
## 준비 상태와 API 문서

`mm web`을 실행하면 로컬 `/api/docs`에서 OpenAPI 문서를 볼 수 있습니다.
자동화에서는 `GET /api/readiness`로 준비 상태를 확인하세요. 준비가 끝나면
`200`을 반환합니다. 시작에 필요한 구성 요소가 준비되지 않으면
`startup_unavailable`과 `503`을 반환합니다.

검색에는 `source_exact`, `chunk_type`, `created_from`, `created_before`를 사용할
수 있습니다. 시간에는 시간대를 포함해야 합니다. 형식이 잘못됐거나 시작과
끝이 뒤바뀐 범위에는 `422`를 반환합니다. 내보내기는 네임스페이스 필터를
지원합니다. 초기 색인 결과는 `success`, `partial`, `failed`로 구분합니다.

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

`mm upgrade`는 `uv tool`로 설치한 환경을 관리합니다. pipx 설치는 `pipx
upgrade memtomem`을 사용하세요. 프로젝트 의존성은 잠금 파일을 갱신한 뒤
`uv sync`를 실행합니다. 소스 설치는 Git을 갱신하고 `uv sync --extra all`을
실행합니다.

Web UI는 기본적으로 내 컴퓨터에서만 접속할 수 있는 루프백 주소에
연결됩니다. 외부에서 접속하려면 remote UI, trusted-origin, trusted-host
플래그를 모두 설정해야 합니다. 반드시 인증을 처리하는 리버스 프록시 뒤에서
운영하세요.
