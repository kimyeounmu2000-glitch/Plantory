# Plantory

Open app/Plantory_3D_Integrated_original_models.html in a browser. Keep using the existing browser profile and file address for existing records. Export a local JSON backup before moving to a new address.

Python 3 is sufficient for the build. Run python scripts/integrate-plantory.py with a separate output directory argument to compare its HTML with the committed app. The generator reads input/, models/, and scripts/growth-v2.js. Make changes to the corresponding sources and verify the generated HTML.

Run node --test tests/legacy/tests.mjs for the seed-garden model checks. The check-*.cjs scripts exercise the integrated app in fresh Chromium contexts. They use an existing Playwright installation via PLANTORY_PLAYWRIGHT if specified and an existing Chrome binary via PLANTORY_CHROME if specified.

Use main as the verified baseline. Work on a separate branch and review the diff and tests before merging. Keep personal exports and browser profiles outside the repository. See AGENTS.md and docs/tech-review.md.


## v3 저장 및 이전

현재 앱은 plantory_full_mvp_v3를 사용합니다. 기존 plantory_full_mvp_v2는 새 앱에서 수정·삭제하지 않습니다. 기존 기록이 발견되면 구버전 탭/설치 앱을 닫고 원본 백업을 보관한 뒤 화면의 '기록 확인 후 이전'을 선택하세요. 구버전 변경은 새 기록에 동기화되지 않습니다.

이전 중단 시 plantory_full_mvp_v3-migration-pending에 검증할 원문을 보존하며 확인 전 쓰기를 막습니다. 저장 공간 부족 때 원본을 삭제하지 말고 재시도하세요. 원본과 복사본이 달라진 경우 자동 복구/병합하지 않으며 양쪽 기록 보존 후 복구 검토가 필요합니다. 같은 origin의 사이트 데이터 삭제는 모든 키에 영향을 주므로 별도 JSON 백업이 필요합니다.

검사: tests/check-storage-migration.cjs는 실제 앱 이전/실패/복원/구버전 혼용을 검증합니다. tests/check-mixed-version-storage.cjs는 b0587b1의 과거 손실을 재현하며 의도적으로 종료 코드 1을 반환하는 비교 자료입니다. 현재 앱 안전성 통과 검사로 사용하지 않습니다.
