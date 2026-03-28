# Honorary Members

## How it works now

Honorary status is determined by **position 1030** ("Honorary Member") in the `officers` table. This is the single source of truth.

```sql
-- Is this member honorary?
SELECT 1 FROM officers
WHERE member = :wycNumber AND position = 1030 AND active = 1;
```

Honorary members are otherwise normal members. They have a real `expireQtr`, register/renew each quarter like everyone else, and follow the same active-membership check (`expireQtr >= current_quarter`). The only difference is they don't pay.

To grant honorary status: INSERT into `officers` with `position = 1030, active = 1`.
To revoke: set `active = 0` on their officers row (soft delete).

## Legacy system 

The old system used `expireQtr = 2` as a magic sentinel meaning "never expires." Quarter index 2 had the text "Honorary" and predated all real quarters (which start at index 3).

Legacy code checked for this explicitly:
```perl
# DoorCode.pm — honorary members got door codes
(expireqtr=2) AND (out_to_sea=0)

# MemStat.pm — honorary counted as current members
expireqtr=2 OR expireqtr >= current_quarter
```

Problems with this approach:
- `expireQtr` served double duty (expiry date + honorary flag), making queries unreliable
- No way to distinguish "honorary and active" from "honorary and gone" — all 83 looked the same
- Honorary members bypassed the normal renewal flow entirely
- Position 1030 already existed but was inconsistently used (only 7 of 83 had both)

## Migration (2026-03-27)

All 83 `expireQtr = 2` members were migrated:
- 75 received position 1030 (7 already had it)
- All 83 had `expireQtr` changed from 2 to 1 (Unknown)
- A `UNIQUE(member, position)` constraint was added to the officers table

v2 code should never reference `expireQtr = 2`.
