# Written Tests

## Overview

The `/tests` route provides practice and proctored final written tests for logged-in members. Each test has a stable slug, a title, a passing percentage, and an ordered list of questions. Dinghy Novice has 77 questions worth 100 points. Sailboard Novice has 47 questions worth 109.5 points. Both require 90 percent to pass.

## Taking a test

Members choose a test and then practice or final mode. Final mode requires the WYC ID of a physically present examiner. The ID must belong to an existing member; no examiner privilege check or approval is required.

Question and option identities are their array positions. Browser drafts are scoped to the member and test. A fingerprint of the definition prevents restoring or submitting a draft against changed questions or scoring rules. Unfinished attempts are not stored on the server.

## Scoring and review

Text, single-choice, and multiple-choice questions have explicit point values. Multiple-choice questions require the exact correct set for full credit. Text grading ignores case, spacing, and punctuation and accepts limited spelling errors.

A statement-group question contains independently scored true/false statements. Each statement has a point value; the group's value is their sum. Wrong or unanswered statements earn zero. A group counts as one question and is fully answered only when every statement has a response.

The server calculates earned and possible points. Percentage is derived from those totals and displayed to one decimal place. Pass/fail uses the unrounded ratio. Partially correct groups appear with incorrect answers, before fully correct questions. Review shows points earned for each question and statement. Practice mode reveals correct answers; final mode hides them in the interface.

## Recording submissions

All test types use `written_test_attempts`. Each row records the member, examiner, test slug, mode, submission time in UTC, correct and total question counts, earned and possible points, and pass/fail. Percentage is not stored.

A JSON snapshot preserves the title, passing percentage, question text, point values, answer keys, submitted answers, and question results. Saved results use that snapshot rather than the current definition. Historical snapshots without explicit point values represent one point per question. Image references are paths; image files are not embedded in the snapshot.

Results appear after saving succeeds. Failed saves retain the draft. The attempt UUID is the primary key and makes retries return the saved result; a UUID cannot be reused for a different test, mode, or examiner. Passing does not award a rating or send an email.

## Editing tests

Each test data file contains its canonical questions and answers. Text questions list accepted answers; choice options carry `correct` flags. Statement groups list their prompts, correct boolean responses, and individual point values. Categories organize navigation and review. Diagrams belong in `public/test-images/` and must be attached to every question that needs them.

Register a definition in `writtenTests` to make it available to the catalog and server grading. Keep its slug stable when editing its content. Change image filenames when replacing a diagram needed by saved snapshots.

## Key Files

| File                                          | Purpose                                        |
| --------------------------------------------- | ---------------------------------------------- |
| `src/routes/tests.tsx`                        | Route access and member context                |
| `src/components/tests/WrittenTests.tsx`       | Shared catalog, taking, review, and results UI |
| `src/components/tests/dinghy-test-data.ts`    | Dinghy questions, answers, and point values    |
| `src/components/tests/sailboard-test-data.ts` | Sailboard questions, answers, and point values |
| `src/components/tests/dinghy-test-utils.ts`   | Shared answer matching and point scoring       |
| `src/domains/written-tests/types.ts`          | Shared question and definition types           |
| `src/domains/written-tests/registry.ts`       | Available tests and definition fingerprints    |
| `src/domains/written-tests/schema.ts`         | Submission validation and snapshot types       |
| `src/domains/written-tests/queries.ts`        | Server grading and persistence                 |
| `src/db/schema.ts`                            | Submission table                               |
