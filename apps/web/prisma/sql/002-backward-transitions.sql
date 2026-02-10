-- 002-backward-transitions.sql
-- Adds backward (reverse) transitions for every existing forward transition.
-- Run this in Supabase SQL Editor to enable bidirectional stage movement.
--
-- Safe to run multiple times (idempotent via NOT EXISTS check).

INSERT INTO transitions ("id", "fromStageId", "toStageId", "appliesTo", "isActive")
SELECT
  gen_random_uuid(),
  t."toStageId",     -- reverse: old destination becomes new source
  t."fromStageId",   -- reverse: old source becomes new destination
  t."appliesTo",
  true
FROM transitions t
WHERE NOT EXISTS (
  SELECT 1 FROM transitions t2
  WHERE t2."fromStageId" = t."toStageId"
    AND t2."toStageId" = t."fromStageId"
    AND t2."appliesTo" = t."appliesTo"
);

-- Verify: should show both forward and backward transitions
-- SELECT s1.name AS "from", s2.name AS "to", t."appliesTo"
-- FROM transitions t
-- JOIN stages s1 ON s1.id = t."fromStageId"
-- JOIN stages s2 ON s2.id = t."toStageId"
-- ORDER BY t."appliesTo", s1."orderIndex";
