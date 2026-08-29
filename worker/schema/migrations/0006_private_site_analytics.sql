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

CREATE INDEX IF NOT EXISTS idx_site_pageviews_date
  ON site_pageviews_daily(event_date, page_path);
CREATE INDEX IF NOT EXISTS idx_site_visitors_date
  ON site_visitors_daily(event_date, entry_path);
CREATE INDEX IF NOT EXISTS idx_site_visitor_uniques_created
  ON site_visitor_uniques(created_at);

PRAGMA optimize;
