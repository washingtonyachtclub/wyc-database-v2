# Written Tests

## Overview

The `/tests` route provides practice and proctored final written tests for logged-in members. The Dinghy Novice test contains 77 questions covering boat parts, sailing fundamentals, safety, and club policies. A score of 90 percent is required to pass.

## How it works

Members choose a test and then select practice or final mode. Final mode requires the WYC ID of the examiner who is physically present. The ID must belong to an existing member; no examiner privilege or approval is required.

Questions and answer options use their array positions as their identifiers. Drafts are stored in the browser for the current data shape. Practice results reveal correct answers. Final results show the score and pass or fail result without revealing the answer key.

## Recording submissions

Submitted practice and final attempts are retained in `written_test_attempts`. Each row records the logged-in member, examiner for final tests, test ID, mode, submission time in UTC, correct and total counts, rounded percentage, and pass/fail result. Passing does not award a rating or send an email.

The server grades answers using the shared scoring functions. A JSON snapshot stores the test title, passing threshold, questions, options or accepted answers, submitted answers, and per-question correctness. Image references are paths; the snapshot does not contain image files. Test definitions have no version registry.

The results screen appears after saving succeeds. Failed submissions retain the draft and offer another submission attempt. An attempt UUID stays in the browser draft; a unique member/attempt constraint makes retries return the original saved result. Unfinished attempts remain in browser storage only.

### Editing a question

`src/components/tests/dinghy-test-data.ts` is the source of truth for question text and answers.

1. Edit, add, remove, or reorder an entry in the `questions` array.
2. For a text question, add accepted spellings to `acceptedAnswers`. Case-only variants are unnecessary because grading is case-insensitive.
3. For a choice question, set `correct: true` on every correct option. The option's array position is used when recording an answer.
4. Put any required image in `public/test-images/` and reference it through the question's `image` field.
5. Run `npm test -- --run` and `npm run build`.

## Key files

| File                                            | Purpose                                                  |
| ----------------------------------------------- | -------------------------------------------------------- |
| `src/routes/tests.tsx`                          | Route access and logged-in member context                |
| `src/components/tests/DinghyTest.tsx`           | Test selection, taking, review, and results              |
| `src/components/tests/dinghy-test-data.ts`      | Canonical question and answer data                       |
| `src/components/tests/dinghy-test-utils.ts`     | Answer matching and scoring                              |
| `src/components/tests/dinghy-test-data.test.ts` | Data shape and scoring checks                            |
| `src/domains/written-tests/`                    | Submission validation, server functions, and persistence |
| `src/db/schema.ts`                              | Written test attempt table                               |
| `public/test-images/`                           | Question diagrams                                        |
