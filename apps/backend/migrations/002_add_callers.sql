CREATE TABLE IF NOT EXISTS callers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR     NOT NULL UNIQUE,
  risk_level   VARCHAR(16) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delete_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_callers_updated_at ON callers (updated_at);
CREATE INDEX IF NOT EXISTS idx_callers_delete_at  ON callers (delete_at);
