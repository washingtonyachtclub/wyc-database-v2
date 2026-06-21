# Recurring Maintenance Tasks

Manual tasks required to keep the database running correctly.

---

## Update the Current Quarter

**Frequency:** Every quarter (roughly every 3 months)
**Table:** `lesson_quarter` (single row, `_index = 1`)

The `lesson_quarter.quarter` value controls what the system considers "now." When the real-world quarter changes, this value must be updated to match the corresponding `quarters._index`. If it's wrong, members show as active/expired incorrectly.
