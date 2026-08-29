CREATE TABLE IF NOT EXISTS funnel_event_uniques (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  claim_token TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_date, event_name, visitor_hash)
);

CREATE INDEX IF NOT EXISTS idx_funnel_event_uniques_created
  ON funnel_event_uniques(created_at);

PRAGMA optimize;
