---
title: 새 세션에서도 프로젝트 결정 이어가기
description: 코딩 에이전트 사용자를 위한 가상 프로젝트 실습. 결정을 저장하고 새 세션에서 이유와 출처를 다시 찾습니다.
---

**대상:** 코딩 에이전트·바이브 코딩 사용자. **형식:** Python 노트북 대신 복사용 프롬프트와 작은 샘플 프로젝트.

## 이런 상황에 사용합니다

어제 재시도 정책을 정했는데 새 대화를 열자 선택한 이유를 다시 설명해야 합니다. 항상 지켜야 할 규칙은 여전히 `AGENTS.md`나 `CLAUDE.md`에 둡니다. memtomem은 과거 결정과 근거를 명시적으로 저장하고 다시 찾는 경로를 제공합니다.

이 사례는 **합성 데이터 데모**입니다. 실제 고객 후기나 생산성 향상 측정 결과가 아닙니다.

## 직접 확인할 사용 흐름

샘플은 단계적 배포 동안 기존 인증 callback을 유지합니다. ADR에 호환성 이유·rollback flag·재시도 설정이 들어 있습니다.

1. [빠른 시작](/ko/guides/quickstart/)과 [AI 클라이언트 연결](/ko/guides/connect-ai-client/)을 완료합니다.
2. 가상의 재시도 결정과 이유를 명시적으로 저장합니다.
3. 실제로 새 세션을 열고 기억 검색을 요청합니다.
4. 결정·이유·원본 경로가 함께 나오는지 확인합니다.

전체 저장·재시작·검색 절차는 [세션을 넘나드는 기억](/ko/guides/memory-persistence/)을 따릅니다. Claude Code와 Codex용 지시문을 각각 제공하며, 다른 클라이언트에서는 `mem_add`·`mem_search`를 직접 요청합니다.

## 샘플 실행

[샘플 프로젝트와 한국어 실행 안내 열기](https://github.com/memtomem/memtomem/tree/main/examples/onboarding/retry-policy)

격리된 `demo.py`는 빈 저장소, 결정 저장, 출처 있는 ADR 검색, 정리를 검증합니다. API 키·임베딩 모델이 필요 없고 클라이언트를 등록하지 않으며 평소 기억 저장소를 건드리지 않습니다. 최초 패키지 설치에는 인터넷이 필요합니다.

성공하면 다음 네 줄이 나옵니다.

```text
PASS empty-store
PASS decision-round-trip
PASS adr-source
PASS fixture-preserved-and-state-cleaned
```

이는 CLI의 영속성 검증이며, **AI 클라이언트가 새 세션에서 기억 도구를 호출했다는 증거는 아닙니다**. 새 세션 검증은 별도로 진행합니다.

## 다음 활용: 코드를 바꾸기 전에 ADR 확인

샘플 폴더에서 실행합니다.

```bash
mm index docs/auth-callback-adr.md
mm search "legacy callback" --format context
```

그다음 코딩 에이전트에 요청합니다.

> 코드는 아직 수정하지 마세요. memtomem에서 "legacy callback"을 검색하세요.
> 호환성 유지 이유, rollback flag, 원본 경로를 보여 주세요.
> 그 근거를 확인한 다음에만 변경안을 제안하세요.

`/api/auth/legacy-callback`, 오래된 클라이언트 호환성, `AUTH_CALLBACK_V2_ENABLED`가 확인되어야 합니다. 샘플의 표준 라이브러리 테스트가 통과해도 실제 서비스의 안전성을 인증하는 것은 아닙니다.

## 성공 판단

- 새 세션에서 실제 기억 도구를 호출했다.
- 그럴듯한 답변뿐 아니라 저장한 이유와 출처를 찾았다.
- 명시적으로 색인한 ADR을 다시 찾았다.
- 두 클라이언트를 비교한다면 같은 저장소와 호환되는 프로젝트 문맥을 확인했다.

자동 대화 수집·다른 컴퓨터 동기화·코딩 오류 감소율은 이 데모가 입증하지 않습니다. 코딩 에이전트 구독은 API 없는 CLI 샘플과 별개입니다. 막힌 단계는 [문제 해결](/ko/guides/troubleshooting/)로 돌아가 확인하세요.

**다음:** [기존 자료 색인](/ko/guides/index-and-import/) 또는 [LangGraph 활용](/ko/use-cases/langgraph/).
