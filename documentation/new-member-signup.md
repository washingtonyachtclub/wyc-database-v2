# New Member Signup

## Overview

New members pay on the public `/join` route, then complete their contact information and member
waiver through a resumable application link. Payment does not create a member or activate
membership. A completed application enters the officer review queue.

## Payment

The signup page collects the applicant's name, primary email, conditional UW email, UW status, IMA
acknowledgement, Plus One response, duration, and card details. Primary email is checked against
member records when the field loses focus. A match displays a recovery link but does not block
signup.

Prices and order totals come from the same Square catalog variations used by renewals. The server
derives the price tier from UW status. It creates an application before calling Square and stores
the Square order ID and payment idempotency key on that application. One IP address can create up to
eight applications within 30 minutes.

A completed Square payment creates one `membership_payments` row linked through `application_id`
and changes the application payment state to `completed`. A decline or definite failure allows a
new attempt. An ambiguous Square result changes the state to `reconciliation_required` and tells
the applicant not to pay again.

After payment, the browser opens `/join/{applicationId}` and an email sends the same recovery link.
The application UUID is the bearer credential for this page and does not expire.

## Application completion

The completion page collects address, phone, emergency contact, optional versioned demographics,
adult acknowledgement, and signature. The waiver text and signature pad are shared with member
renewals. Optional selection questions use responsive select-all-that-apply checkbox groups. The
submit button remains enabled; a submission with missing required values shows a summary, marks
each missing field, and focuses the first one.

New applications freeze questionnaire version `new-member-v1`. Stored snapshots include the
question and option labels shown at submission, so submitted responses remain readable if a later
version changes the form.

Submission creates the executed waiver PDF, uploads it to the waiver R2 bucket, and then runs one
database transaction. The transaction inserts the `member_waivers` acceptance, stores the contact
and questionnaire snapshot on the application, sets `requirements_completed_at`, and changes the
review state to `pending_review`.

A submitted application is read-only and shows the processing confirmation. Invalid UUIDs show a
not-found state. Failed, closed, approved, and reconciliation-required applications show their
respective terminal or recovery state.

## Review and activation

Users with the `db` privilege review applications in the New members and Dues exemptions categories
of `/membership-approvals`. The new-member detail shows the payment, contact and emergency information,
waiver, questionnaire snapshot, and possible member matches. Reviewers can correct email addresses,
resend the completion email, create a new member, apply the application to an existing member, or
close it without approval.

Possible matches use case-insensitive primary email, normalized full first and last name, and
normalized phone number. Name normalization ignores accents, punctuation, and whitespace. Matching
does not use first initials, Gmail dot or plus-address rewriting, or fuzzy similarity.

Approval locks and rechecks the application, payment, waiver, and target member inside one database
transaction. Creating a member allocates its WYC number in that transaction. Both resolution paths
copy current contact information and the emergency contact, attach the ledger payment to the WYC
number, apply the frozen expiry quarter, and record the reviewer and resolution on the application.
The member email sends after commit and remains independently retryable from the approval queue.
If delivery fails, the approved application remains in the queue until the welcome email is sent.
Closing an application does not issue or record a refund. Refunds are handled manually in Square.

## Emails and daily tasks

Payment completion sends a resumable application link immediately. Officers can resend it after an
email correction. The Vercel cron calls `/api/cron/daily-tasks` once per day; the endpoint runs lesson
reminders and sends one reminder to paid applications that remain incomplete after 72 hours. A
successful application reminder records `completion_reminder_sent_at`; a failed attempt remains
eligible for the next run.

## Application states

Payment and review are independent states:

| State                     | Meaning                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `pending`                 | Application exists and its Square attempt has not finished         |
| `failed`                  | The order or payment definitely failed and another attempt is safe |
| `reconciliation_required` | The outcome may include a charge and requires manual review        |
| `completed`               | The financial ledger row exists and requirements may be submitted  |
| `not_ready`               | Contact information and waiver are incomplete                      |
| `pending_review`          | All public requirements are stored                                 |
| `approved_new`            | Review created a new member                                        |
| `approved_existing`       | Review applied the application to an existing member               |
| `closed`                  | An officer closed the application without activating membership    |

## Key files

| File                                                         | Purpose                                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `src/routes/join.tsx`                                        | Public identity, questionnaire, pricing, and payment page                          |
| `src/routes/join_.$applicationId.tsx`                        | Resumable contact, questionnaire, and waiver page                                  |
| `src/routes/membership-approvals.tsx`                        | Shared new-member and dues-exemption approval inbox                                |
| `src/routes/api.cron.daily-tasks.ts`                         | Authenticated daily lesson and application-reminder task list                      |
| `src/domains/membership-applications/server-fns.ts`          | Validation, rate limiting, payment coordination, email, and completion transaction |
| `src/domains/membership-applications/approval-server-fns.ts` | Review queries, email correction, and transactional member resolution              |
| `src/domains/membership-applications/email.ts`               | Completion, welcome, and returning-member email delivery                           |
| `src/domains/membership-applications/reminders.ts`           | Incomplete-application reminder selection and delivery                             |
| `src/domains/membership-applications/questionnaire.ts`       | Append-only demographic questionnaire definitions and snapshots                    |
| `src/domains/membership-payments/square-payment.ts`          | Shared Square catalog, order, and payment operations                               |
| `src/domains/waivers/MemberWaiverAgreementFields.tsx`        | Shared member waiver presentation and signature fields                             |
| `src/db/schema.ts`                                           | Application, payment, emergency contact, and waiver relationships                  |
