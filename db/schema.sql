-- Run once in the Neon SQL Editor before collecting responses.
CREATE TABLE IF NOT EXISTS fashion_responses (
  token_hash text PRIMARY KEY CHECK (length(token_hash) = 64),
  quality smallint NOT NULL CHECK (quality BETWEEN 0 AND 3),
  priority smallint NOT NULL CHECK (priority BETWEEN 0 AND 3),
  vintage smallint NOT NULL CHECK (vintage BETWEEN 0 AND 3),
  durability smallint NOT NULL CHECK (durability BETWEEN 0 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- No demo records are inserted into this table.
