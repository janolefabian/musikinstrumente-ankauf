ALTER TABLE leads ADD COLUMN idempotency_key_hash TEXT;
ALTER TABLE leads ADD COLUMN processing_status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE leads ADD COLUMN processing_error TEXT NOT NULL DEFAULT '';
ALTER TABLE leads ADD COLUMN processing_updated_at TEXT;
ALTER TABLE leads ADD COLUMN consent_at TEXT;
ALTER TABLE leads ADD COLUMN consent_version TEXT;
ALTER TABLE leads ADD COLUMN deleted_at TEXT;
ALTER TABLE leads ADD COLUMN deletion_status TEXT NOT NULL DEFAULT '';

ALTER TABLE photos ADD COLUMN storage_status TEXT NOT NULL DEFAULT 'ready';
ALTER TABLE photos ADD COLUMN storage_error TEXT NOT NULL DEFAULT '';
ALTER TABLE photos ADD COLUMN operation_key_hash TEXT;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope TEXT NOT NULL,
  identity_hash TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (scope, identity_hash, window_start)
);

CREATE TABLE IF NOT EXISTS object_deletions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  object_key TEXT NOT NULL UNIQUE,
  lead_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  next_attempt_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS lead_continuations (
  lead_id TEXT NOT NULL,
  idempotency_key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_json TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (lead_id, idempotency_key_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_idempotency
  ON leads(idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deletion
  ON leads(deletion_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_photos_storage
  ON photos(storage_status, lead_id);
CREATE INDEX IF NOT EXISTS idx_photos_operation
  ON photos(lead_id, operation_key_hash, storage_status);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires
  ON api_rate_limits(expires_at);
CREATE INDEX IF NOT EXISTS idx_object_deletions_retry
  ON object_deletions(completed_at, next_attempt_at, lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_continuations_status
  ON lead_continuations(status, updated_at);

-- 0002 introduced the covering replacement but deliberately did not remove the
-- original lookup index. It is redundant once idx_photos_lead_created exists.
DROP INDEX IF EXISTS idx_photos_lead;

PRAGMA optimize;
