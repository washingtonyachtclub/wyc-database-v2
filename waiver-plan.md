# Waiver Plan

## Goal

Replace the WordPress waiver forms with forms owned by database v2 while preserving
the current member and guest waiver experiences exactly. The two waivers remain
separate and are not consolidated, rewritten, or simplified.

## Fixed decisions

- Maintain two independent forms:
  - the new-member waiver currently included in the WordPress join form;
  - the general guest Participant Agreement.
- Copy each form exactly, including its text, headings, capitalization, emphasis,
  acknowledgements, checkboxes, fields, and signature requirement.
- Preserve the current differences between the forms. Do not adapt the member
  language for guests or the guest language for members.
- Keep the system limited to participants who are at least 18 years old.
- Require the member waiver for every new membership application and each membership
  renewal, whether the renewal covers one quarter or one year.
- Keep the guest waiver as a standalone workflow with no account or member linkage.
  Store and search guest submissions by the name and email fields already collected by
  the current Participant Agreement.
- Make both signing experiences work well on mobile devices.
- Email the signer a copy of the executed waiver PDF.
- Do not migrate historical WordPress or RightSignature submissions. Existing records
  remain in their current systems and archives.
- Do not add geolocation collection.

## Entry flow boundaries

### New members

The new-member waiver is embedded in Stage B of the signup flow after payment. The
application and its `membership_payments` row already exist, but the application does
not yet have a resolved WYC number. The waiver acceptance links to the application.
Completing the waiver and the other Stage B requirements moves the application toward
human review; it does not activate the membership by itself.

### Existing-member renewals

Opening the renewal page does not create a record. A successful Square payment creates
a `membership_renewals` row and its linked `membership_payments` row without changing
the member's expiry quarter. The renewal page then shows the member waiver instead of
another payment form. The final acceptance links to that renewal.

After the waiver and PDF are complete, renewal reconciliation applies the frozen target
expiry and completes the renewal. Returning to the renewal page then shows its ordinary
state using the updated expiry, including the existing prepayment-cap behavior.

### Guests

The guest Participant Agreement remains an independent public form. A guest does not
create or use a WYC account. Submission creates a self-contained guest acceptance
identified by the submitted name and email address.

## Signing records

Create a new acceptance for every signing event. Never overwrite a previous member,
renewal, or guest acceptance. Use separate member and guest acceptance tables because
the forms, relationships, and lifecycles are different.

### Member waiver linkage

A member acceptance belongs to exactly one workflow:

- `application_id` for a new-member application;
- `renewal_id` for an existing-member renewal.

Enforce that exactly one of those foreign keys is present. Make each foreign key unique
so one application or renewal cannot accidentally acquire multiple completed waivers.
Do not use a bare WYC number as the renewal relationship because it would identify the
member but not the specific renewal that required the waiver.

The presence of a complete acceptance and stored PDF is the source of truth for waiver
completion. Avoid a second independently editable waiver-status value on the
application or renewal.

### Renewal coordination

`membership_renewals` owns the membership-extension workflow. It records the member,
previous expiry, frozen target expiry, selected tier and duration, creation time, and a
nullable completion time. `membership_payments` links to it but remains the financial
record.

The renewal page reads the current state without creating or mutating anything:

- no open renewal: show the ordinary renewal page;
- paid open renewal without a waiver: show the waiver requirement and no payment form;
- completed renewal: no longer open, so show the ordinary renewal page using the new
  expiry and existing prepayment-cap rules.

Payment completion and waiver completion both ask a renewal coordinator to reevaluate
the renewal. The coordinator alone updates the member's expiry, and only when all
currently configured requirements are satisfied. The waiver submission code records
the waiver but does not directly renew the member.

If waivers stop being a renewal requirement later, change the coordinator's requirement
policy and reconcile open renewals. The payment, waiver, and membership schemas do not
need to change.

### Acceptance contents

Each acceptance records at least:

- its application, renewal, or standalone guest submission, as applicable;
- the submitted legal name and email address;
- all submitted form values, including acknowledgements and checkbox responses;
- the 18-or-older response and birthdate fields currently present on the form;
- the signing timestamp;
- the signature;
- the private object-storage key for the executed PDF;
- a SHA-256 hash of the executed PDF.

The exact schema should follow existing database v2 conventions. The application must
enforce required fields server-side rather than relying only on browser validation.

## Executed PDFs

Generate one self-contained PDF for every completed waiver. It is the canonical
human-readable signing record and includes:

- the complete text and presentation of the applicable waiver;
- every acknowledgement and checkbox response;
- every required signer field;
- the signature;
- the signing timestamp;
- a unique acceptance identifier.

Do not retain only an isolated signature image. The executed PDF must show the terms
to which the signature was attached. Retaining the raw signature asset separately is
acceptable, but it does not replace the PDF.

No generalized waiver-versioning system is required initially. Each executed PDF is
self-contained, and the two canonical form definitions must not be edited silently.
If either waiver changes later, preserve the old definition and introduce explicit
versions as part of that change.

## Object storage and retention

Store executed PDFs in private object storage. The same provider may also host public
website images, but waiver files must use a separate private bucket or equivalent
access boundary and must never receive public image-hosting or CDN access rules.

- Use unique, non-guessable object keys and never overwrite an executed waiver.
- Allow downloads only through authenticated application authorization or short-lived
  signed URLs.
- Retain each executed waiver and its acceptance metadata for seven years after the
  associated membership or participation period ends.
- Prevent ordinary cleanup or image lifecycle rules from deleting waiver files.
- Preserve records subject to an incident or legal hold beyond the ordinary retention
  period.

## Implementation outline

1. Capture the two current WordPress forms as the canonical member and guest
   definitions and verify their rendered text and fields against the live forms.
2. Build responsive database v2 forms that reproduce each definition exactly.
3. Add member acceptance storage linked to applications or renewals and standalone
   guest acceptance storage searchable by name and email.
4. Generate and privately store executed PDFs after successful submission.
5. Email the executed PDF to the signer.
6. Expose waiver completion as a server-side prerequisite that the signup, renewal,
   guest, and approval flows can consume.

## Out of scope

- Reminder and resume-link behavior after a signer leaves an incomplete member flow.
- Changing, reviewing, or consolidating the waiver language.
- Changing the membership payment or human-approval flow.
- Migrating historical waiver records.
- Building generalized template-version management before either waiver changes.

## Remaining TODOs

- Select the private object-storage provider and access configuration alongside the
  image-hosting decision.
- Select the server-side PDF-generation approach and verify that it preserves the
  forms' emphasis, layout, checkbox state, and mobile signature output.
