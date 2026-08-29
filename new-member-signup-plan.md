# New Member Signup Plan

## Goal

Replace the WordPress form and CSV-processing workflow with a public signup owned by the database application. Applicants pay immediately, finish all required contact and waiver information, and then enter a manual review queue. Review protects against duplicates and processing errors rather than deciding whether someone may join.

## Decisions

- Use an unauthenticated bare route, tentatively `/join`.
- Charge through Square during signup and reuse the renewal catalog, pricing, card form, quarter calculations, IMA acknowledgement, Plus One branching, and email infrastructure.
- Block an email already assigned to a member before payment. Direct the person to `/renew-membership` or `contact@washingtonyachtclub.org`.
- Run possible name matching only inside the officer review workflow. Never show a name-match warning to the applicant or interrupt the public signup flow.
- Allow any user with the `db` privilege to review applications.
- Let reviewers correct primary or UW email before approval and record the original value, editor, and edit time. Keep other submitted information read-only; members can update their profiles after approval.
- Give the review page clear status labels, plain-language actions, and helpful confirmation messages so nontechnical officers can use it comfortably.
- Keep every application. Retention or anonymization is not part of the initial scope.
- Do not collect country, Student ID, or registered-course proof.
- Collect both primary and UW email when applicable and preserve both if they differ.
- Add UW email as a typed column on the member record.
- Keep emergency contacts outside the main member table.
- Keep paid but incomplete applications indefinitely. Send an initial reminder about three days after payment; refine reminder scheduling later.
- Freeze the target expiry quarter at payment and store it on the application.
- Handle exceptional refunds manually in Square, then mark the payment and application refunded or closed. Preserve the application as the payment audit record.
- Use one random UUID as the application primary key and completion URL identifier. Do not add a separate public ID or access-token table.
- Give completion links no time-based expiration. After requirements are submitted, the same URL shows a read-only processing confirmation rather than an editable form.
- Reuse the existing Gmail canonicalization rules for duplicate checks.
- Remove the special Yahoo warning. Yahoo-family addresses are 16 of 1,162 exported addresses overall and 3 of 276 rows whose membership term includes 2026.

## Recommended public flow

Use two stages, but make them feel like one continuous flow.

### Stage A: identify, price, and pay

Collect only what is required to prevent duplicates, choose the correct product, and charge:

1. First and last name.
2. Primary email and confirmation.
3. UW status and UW email when applicable.
4. IMA acknowledgement and the UW-status-dependent Plus One question from the renewal flow.
5. Membership duration and live Square price.
6. Card details and payment.

Before charging, state clearly that payment is received immediately but membership is not activated until the required contact information and waiver are completed and the application is reviewed.

### Stage B: complete requirements

After a successful charge:

1. Redirect the same browser directly to the completion page.
2. Send a recovery link by email so the applicant can resume on another device.
3. Collect address, phone, emergency contact, optional demographics, an optional "How did you hear about the club?" response, and the separately designed waiver.
4. Move the application to `pending_review` only after all required information and the waiver are complete.

After submission, show: "You have submitted all required information. We are processing your membership, and you will receive an email with your account details shortly."

This adds more lifecycle and reminder logic than one large form, but it keeps payment conversion separate from application completion and keeps waiver implementation out of the critical payment path. The main operational cost is handling paid but incomplete applications.

### Current form coverage

The supplied HTML and CSV contain the following relevant fields:

- Identity and selection: first name, last name, confirmed primary email, new-member acknowledgement, membership duration, and UW status.
- Conditional membership questions: UW email, IMA membership or acknowledgement, and the UW-status-dependent Plus One question.
- Contact: address lines, city, state, ZIP code, phone, and emergency-contact name, phone, and relationship.
- Optional demographics: residential status, student level, gender identity and self-description, and selected communities or experiences.
- Waiver-owned data: participant name, birthdate, signature, and signing date.
- Payment: dues code, card details, and name on card.

The new flow keeps the identity, UW email, IMA or Plus One, contact, emergency-contact, demographic, waiver, and payment concepts. It removes country, Student ID, registered-course upload, and student-quarter selection. Dues-exempt codes remain later work. Cardholder fields remain owned by the Square card component.

Use this short referral-source list, with stable option IDs and an optional text field for Other:

- Friend or current WYC member.
- UW club fair or campus event.
- UW, IMA, or student-organization listing.
- WYC event or sailing activity.
- Web search or WYC website.
- Social media.
- Other.

## Application, payment, and member linkage

Use explicit keys throughout. Email is duplicate-detection data, not the relational link.

- `membership_applications.id` is a random UUID primary key used by both the database and completion URL. It is never changed into a WYC number.
- `membership_applications.resolved_wyc_number` starts null and is set to the new or existing WYC number when review finishes.
- `membership_payments.application_id` ties the completed Square payment to the application before a member exists.
- `membership_payments.renewal_id` ties an existing-member payment to the renewal workflow that owns the membership extension.
- `membership_payments.wyc_number` is present for an existing-member renewal, starts null for a new-member payment, and is filled during approval.

