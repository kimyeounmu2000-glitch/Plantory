# Plantory

Open app/Plantory_3D_Integrated_original_models.html in a browser. Keep using the existing browser profile and file address for existing records. Export a local JSON backup before moving to a new address.

Python 3 is sufficient for the build. Run python scripts/integrate-plantory.py with a separate output directory argument to compare its HTML with the committed app. The generator reads input/, models/, and scripts/growth-v2.js. Make changes to the corresponding sources and verify the generated HTML.

Run node --test tests/legacy/tests.mjs for the seed-garden model checks. The check-*.cjs scripts exercise the integrated app in fresh Chromium contexts. They use an existing Playwright installation via PLANTORY_PLAYWRIGHT if specified and an existing Chrome binary via PLANTORY_CHROME if specified.

Use main as the verified baseline. Work on a separate branch and review the diff and tests before merging. Keep personal exports and browser profiles outside the repository. See AGENTS.md and docs/tech-review.md.

