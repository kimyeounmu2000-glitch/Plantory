# Plantory 기술 검토 기록

## 2026-11-10

- 확인 대상은 11월 5일 작업의 로컬 `outputs/seed-garden` 사본이다. Git 저장소 메타데이터가 없으며 최신 브랜치·배포본과의 일치는 확인하지 않았다.
- `index.html`과 `style.css`가 화면을 구성하고, `app.js`가 UI와 `localStorage`의 `soso-garden-v1` 데이터를 관리한다. `model.js`는 날짜·보상 로직, `plant.js`는 로컬 Three.js r170과 식물 렌더링, `plant-fallback.js`는 대체 렌더링, `sw.js`와 매니페스트는 PWA를 담당한다.
- Node v26.13.0에서 `node --test tests.mjs` 6개 통과. `npm start`는 로컬 Node 서버를 실행한다. npm 의존성과 node_modules는 없으며 프로젝트 전용 Skill은 찾지 못했다. Codex에 제공된 기존 GitHub·웹·브라우저 도구로 조사와 일회성 점검이 가능하다.
- README상 iPhone 설치·터치·오프라인 실기기 확인이 남았다. 내일 일정의 조기 체크는 허용되고 보상은 날짜가 된 뒤 지급된다. 월간·연간 3D 정원, 백업·기기 간 동기화는 README에서 미구현으로 안내한다. 이 기록은 실기기나 배포 검증을 포함하지 않는다.

| 후보 | 평가 | 판정 |
| --- | --- | --- |
| [Playwright Test](https://github.com/microsoft/playwright) | Node 테스트가 다루지 않는 모바일 UI와 새로고침 후 상태 복원을 반복 검증한다. Codex가 프로젝트 테스트 명령으로 실행 가능하다. Apache-2.0, [공식 릴리스](https://github.com/microsoft/playwright/releases)에서 v1.65.0 및 연속 릴리스 확인. 브라우저 설치 관련 [CVE-2025-59288](https://github.com/advisories/GHSA-7mvr-c777-76hp)은 1.55.1에서 수정됐다. 설치 시 개발 의존성과 브라우저 다운로드가 필요하다. 적용·제거 난도 중간. 실제 iPhone PWA 검증은 별도다. | 보류. 핵심 기능 안정화 후 반복 검사의 비용이 커질 때 재평가. |
| [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | 로딩·접근성 지표의 반복 측정과 기준 위반 감지가 가능하다. Codex는 CLI 결과를 읽을 수 있다. Apache-2.0, [v0.16.0](https://github.com/GoogleChrome/lighthouse-ci/releases/tag/v0.16.0)은 Node 22 이상이 필요하며 의존성 보안 수정을 포함한다. Chrome 실행과 점수 변동 관리가 필요해 적용·제거 난도 중간. 3D 프레임 분석은 DevTools Performance 영역이다. | 보류. 기존 Chrome DevTools Lighthouse 우선 사용. |

이번 조사에서는 도입할 도구 없음. 위 후보는 공개 자료를 검토했으며 설치나 앱 연동 실험은 수행하지 않았다. 도입 검토 시 버전 고정 후 전이 의존성과 설치 절차를 재확인한다. 브라우저 테스트를 도입할 경우 기존 사용자 저장소와 분리된 테스트 프로필을 사용한다.

격주 월요일 10:00(Asia/Seoul)에 읽기 전용 조사 예약을 제안한다. 첫 실행 후보는 2026-11-16이며 예약은 생성하지 않았다. 별도 Skill은 같은 검토 절차가 여러 프로젝트에서 반복되어 기존 지침보다 재사용 가치가 생길 때 검토한다.

## Official baseline

The integrated HTML in app/ is the baseline. The seed-garden notes above describe the earlier prototype. Integrated browser checks live in tests/. Review against the current main commit.

## 2026-11-10 공부방 통합 및 CSS 읽기 전용 검사

검사 당시 GitHub main의 README, AGENTS, 기술 기록과 생성 입력을 확인했다. 실행 HTML은 커넥터에서 본문이 비어 있어 Git blob SHA 67cf15ed2e13be3784d085476767fa608ffc468b가 일치하는 로컬 main으로 분석했다. 공부방_자료정리_V1.3.md는 Codex 작업 폴더 검색에서 발견하지 못했고 원문은 미확인이다. 사용자가 전달한 V28 요약만 참고했다.

| 우선순위 | 근거 및 제안 | 승인 후 검증 기준 |
| --- | --- | --- |
| 1 설명 글자 대비 | input/Plantory_3D_Integrated_v3.html 11~12행의 muted #76818e는 흰 배경 대비 약 3.96:1이다. 317행 paintTheme는 개인 배경 변경 시 본문·설명 글자색을 조정하지 않는다. 최소 색상 조정안을 제안한다. | 계절 4종과 개인 배경, 일정 카드에서 일반 글자 4.5:1 목표로 계산하고 실제 화면 확인 |
| 2 키보드 포커스 | 동일 파일 42행 canvas outline:0 및 공통 포커스 대상에서 canvas 누락. 361~364행 모달 포커스 진입·복귀는 있으나 Tab 순환 처리는 확인되지 않았다. | 화분 포커스 표시, 모달 Tab/Shift+Tab 순환과 닫은 뒤 복귀를 브라우저 검증 |
| 3 CSS 중복 | 12행과 후속 스타일의 view-container, screen, home-plant, plant-art, fab, toast 재선언. 최종 적용값을 보존하며 중복 정리 제안. | 320/390/510px 전후 스타일·화면 비교, 가로 넘침·모달 잘림 점검 |

확정은 기존 기획·모델·데이터 보존이다. 위 3개는 제안이며 디자인·조작 개선 승인 대기다. 실제 모바일 터치, 계절별 전체 대비, 3D와 UI의 시각적 균형은 보류다. 디자인 시스템 전면 교체와 신규 패키지는 제외한다. 수행한 검사는 소스 분석과 색상 대비 계산이며 브라우저 실측·실기기 검사·사용자 테스트는 수행하지 않았다.

이전 격주 일정 제안 이후 사용자가 월·수·금 코드 점검과 화·목·토 기술·경쟁 조사를 오전 10시(Asia/Seoul) 운영 일정으로 전달했다. 실제 예약과 실행 결과는 이번 작업에서 확인하지 않았다.

## 2026-11-10 Codex 검토 지침

OpenAI 공식 문서의 [저장소별 Codex 코드 검토 규칙](https://developers.openai.com/blog/custom-code-review-rules-for-codex)을 기존 AGENTS.md에 적용했다. 실행본 재생성, 표시와 저장의 구분, 테스트 범위, 개인정보와 3D 자원 해제를 PR 검토 기준으로 삼는다. 저장소 문서만 사용하므로 설치가 필요 없다. 자동 검토 설정과 테스트 실행은 별도이며, 지침 자체는 검사를 강제하지 않는다.
