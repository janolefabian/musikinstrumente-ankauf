ALTER TABLE leads ADD COLUMN inquiry_kind TEXT NOT NULL DEFAULT 'photo';
ALTER TABLE leads ADD COLUMN entry_path TEXT NOT NULL DEFAULT '';

CREATE TABLE quick_inquiry_daily (
  event_date TEXT NOT NULL,
  entry_path TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name IN ('opened', 'sent')),
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  PRIMARY KEY (event_date, entry_path, event_name)
);
