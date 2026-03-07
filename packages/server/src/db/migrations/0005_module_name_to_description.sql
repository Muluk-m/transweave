-- Migrate modules JSONB: rename "name" field to "description" in each module object
UPDATE "projects"
SET "modules" = (
  SELECT jsonb_agg(
    jsonb_build_object('code', elem->>'code', 'description', elem->>'name')
  )
  FROM jsonb_array_elements("modules") AS elem
)
WHERE jsonb_array_length("modules") > 0;