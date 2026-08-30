# Waiver Plan

## Status and delivery sequence

The guest waiver is complete and deployed. It has a public `/guest-waiver` route, a
mobile signature pad, server-side validation, deterministic PDF generation, private R2
storage, and durable `guest_waivers` metadata. Development uses a clearly marked mock
waiver and the development R2 bucket. Production uses the real agreement and production
bucket. The guest flow does not email the executed PDF.

The remaining member work is split into two pull requests:

1. **Member waiver on renewals:** add the shared member-waiver record, make an
   existing-member renewal a durable workflow, and require its waiver before applying
   the membership extension.
2. **New-member signup:** implement the complete application flow in
   [new-member-signup-plan.md](./new-member-signup-plan.md) and link its waiver to the
   same `member_waivers` table.

The first pull request is implemented on `codex/member-waiver-renewals`.

## Shared waiver decisions

- Keep `guest_waivers` and `member_waivers` separate. The forms and relationships have
  different lifecycles.
- Use one append-only row for every completed signing event. Never overwrite an
  executed waiver.
- Require all fields and acknowledgements on the server. Both forms use a required
  `I confirm that I am 18 years of age or older` acknowledgement instead of collecting
  a full birthdate.
- Store a waiver-version identifier with every row. A content change introduces a new
  identifier; it does not change old PDFs or rows.
- Treat the executed PDF as the canonical human-readable record. It contains the full
  waiver text, submitted values, signature, signing time, and acceptance ID.
- Store PDFs in the private `wyc-waivers-dev` and `wyc-waivers-prod` R2 buckets. Do not
  expose either bucket through a public CDN.
- Use non-guessable object keys and never overwrite a PDF.
- Do not retain a separate raw signature image after the PDF is generated.
- Do not migrate historical WordPress or RightSignature submissions.
- Do not collect geolocation.

## Pull request 1: member waiver on renewals

### Goal

A successful payment records money received but does not immediately extend the
membership. It creates an open renewal and sends the member to the waiver. The member's
expiry changes only after the waiver PDF and acceptance row exist. Refreshing or leaving
the page never loses the paid renewal and never asks the member to pay twice.

### Data model

#### `membership_renewals`

One row owns each new renewal workflow:

- `id`: random UUID primary key;
- `wyc_number`: the existing member, indexed as a logical relationship because the
  legacy `WYCDatabase` MyISAM table cannot be a foreign-key target;
- `previous_expire_qtr`: the expiry observed when the renewal was created;
- `target_expire_qtr`: the frozen expiry to apply after all requirements are complete;
- `tier` and `duration`: the purchased membership selection;
- `source`: paid or dues-exempt;
- `created_at`: when the workflow was recorded;
- `completed_at`: null while the renewal still needs a waiver, then set in the same
  transaction that updates the member;
- `closed_at`: set when an exemption request is denied or cancelled without completing
  the renewal.

The row owns workflow state. It does not duplicate the Square transaction or the
executed waiver.

#### `membership_payments`

This remains the financial ledger:

- add nullable unique `renewal_id` for new renewal payments;
- make `square_payment_id` unique when present;
- keep `wyc_number`, amount, currency, tier, duration, Square IDs, status, and audit
  timestamps;
- preserve the existing expiry snapshot fields for historical compatibility even
  though the linked renewal owns the frozen expiry for new workflows.

Existing ledger rows remain valid with a null `renewal_id`. New self-service renewal
payments must link to a renewal. The migration does not invent renewal rows for old
payments.

#### `member_waivers`

One row records the completed member waiver:

- `id`: random UUID primary key and PDF acceptance ID;
- nullable unique `renewal_id`;
- nullable unique `application_id`, reserved for the application workflow;
- a constraint requiring exactly one workflow link;
- `waiver_version`;
- signer name and email snapshots from the authenticated member record;
- `submitted_values` JSON for all acknowledgements and member-waiver-specific fields;
- `signed_at`;
- unique private R2 `object_key`;
- `pdf_sha256`, `pdf_size`, and `pdf_content_type`.

This pull request writes only `renewal_id`. It does not create placeholder application
rows or member-waiver rows. The application foreign key is added when
`membership_applications` exists; until then no server path accepts an application ID.

#### `renewal_questionnaire`

New questionnaire rows link to `renewal_id` so answers belong to a specific renewal,
not merely to a member and quarter. Historical rows remain unchanged. The coordinator
uses the linked answers when applying member-category changes.

### Runtime sequence

1. The authenticated member opens `/renew-membership`.
2. With no open renewal, the route shows the normal questionnaire and payment flow.
3. The server computes and freezes the previous and target expiry quarters.
4. Square completes the charge.
5. One database transaction creates the open `membership_renewals` row, its
   `membership_payments` row, and linked questionnaire row. It does not update the
   member's expiry.
6. Send an immediate `Complete your WYC renewal` email linking to `/renew-membership`.
   It says that payment was received, the waiver is still required, and the member does
   not need to pay again. The wording says `if you have not already signed` so it remains
   accurate if the member completes the waiver before the email arrives.
7. The route reloads into the paid, waiver-required state. It never shows another card
   form for that open renewal.
8. The member reviews the member waiver, confirms every acknowledgement, and signs.
9. The server validates the submission, generates the PDF, uploads it to private R2,
   and inserts the unique `member_waivers` row.
10. The renewal coordinator runs. It locks or rechecks the open workflow, applies the
    frozen expiry and category idempotently, and sets `completed_at`. The new workflow
    tables are transactional; the legacy MyISAM member table is not, so a retry resumes
    and converges if execution stops between those writes.
11. The ordinary renewal confirmation email is sent after commit. Email failure does
    not undo the completed renewal.
