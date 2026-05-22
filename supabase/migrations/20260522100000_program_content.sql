-- Templatable rich program content.
-- Adds a nullable `content` JSONB column to `programs` holding an ordered list
-- of typed sections that render as on-brand panels on the program detail page.
-- Each section is one of:
--   { "type": "text",     "title"?, "body" }
--   { "type": "steps",    "title"?, "items": [string] }
--   { "type": "schedule", "title"?, "rows":  [{ "time", "label" }] }
--   { "type": "lineup",   "title"?, "items": [{ "name", "blurb"?, "tryItems"?: [string], "links"?: [{ "label", "url" }] }] }
--   { "type": "stats",    "title"?, "items": [{ "label", "value" }] }
--   { "type": "feedback", "title"?, "items": [{ "product"?, "quote", "rating"?, "recommend"? }] }
--   { "type": "cta",      "title"?, "label", "url" }
--
-- One column keeps every program templatable without a schema change per
-- section type. Additive and idempotent — safe to re-run.

ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS content JSONB;
