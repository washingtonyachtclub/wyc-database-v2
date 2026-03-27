# Recurring Maintenance Tasks

Manual tasks required to keep the database running correctly. These are not automated — someone needs to do them.

---

## Update the Current Quarter

**Frequency:** Every quarter (roughly every 3 months)
**Table:** `lesson_quarter` (single row, `_index = 1`)

The `lesson_quarter.quarter` value controls what the system considers "now." When the real-world quarter changes, this value must be updated to match the corresponding `quarters._index`. If it's wrong, the effects cascade:

- Members show as active/expired incorrectly
- Lessons for the current quarter don't appear (or old ones persist)
- Instructor privilege grants are computed against the wrong quarter

In the legacy system, this is done via the Lesson Control Panel by the Vice Commodore. In v2, it would need a direct DB update or an admin UI.

```sql
-- Example: advance to Spring 2026 (index 110)
UPDATE lesson_quarter SET quarter = 110 WHERE _index = 1;

-- Verify
SELECT lq.quarter, q.text, q.school
FROM lesson_quarter lq
JOIN quarters q ON lq.quarter = q._index;
```

See [quarters doc](quarters.md) for how quarter indices map to calendar periods.

---

## Add Future Quarters

**Frequency:** Annually, before the existing rows run out
**Table:** `quarters`

The `quarters` table has a finite set of rows. New quarters must be added before the system runs out of future entries. Without them, there's no valid value to set `lesson_quarter.quarter` to, and no valid `ExpireQtr` to assign to renewing members.

The cycle repeats: **Summer, Fall, Winter, Spring**. Follow the existing naming pattern:

| Column   | Example values                            |
|----------|-------------------------------------------|
| `text`   | `June 2027`, `Sept 2027`, `Dec 2027`, `March 2028` |
| `school` | `Spring 2027`, `Summer 2027`, `Fall 2027`, `Winter 2028` |
| `endDate`| Approximate quarter end date, or NULL      |

```sql
-- Example: add quarters for the 2027 academic year
INSERT INTO quarters (text, school, endDate) VALUES
  ('June 2027',  'Spring 2027', '2027-07-01'),
  ('Sept 2027',  'Summer 2027', '2027-09-30'),
  ('Dec 2027',   'Fall 2027',   '2028-01-01'),
  ('March 2028', 'Winter 2028', '2028-04-01');
```

---

## Membership Processing — Hardcoded Quarter Map

The membership processing pipeline (`wyc-api/dashboard/wyc_processor.py`) contains a **hardcoded mapping** from quarter names to quarter indices. As of writing, this map only extends through Fall 2026. If not updated before Winter 2027, the processor will fail to assign the correct `ExpireQtr` to renewing or new members.

When adding new quarters to the `quarters` table, also update this mapping in `wyc_processor.py` to include the new quarter indices.
