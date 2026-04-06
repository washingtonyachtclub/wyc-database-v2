# Database Query Reference

SQL reference for common database queries and operations. Useful for direct database maintenance, debugging, and AI-assisted work.

All queries below use the read-only database user. Connect using the credentials from your environment configuration.

## Connecting

```bash
# Interactive session
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME

# Single query
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "SELECT * FROM lesson_quarter;"

# Export to CSV
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "SELECT * FROM WYCDatabase;" > members_export.csv
```

---

## System status

### Current quarter setting

```sql
SELECT * FROM lesson_quarter;
```

### Recent quarters

```sql
SELECT * FROM quarters
WHERE _index >= 100
ORDER BY _index;
```

### Active member count

```sql
SELECT COUNT(*) as active_members
FROM WYCDatabase
WHERE ExpireQtr >= (SELECT quarter FROM lesson_quarter);
```

---

## Member queries

### Find member by name

```sql
SELECT WYCNumber, CONCAT(First, ' ', Last) as Name, Email, ExpireQtr, JoinDate
FROM WYCDatabase
WHERE First LIKE '%Zach%' AND Last LIKE '%Taylor%';
```

### Find member by WYC number

```sql
SELECT *
FROM WYCDatabase
WHERE WYCNumber = 24522;
```

### All active members

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    quarters.school as ExpiresIn,
    Category
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
WHERE ExpireQtr >= (SELECT quarter FROM lesson_quarter)
ORDER BY Last, First;
```

### Members expiring this quarter

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    quarters.school as ExpiresIn
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
WHERE ExpireQtr = (SELECT quarter FROM lesson_quarter)
ORDER BY Last, First;
```

### Members by expiration quarter

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    ExpireQtr,
    quarters.school as QuarterName,
    JoinDate
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
WHERE ExpireQtr = 104  -- replace with target quarter index
ORDER BY JoinDate;
```

### Data integrity: ExpireQtr before JoinDate

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    JoinDate,
    ExpireQtr,
    quarters.school as ExpireQuarter,
    quarters.endDate as ExpireDate
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
WHERE JoinDate > quarters.endDate
ORDER BY JoinDate DESC;
```

---

## Rating queries

### All rating types

```sql
SELECT _index, text, type, degree
FROM ratings
ORDER BY type, degree;
```

### Members with a specific rating

```sql
SELECT
    CONCAT(db.First, ' ', db.Last) as Name,
    db.Email,
    r.rating as RatingID,
    ratings.text as Rating,
    r.date as DateAwarded
FROM WYCDatabase as db
    JOIN wyc_ratings as r ON r.member = db.WYCNumber
    JOIN ratings ON ratings._index = r.rating
WHERE r.rating = 3  -- 3 = SH Intermediate
ORDER BY db.Last;
```

### Active members with SH or DH Intermediate

```sql
SELECT
    CONCAT(db.First, ' ', db.Last) as Name,
    db.Email,
    quarters.school as ExpiresIn,
    ratings.text as Rating
FROM WYCDatabase AS db
    JOIN quarters ON quarters._index = db.ExpireQtr
    JOIN wyc_ratings as r ON r.member = db.wycNumber
    JOIN ratings ON ratings._index = r.rating
WHERE db.ExpireQtr >= (SELECT quarter FROM lesson_quarter)
    AND (r.rating = 3 OR r.rating = 7)
ORDER BY db.Last;
```

### Skipper candidates (Intermediate but not Skipper)

Members who have SH or DH Intermediate but not yet Skipper. Useful for identifying who is ready for skipper checkout.

```sql
SELECT DISTINCT
    CONCAT(db.First, ' ', db.Last) as Name,
    db.Email,
    q.school as ExpireQuarter
FROM WYCDatabase db
    JOIN quarters q ON q._index = db.ExpireQtr
WHERE db.ExpireQtr >= (SELECT quarter FROM lesson_quarter)
    AND (
        (
            db.WYCNumber IN (SELECT member FROM wyc_ratings WHERE rating = 3)
            AND db.WYCNumber NOT IN (SELECT member FROM wyc_ratings WHERE rating = 4)
        )
        OR
        (
            db.WYCNumber IN (SELECT member FROM wyc_ratings WHERE rating = 7)
            AND db.WYCNumber NOT IN (SELECT member FROM wyc_ratings WHERE rating = 8)
        )
    )
ORDER BY db.Last, db.First;
```

### Member's rating history

```sql
SELECT
    ratings.text as Rating,
    r.date as DateAwarded,
    CONCAT(examiner.First, ' ', examiner.Last) as Examiner,
    r.comments
FROM wyc_ratings as r
    JOIN ratings ON ratings._index = r.rating
    LEFT JOIN WYCDatabase as examiner ON examiner.WYCNumber = r.examiner
WHERE r.member = 24522  -- replace with WYCNumber
ORDER BY r.date DESC;
```

### Members by rating level

```sql
SELECT
    ratings.text as Rating,
    COUNT(DISTINCT r.member) as MemberCount
FROM wyc_ratings as r
    JOIN ratings ON ratings._index = r.rating
    JOIN WYCDatabase as db ON db.WYCNumber = r.member
WHERE db.ExpireQtr >= (SELECT quarter FROM lesson_quarter)
GROUP BY ratings._index, ratings.text
ORDER BY ratings.type, ratings.degree;
```

