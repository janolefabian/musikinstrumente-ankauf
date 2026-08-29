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

CREATE INDEX IF NOT EXISTS idx_funnel_breakdowns_event
  ON funnel_breakdowns_daily(breakdown_name, event_name, event_date);

PRAGMA optimize;
