# Written Tests

## Overview

`/tests` offers practice and proctored final tests. Passing records a result; it does not award a rating. Examiner IDs are checked for membership, not examiner privileges.

## Editing tests

Keep test slugs stable. Question and option identities are array positions, so definition changes invalidate unfinished browser drafts. Submitted attempts preserve their content and scoring threshold in snapshots, keeping historical results independent of later edits.

Snapshots reference image paths without copying the files. Use a new filename when replacing a diagram so historical attempts retain the original image.

## Key Files

| File                                          | Purpose                                  |
| --------------------------------------------- | ---------------------------------------- |
| `src/components/tests/dinghy-test-data.ts`    | Dinghy content and answer key            |
| `src/components/tests/sailboard-test-data.ts` | Sailboard content and answer key         |
| `src/domains/written-tests/`                  | Test registry and submission persistence |
