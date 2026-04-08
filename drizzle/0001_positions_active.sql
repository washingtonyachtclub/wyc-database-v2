-- ============================================================================
-- Positions Active Column + Type Cleanup Migration
--
-- Changes:
--   1. Add `active` tinyint column to `positions` (default 0)
--   2. Add pos_type rows: 5='Fleet Captains', 6='Honorary'
--   3. Rename pos_type entries: 1→'Officers', 2→'Position Holders'
--   4. Move fleet captain positions (NOT 2000) to type 5
--   5. Move honorary (1030) to type 6
--   6. Mark active=1 for officer-page positions + type 3 + type 4 + 1030
--   7. Fix NULL sortorder values for correct display ordering
-- ============================================================================

-- 1. Add active column
ALTER TABLE positions ADD COLUMN active tinyint NOT NULL DEFAULT 0;

-- 2. New pos_type entries
INSERT INTO pos_type (_index, text) VALUES (5, 'Fleet Captains');
INSERT INTO pos_type (_index, text) VALUES (6, 'Honorary');

-- 3. Rename existing pos_type entries (fix 'Comittee' typo, match display labels)
UPDATE pos_type SET text = 'Officers' WHERE _index = 1;
UPDATE pos_type SET text = 'Position Holders' WHERE _index = 2;

-- 4. Move fleet captain positions to type 5
--    Head Fleet Captain (2000) stays type 2 (Position Holder)
UPDATE positions SET type = 5 WHERE _index IN (
  2105, 2010, 2030, 2040, 2050, 2080, 2100, 2130, 2090, 2135
);

-- 5. Move honorary to type 6
UPDATE positions SET type = 6 WHERE _index = 1030;

-- 6. Mark active positions
--    a) Officer page positions (the 23 currently in use)
UPDATE positions SET active = 1 WHERE _index IN (
  1000, 1010, 1020, 2161, 2220,
  2170, 2141, 2190, 2260, 2180, 2181, 2210,
  2000, 2105, 2010, 2030, 2040, 2050, 2080, 2100, 2130, 2090, 2135
);
--    b) All type 3 (Chief) and type 4 (Other) positions
UPDATE positions SET active = 1 WHERE type IN (3, 4);
--    c) Honorary Member (1030)
UPDATE positions SET active = 1 WHERE _index = 1030;

-- 7. Fix NULL sortorder values
--    Type 1 (Officers)
UPDATE positions SET sortorder = 40 WHERE _index = 2161;   -- Secretary
--    Type 2 (Position Holders)
UPDATE positions SET sortorder = 2400 WHERE _index = 2141;  -- Media Curator
UPDATE positions SET sortorder = 2550 WHERE _index = 2180;  -- Fundraising Chair
UPDATE positions SET sortorder = 2560 WHERE _index = 2181;  -- Recruitment Chair
--    Type 5 (Fleet Captains)
UPDATE positions SET sortorder = 1050 WHERE _index = 2105;  -- Bravo Fleet Captain
UPDATE positions SET sortorder = 2150 WHERE _index = 2135;  -- Whaler Fleet Captain
