CREATE TABLE IF NOT EXISTS funnel_daily (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'unselected',
  device_type TEXT NOT NULL DEFAULT 'unknown',
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (event_date, event_name, instrument_type, device_type)
);

CREATE INDEX IF NOT EXISTS idx_funnel_daily_event
  ON funnel_daily(event_name, event_date);

PRAGMA optimize;
