-- Canonical snapshot of the final schema for tests and inspection.
-- Bootstrap and upgrades must use `wrangler d1 migrations apply`; do not execute
-- this file before migrations, because it already contains all later columns.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  type TEXT,
  classified_type TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  story TEXT,
  maker TEXT,
  lead_class TEXT DEFAULT 'C',
  interest_score INTEGER DEFAULT 0,
  confidence INTEGER DEFAULT 0,
  notable INTEGER DEFAULT 0,
  summary TEXT,
  ai_json TEXT,
  photo_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  make_status TEXT DEFAULT 'pending',
  make_error TEXT DEFAULT '',
  idempotency_key_hash TEXT,
  processing_status TEXT NOT NULL DEFAULT 'ready',
  processing_error TEXT NOT NULL DEFAULT '',
  processing_updated_at TEXT,
  consent_at TEXT,
  consent_version TEXT,
  deleted_at TEXT,
  deletion_status TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  kind TEXT,
  label TEXT,
  content_type TEXT,
  created_at TEXT NOT NULL,
  thumbnail_key TEXT,
  storage_status TEXT NOT NULL DEFAULT 'ready',
  storage_error TEXT NOT NULL DEFAULT '',
  operation_key_hash TEXT
);

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

CREATE TABLE IF NOT EXISTS funnel_daily (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'unselected',
  device_type TEXT NOT NULL DEFAULT 'unknown',
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_date, event_name, instrument_type, device_type)
);

CREATE TABLE IF NOT EXISTS funnel_breakdowns_daily (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'unselected',
  breakdown_name TEXT NOT NULL,
  breakdown_value TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    event_date,
    event_name,
    instrument_type,
    breakdown_name,
    breakdown_value
  )
);

CREATE TABLE IF NOT EXISTS funnel_event_uniques (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  claim_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_date, event_name, visitor_hash)
);

CREATE TABLE IF NOT EXISTS site_pageviews_daily (
  event_date TEXT NOT NULL,
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  page_path TEXT NOT NULL,
  page_group TEXT NOT NULL,
  source_group TEXT NOT NULL,
  device_type TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'XX',
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    event_date,
    hour_of_day,
    page_path,
    source_group,
    device_type,
    country_code
  )
);

CREATE TABLE IF NOT EXISTS site_visitors_daily (
  event_date TEXT NOT NULL,
  entry_path TEXT NOT NULL,
  entry_group TEXT NOT NULL,
  source_group TEXT NOT NULL,
  device_type TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'XX',
  visitor_count INTEGER NOT NULL DEFAULT 0 CHECK (visitor_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (
    event_date,
    entry_path,
    source_group,
    device_type,
    country_code
  )
);

CREATE TABLE IF NOT EXISTS site_visitor_uniques (
  event_date TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_date, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_class ON leads(lead_class, notable, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_idempotency
  ON leads(idempotency_key_hash)
  WHERE idempotency_key_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_deletion
  ON leads(deletion_status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_photos_lead_created ON photos(lead_id, created_at, id);
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
CREATE INDEX IF NOT EXISTS idx_funnel_daily_event
  ON funnel_daily(event_name, event_date);
CREATE INDEX IF NOT EXISTS idx_funnel_breakdowns_event
  ON funnel_breakdowns_daily(breakdown_name, event_name, event_date);
CREATE INDEX IF NOT EXISTS idx_funnel_event_uniques_created
  ON funnel_event_uniques(created_at);
CREATE INDEX IF NOT EXISTS idx_site_pageviews_date
  ON site_pageviews_daily(event_date, page_path);
CREATE INDEX IF NOT EXISTS idx_site_visitors_date
  ON site_visitors_daily(event_date, entry_path);
CREATE INDEX IF NOT EXISTS idx_site_visitor_uniques_created
  ON site_visitor_uniques(created_at);