12. The route returns to the ordinary membership state using the updated expiry and
    existing prepayment-cap rules.

The route derives the visible state from durable rows:

- no open renewal: show the ordinary renewal form;
- open renewal without `member_waivers`: show only the waiver;
- completed renewal: show the ordinary state using the updated membership expiry.

### Failure and retry behavior

- **Square fails:** create no renewal or ledger row and allow another payment attempt.
- **Square succeeds but the database write fails:** never tell the member to pay again.
  Log the Square identifiers and show a contact-the-club reconciliation message.
- **PDF generation or R2 upload fails:** create no waiver row. Keep the paid renewal
  open and let the member retry the waiver without another payment.
- **R2 succeeds but the waiver insert fails:** keep the renewal open. The private orphan
  object is safe and can be cleaned up separately.
- **The waiver is submitted twice:** the unique `renewal_id` prevents two completed
  acceptances. Return the already-completed state rather than creating another row.
- **Completion is retried:** the coordinator is idempotent. It rechecks `completed_at`
  and sets the member expiry to the greater of its current and frozen target values. An
  already-stored waiver can resume the coordinator without creating a second waiver.
- **Confirmation email fails:** the renewal remains complete because email is
  post-commit and non-blocking.

### Dues-exemption renewals

A dues-exemption renewal has two requirements: an officer approval and a completed
member waiver. The easiest flow prevents approval until the waiver is present:

1. Requesting an exemption creates the `dues_exemption_requests` row, an open
   `membership_renewals` row with `source = 'exempt'`, and its questionnaire row in one
   transaction.
2. Send an immediate email asking the member to sign the waiver before officers can
   approve the exemption.
3. `/renew-membership` shows the open renewal and waiver. It does not show payment.
4. The exemption approval page derives one of two actionable labels:
   - `Waiting for waiver`: approval is disabled, denial remains available;
   - `Ready to review`: the waiver exists and approval is enabled.
5. The approval server function rechecks the waiver even when the UI enabled the
   button. Approval inserts the zero-dollar `EXEMPT` ledger row and completes the
   renewal in the same transaction.
6. Denial or cancellation closes the renewal without changing membership. A waiver
   already signed for that request remains an append-only historical record.

This avoids an `approved but waiting for waiver` state. The future approvals interface
can use the same requirement-label pattern without changing the exemption tables again.

### Member waiver form

Reuse the guest-waiver implementation where the mechanics match:

- the responsive layout and `SignaturePad` component;
- server-side age, field, acknowledgement, and signature validation;
- versioned TypeScript content;
- deterministic `pdf-lib` generation;
- SHA-256 metadata and private R2 upload.

The member form uses the distinct member agreement currently shown in Step 4 of the
WordPress signup form. It has its own content definition and PDF generator so changes
do not affect the guest agreement. For an authenticated renewal, display the member's
existing name and email read-only and store them as signing-time snapshots. The member
enters only a signature and confirms that they are at least 18 years old.

The guest agreement already states that the signer acknowledges being 18 or older. Add
the same explicit required checkbox to its UI and executed PDF, stop collecting the
birthdate, and introduce a new guest waiver version. Existing executed PDFs remain
unchanged. The guest schema migration removes the typed `date_of_birth` column and the
birthdate and raw signature image from stored JSON. New records store the adult
acknowledgement without retaining the raw signature image in the database.

Use `waivers/v1/member/{year}/{acceptanceId}.pdf` for production objects and the
existing mock prefix in development.

### Implementation checklist

- [x] Verify the distinct member-waiver legal text and fields in the WordPress flow.
- [x] Use authenticated name and email snapshots without requiring re-entry.
- [x] Require both a waiver and officer approval for dues-exemption renewals.
- [x] Send an immediate incomplete-renewal email and a final completion email, without
      attaching the executed PDF.
- [x] Replace birthdate collection with an explicit adult acknowledgement in both forms
      and migrate `guest_waivers`.
- [x] Add the schema and generated migration, preserving historical ledger and
      questionnaire rows.
- [x] Add renewal row, payment, and questionnaire writes in one transaction after a
      completed Square payment.
- [x] Make Square payment/database reconciliation explicit and prevent repeat payment.
- [x] Add open-renewal loading to the renewal route.
- [x] Add the immediate incomplete-renewal and exemption-waiver emails.
- [x] Add member-waiver content, form, server validation, PDF generation, and R2 upload.
- [x] Add the idempotent renewal coordinator.
- [x] Move expiry and category updates from payment time to coordinator completion.
- [x] Send the ordinary renewal confirmation only after coordinator completion.
- [x] Gate dues-exemption approval on the waiver and complete the renewal after approval.
- [x] Preserve the legacy membership-processing path until its WordPress input is
      retired; do not manufacture new digital-waiver rows for imported historical forms.
- [x] Verify the generated migration, type checking, production build, and executed PDF
      rendering.
- [ ] Manually exercise desktop and mobile success, refresh/resume, duplicate submit,
      declined payment, PDF/R2 failure, and payment/database reconciliation cases.

## Retention and access

Retain executed waiver PDFs and metadata for seven years after the associated
membership or participation period ends. Prevent ordinary R2 cleanup rules from
deleting them. Preserve records subject to an incident or legal hold beyond the normal
retention period. Any future download path must require officer authorization or a
short-lived signed URL.

## Out of scope for pull request 1

- The public membership application UI, payment flow, completion link, review queue,
  and approval logic.
- Historical waiver migration.
- Generalized waiver-template administration.
- An officer PDF browser or download UI.
- Automated orphan-object cleanup or legal-hold tooling.
- Delayed or repeated incomplete-renewal reminder jobs beyond the immediate email.
