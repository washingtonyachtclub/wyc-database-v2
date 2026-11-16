# Keelboat calendar

The calendar reuses legacy tables to preserve reservation history. Retiring a boat hides it from new bookings without hiding its past reservations.

Personal bookings follow member limits even when made by an admin. Admin bookings represent club events; their public title is separate from the private creator identity. Historical creators remain unknown rather than inferred from owners.

Square owns pricing. The calendar neither quotes rates nor calculates holiday charges.

## Legacy constraints

- Slot timestamps are inclusive Pacific-local markers: `03:00` for morning and `15:00` for afternoon. Equal endpoints represent one half-day.
- MyISAM lacks transactional rollback. Table locks protect overlap checks; compensating deletion handles failed reservation-comment creation.
- Shared account records remain for historical references. Clearing their password hashes does not revoke existing sessions or disable email recovery.

## Cutover

Keep legacy booking writes disabled: their separate check and insert can race with v2. The DreamHost `.htaccess` redirects calendar traffic to `/keelboat-calendar`, except ACME certificate validation. Legacy readers that require a member owner cannot display ownerless admin bookings.