---

## Membership category queries

### All categories

```sql
SELECT * FROM memcat;
```

### Members by category

```sql
SELECT
    memcat.text as Category,
    COUNT(*) as MemberCount
FROM WYCDatabase
    JOIN memcat ON memcat._index = WYCDatabase.Category
WHERE ExpireQtr >= (SELECT quarter FROM lesson_quarter)
GROUP BY Category;
```

### Active students

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    quarters.school as ExpiresIn
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
    JOIN memcat ON memcat._index = WYCDatabase.Category
WHERE memcat.text = 'Student'
    AND ExpireQtr >= (SELECT quarter FROM lesson_quarter)
ORDER BY Last, First;
```

---

## Enrollment and join date queries

### Recent new members (last 30 days)

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    JoinDate,
    quarters.school as ExpiresIn
FROM WYCDatabase
    JOIN quarters ON quarters._index = WYCDatabase.ExpireQtr
WHERE JoinDate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY JoinDate DESC;
```

### Members who joined in a date range

```sql
SELECT
    WYCNumber,
    CONCAT(First, ' ', Last) as Name,
    Email,
    JoinDate,
    ExpireQtr
FROM WYCDatabase
WHERE JoinDate BETWEEN '2024-09-01' AND '2024-12-31'
ORDER BY JoinDate;
```

---

## Boat and fleet queries

### All boat types

```sql
SELECT * FROM boat_types ORDER BY fleet, type;
```

### Boats by fleet

```sql
SELECT
    fleet,
    COUNT(*) as BoatTypeCount,
    SUM(numberInFleet) as TotalBoats
FROM boat_types
WHERE numberInFleet > 0
GROUP BY fleet;
```

---

## Administrative / audit queries

### Audit quarter progression

```sql
SELECT
    _index,
    text,
    school,
    endDate,
    CASE
        WHEN _index <= 2 THEN 'Special'
        WHEN (_index - 3) % 4 = 0 THEN 'Summer'
        WHEN (_index - 3) % 4 = 1 THEN 'Fall'
        WHEN (_index - 3) % 4 = 2 THEN 'Winter'
        WHEN (_index - 3) % 4 = 3 THEN 'Spring'
    END as ExpectedSeason
FROM quarters
WHERE _index >= 100
ORDER BY _index;
```

### Duplicate quarter labels

```sql
SELECT school, COUNT(*) as count
FROM quarters
GROUP BY school
HAVING COUNT(*) > 1;
```

### Orphaned ratings (member doesn't exist)

```sql
SELECT r.*
FROM wyc_ratings as r
    LEFT JOIN WYCDatabase as db ON db.WYCNumber = r.member
WHERE db.WYCNumber IS NULL;
```

### Invalid examiners (examiner doesn't exist)

```sql
SELECT r.*, ratings.text
FROM wyc_ratings as r
    JOIN ratings ON ratings._index = r.rating
    LEFT JOIN WYCDatabase as examiner ON examiner.WYCNumber = r.examiner
WHERE r.examiner IS NOT NULL
    AND examiner.WYCNumber IS NULL;
```

---

## Useful filters

### Members by email domain

```sql
SELECT CONCAT(First, ' ', Last) as Name, Email
FROM WYCDatabase
WHERE Email LIKE '%@uw.edu'
    AND ExpireQtr >= (SELECT quarter FROM lesson_quarter);
```

### Members out to sea

```sql
SELECT WYCNumber, CONCAT(First, ' ', Last) as Name, Email
FROM WYCDatabase
WHERE out_to_sea = 1;
```

### Active members with no ratings

```sql
SELECT
    db.WYCNumber,
    CONCAT(db.First, ' ', db.Last) as Name,
    db.Email
FROM WYCDatabase as db
    LEFT JOIN wyc_ratings as r ON r.member = db.WYCNumber
WHERE db.ExpireQtr >= (SELECT quarter FROM lesson_quarter)
    AND r._index IS NULL
ORDER BY db.Last;
```

### Members with duplicate ratings

```sql
SELECT
    db.WYCNumber,
    CONCAT(db.First, ' ', db.Last) as Name,
    ratings.text as Rating,
    COUNT(*) as Times
FROM wyc_ratings as r
    JOIN WYCDatabase as db ON db.WYCNumber = r.member
    JOIN ratings ON ratings._index = r.rating
GROUP BY db.WYCNumber, db.First, db.Last, ratings._index, ratings.text
HAVING COUNT(*) > 1
ORDER BY Times DESC, db.Last;
```

---

## Notes

- Quarter indices start at 3 for Summer 1999, increment by 1 each quarter
- Indices 1 (Unknown) and 2 (Honorary) are special sentinel values
- `ExpireQtr >= current_quarter` means the member is active
- Rating degree: 0 = none/crew, 1 = novice, 2 = intermediate, 3 = skipper
- Rating types: SH (single-handed), DH (double-handed), KB (keelboat), SB (sailboard), Cat (catamaran), written, rig
- See [quarters.md](quarters.md) for full quarter index details
- JoinDate is a MySQL TIMESTAMP (YYYY-MM-DD HH:MM:SS)