This creates a permanent chain:

`Square payment / membership_payments -> application -> resolved WYC number -> member`

Existing-member renewals use the parallel chain:

`Square payment / membership_payments -> membership renewal -> member`

Do not make `resolved_wyc_number` globally unique. A person may legitimately have more than one application over time, and a duplicate application may resolve to an existing member.

## Data model

### `membership_applications`

- Identity: UUID ID, first name, and last name.
- Email: primary email, normalized primary email, UW email, normalized UW email, and email-correction metadata.
- Membership: UW status, IMA acknowledgement, Plus One response, purchased duration, and frozen target expiry quarter.
- Contact completion: address, phone, emergency-contact snapshot, and completion timestamp.
- Flexible questionnaire: questionnaire version and response snapshot.
- Waiver completion is derived from the unique member-waiver acceptance linked to the application. Exact fields belong to the separate waiver design; do not maintain an independently editable waiver status or external reference on the application.
- Payment workflow: whether payment is pending, completed, refunded, or needs reconciliation. Financial details live in `membership_payments`.
- Review: review state, resolved WYC number, reviewer, decision time, and optional note.
- Lifecycle: created and updated timestamps.

Keep payment, requirements, waiver, and review states separate. The useful combined lifecycle is:

1. `payment_pending`
2. `paid_pending_requirements`
3. `pending_review`
4. `approved_new`, `resolved_existing`, or `closed`

### Payment linkage

Keep `membership_payments` as the financial ledger shared by new-member applications and existing-member renewals. New-member applications and `membership_renewals` own their respective membership workflows; a payment records the Square transaction but does not by itself activate or extend membership. Do not add a separate payment-attempt table initially.

Extend it with:

- Nullable unique `application_id` for new-member payments.
- Nullable unique `renewal_id` for existing-member payments.
- Nullable `wyc_number`, populated when the application resolves to a member.
- Unique Square payment ID.
- Existing amount, currency, tier, duration, and payment-status fields.

Exactly one workflow link is present:

- `application_id IS NOT NULL` means the payment originated from the new-member application flow.
- `renewal_id IS NOT NULL` means the payment originated from the existing-member renewal flow.
- `status = 'EXEMPT'`, zero amount, and null Square IDs identify a dues-exempt grant, whether it originated from a future new-member or renewal exemption flow.

Do not add a redundant event-type column. If a third origin is introduced later, add its workflow relationship then.

Insert the row immediately after Square returns `COMPLETED`. The row is already a completed financial transaction; `paid_pending_requirements` and `pending_review` belong to the application, not the payment. During approval, set `wyc_number` on the existing ledger row. The application owns the frozen target expiry and the approval transaction applies it to the member. A manual refund changes the ledger status and application state to `refunded`.

The application is created before calling Square, and its stable key is used for Square idempotency. A Square success and database failure cannot be one atomic transaction, so a successful external charge that was not fully recorded becomes `reconciliation_required` and must not prompt a second payment.

### Table boundaries

Table size is not the deciding factor. Separate data when it has a different lifecycle, is reused by other workflows, or can occur more than once.

- Keep application fields and the single review decision together in `membership_applications`. There is no separate review table initially.
- Keep payments separate because `membership_payments` is the financial ledger shared by signup and renewal.
- Keep existing-member renewal state in `membership_renewals`, which owns the frozen expiry change and completion state independently of payment and waiver records.
- Keep the waiver separate because it is an independent system with its own completion rules and records.
- Keep the flexible questionnaire snapshot on the application because there is one submitted response document per application.
- Copy the approved emergency contact to its member-owned table because it remains useful after signup.

### Member contact tables

- Add a typed `uw_email` column to the member record and preserve primary and UW email separately.
- Add a one-to-one `member_emergency_contacts` table keyed by WYC number with name, phone, and relationship.
- Keep submitted values on the application, allow only the documented email correction, and copy the approved values into member-owned storage on approval.

## Questionnaire versioning

Do not add a database column for each demographic or changeable questionnaire item. Use a hybrid model:

- Stable process fields are typed columns: emails, UW status, IMA acknowledgement, Plus One response, duration, payment state, review state, and member linkage. Waiver completion is derived from its linked acceptance.
- Flexible questions are a versioned JSON response document validated by a discriminated TypeScript type and Zod schema.

Each stored answer contains a stable question ID, stable option IDs, the labels shown at submission, and the submitted value. The snapshot is therefore self-describing. The application can render or export an old response without retaining every historical React form in code.

Changing flexible question wording or options, or adding or removing a demographic question, requires a code change and deploy but no database migration. A migration is appropriate only when a value becomes core relational state that must be joined, constrained, indexed, or routinely queried.

Historical CSV export is generated rather than mirrored in the schema. It takes the union of stable question IDs present in the selected applications, creates one column per exported question or option, and leaves cells blank when that question was not in an application's version. This gives the useful behavior of the WordPress export without accumulating obsolete database columns.

