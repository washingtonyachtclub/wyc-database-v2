# Keelboat calendar

## Overview

`/keelboat-calendar` displays public boat availability inside the application layout. Reservation details and comments require authentication. The sidebar and quick switcher include the calendar.

A two-column boat color chart identifies morning and afternoon slots. Personal reservation cells show last names to signed-in members.

The displayed month is local state and defaults to the current Pacific month on page load. The month heading opens a month picker with year navigation. Reservation links use a `reservation` URL parameter.

The calendar uses `calendarboats`, `calendartable`, and `calendarcomment`. Boat names come from the database. `calendarboats.active` controls new booking eligibility. Rascal (boat 4) and Talaria (boat 7) are inactive. Inactive boats appear in the calendar and legend whenever they have reservations in the displayed date range; their records remain intact. Fleet order and theme colors are defined by boat ID.

## Reservations

Members with a recorded `KB` rating of degree greater than zero can make personal reservations from any location. Membership expiration and rating expiration do not restrict reservations. A database `db` privilege or an active appointment to the active Keelboat Instruction Chair (4033) or SnC Chair (2190) position grants calendar-admin access. The central `isCalendarAdmin` permission allows booking without a rating, creating admin reservations, editing any reservation’s details, and deletion. `calendaradmin` is not consulted.

Managers see separate personal and admin reservation buttons. Personal reservations have a `memberWYCNumber` owner and use the normal booking limits, including when made by a manager. Admin reservations have no owner, accept an optional public title. Destination is optional for both reservation types. Their forms omit crew count and phone. An empty title displays as “Admin.” Notes and creator identity require login.

Both types record the signed-in creator in `createdByWYCNumber`, independently of the owner. The server sets this field; clients cannot choose it. `reservationType` distinguishes personal and admin records. Public availability contains the type and admin title, but no member or creator identities, contact details, destination, or notes.

The first and last slots are inclusive. Stored `03:00:00` and `15:00:00` values represent morning and afternoon slots in Pacific local time, not UTC departure and arrival timestamps. Morning covers 3 a.m. to 3 p.m.; afternoon covers 3 p.m. to 3 a.m. the following day. Identical start and end markers represent one half-day.

Personal reservations cannot start before today, have a limit of three outstanding reservations, and can cover up to 14 inclusive calendar dates. A single half-day opens on the preceding calendar day at the slot's start time. Admin reservations bypass these restrictions and can start in the past; personal reservations never bypass them. Both types must end within one calendar year ahead and are subject to overlap checks. Outstanding reservations follow the stored end marker, consistent with existing records.

Reservation forms include a review step. Personal reservations display a payment obligation, no-refund policy, and a reminder to arrange any transfer outside the system. All signed-in members can comment. Managers can permanently delete a reservation and its comments after confirmation. Writes use the shared database client. Expected booking-rule failures return structured validation results and appear inline with an edit action; they do not use the technical error-report panel.

## Pricing

The calendar does not display or calculate dollar amounts, consult `keelboat_pricing`, or classify holidays. Square remains the source of rates. New reservations populate the existing full/half weekday/weekend count columns using Saturdays and Sundays only. Historical counts are unchanged.

## Write coordination

The shared calendar tables use MyISAM. Writes acquire table locks on a dedicated connection; overlap and outstanding-reservation checks run while the lock is held. Comment creation failure triggers deletion of the newly inserted reservation. This is compensating cleanup, not transactional rollback. Connections are destroyed if unlocking fails.

### Migration

The DreamHost calendar webroot redirects all requests except ACME certificate validation to `https://database.washingtonyachtclub.org/keelboat-calendar` using `.htaccess`. The 302 redirect discards old paths and query strings and bypasses PHP booking handlers. Legacy files remain on disk. Concurrent legacy writes must stay disabled because their separate check and insert operations can race with v2. The `keelboat_calendar` migration adds boat activity, reservation type, title, and creator fields and makes the owner nullable. Existing rows retain their IDs and owners and default to personal reservations. Their creator remains unknown; it is not inferred from the owner. Historical administrative entries require explicit classification. Legacy readers that inner-join the owner to the member table cannot display ownerless admin reservations.

## Key files

| File                                          | Purpose                                               |
| --------------------------------------------- | ----------------------------------------------------- |
| `src/routes/keelboat-calendar.tsx`            | Public month grid and reservation navigation          |
| `src/components/keelboat-calendar/`           | Reservation form, review, details, comments, deletion |
| `src/domains/keelboat-calendar/calendar.ts`   | Slot semantics, date rules, fleet order, day counts   |
| `src/domains/keelboat-calendar/queries.ts`    | Availability, private details, and permissions        |
| `src/domains/keelboat-calendar/write.ts`      | Locked writes and overlap checks                      |
| `src/domains/keelboat-calendar/server-fns.ts` | Validated and authorized endpoints                    |

See [architecture](architecture.md).

## Detail edits and shared accounts

Personal reservation owners and admin-event creators can edit their own details. Calendar managers can edit any reservation's details and delete reservations. Editable fields are destination, crew count, and phone for personal reservations, or destination and public title for admin reservations. Boat, slots, owner, creator, and reservation type remain fixed. Each edit appends a comment identifying the editor; existing comments are retained.

The shared KBCalendar Admin (#3) and WYC SnC Admin (#4) records remain for historical references. The `retire_shared_calendar_accounts` migration clears both stored password hashes. Email login, password recovery, and existing v2 sessions are unchanged.
