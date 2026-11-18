-- The v2 API creates this table automatically on first use.
-- This optional SQL can also be run manually in Neon.
-- The original fashion_responses table remains untouched.
CREATE TABLE IF NOT EXISTS fashion_responses_v2 (
  token_hash text PRIMARY KEY CHECK (length(token_hash)=64),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- 27 Google Forms results are aggregate counts in public/survey-config.js,
-- not fabricated individual rows. They are added once when computing statistics.