This is a common survey pattern: systems such as Qualtrics distinguish stable internal question IDs from editable labels and export questions as columns. JSON Schema similarly supports versioned, identified documents. MySQL can query JSON directly, and a frequently used answer can later be promoted or indexed without redesigning the whole form system.

## Completion URL

Use the application UUID directly in a route such as `/join/$applicationId`. A UUIDv4 is sufficiently difficult to guess for this limited workflow, and the completion page does not authenticate a member account.

- The same UUID is the row's only primary identifier; do not add `public_id`, a hashed token, or a token table.
- The initial browser redirects to this URL after payment, and reminder or resend emails use the same URL.
- An incomplete application can be edited through the URL indefinitely.
- A submitted application shows only the processing confirmation and cannot be edited through the public page.
- An approved, resolved, closed, or refunded application shows an appropriate final status without exposing account credentials or other applications.

The UUID is still a bearer link: anyone who receives it can edit that incomplete application. This is an accepted simplicity tradeoff for the limited data and action available on this page.

## Review and approval

The officer page includes both paid-but-incomplete applications and applications ready for review. It uses plain status labels, search and filtering, and obvious next actions.

- Paid but incomplete: show payment date and missing requirements, allow email correction, and provide a prominent `Resend completion email` button.
- Ready for review: show submitted data, questionnaire snapshot, linked waiver acceptance, payment reference, and possible member matches.
- Email correction: preserve the originally submitted address and record who changed it and when. Resend uses the corrected address.
- Duplicate-name warnings and matching details are internal only and never appear in the public flow.

Ordinary approval runs one database transaction that:

1. Rechecks normalized email and possible duplicates.
2. Creates the member and assigns a WYC number.
3. Copies primary and UW email, contact data, and emergency contact into member-owned storage.
4. Updates the existing `membership_payments` row with the WYC number.
5. Records the resolved WYC number and marks the application `approved_new`.

Send the welcome email after commit and make delivery independently retryable.

If a reviewer is certain that an internally flagged application belongs to an existing member, allow `resolved_existing`. Show a prominent officer-only warning with the matched member, submitted email, amount, and expiry change, require explicit typed confirmation, and recheck the target inside the transaction. Apply the purchased duration with renewal quarter math and update the application and ledger links.

Membership applications and dues exemptions remain separate workflows. They may share a later approvals inbox, notification banner, and navigation entry.

## Implementation phases

### 1. Finalize policies and contracts

- Define the application, questionnaire snapshot, UUID completion route, and state-transition schemas.

### 2. Schema and shared services

- Add the UUID application, unified payment-ledger linkage, UW email, and emergency-contact schema.
- Extract server-side email normalization and duplicate matching.
- Extract the shared Square catalog-order-payment operation used by renewal and signup.
- Make membership-state and ledger writes transactional while keeping external-payment reconciliation explicit.

### 3. Public payment stage

- Build Stage A on `/join` using existing form and Square components.
- Add duplicate blocking, renewal questionnaire reuse, pricing, idempotency, rate limiting, safe errors, and reconciliation states.
- Redirect to Stage B and send the recovery link after payment.

### 4. Completion stage

- Build UUID-based resume access and the submitted processing-confirmation state.
- Collect required contact and emergency information plus optional demographics.
- Integrate the separate waiver contract and gate review on completion.
- Add confirmation, an initial reminder about three days after payment, and officer-triggered resend.

### 5. Review and resolution

- Build a polished pending list and detail page for `db` users, including email correction and resend.
- Add new-member approval and guarded existing-member resolution.
- Add retryable welcome and resolution emails.

### 6. Verification and cutover

- Exercise successful, declined, duplicate-submit, existing-email, internal name-match, invalid UUID, email correction, resend, email-failure, incomplete, refund, and payment/database-failure cases in Square Sandbox.
- Verify build and type checking. Do not add automated tests unless explicitly requested.
- Run WordPress and the new flow in parallel briefly, reconcile results, then retire CSV processing.

## Later work

- Waiver-system implementation details.
- Dues-exempt new members.
- Discount or promotional codes.
- General secondary-email management beyond the primary and UW fields.
- Iframe mode and separate public-facing visual polish.
- Combined approvals inbox, notifications, and banners.
- Demographic filtering, reporting, and exports.
- Applicant-facing status lookup beyond the UUID completion page.
- Automated refunds and more advanced incomplete-application recovery.
- Retention or anonymization if policy changes.

## Research references

- [Qualtrics export options](https://www.qualtrics.com/support/survey-platform/data-and-analysis-module/data/download-data/export-options/)
- [Qualtrics dataset structure](https://www.qualtrics.com/support/survey-platform/data-and-analysis-module/data/download-data/understanding-your-dataset/)
- [JSON Schema identifiers and modular schemas](https://json-schema.org/understanding-json-schema/structuring)
- [MySQL JSON search functions](https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html)
- [Baymard checkout field research](https://baymard.com/blog/checkout-flow-average-form-fields)
- [WPForms partial-entry capture](https://wpforms.com/docs/how-to-install-and-use-form-abandonment-with-wpforms/)
