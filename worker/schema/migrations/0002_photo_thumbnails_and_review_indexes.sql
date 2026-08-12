ALTER TABLE photos ADD COLUMN thumbnail_key TEXT;

CREATE INDEX IF NOT EXISTS idx_photos_lead_created
  ON photos(lead_id, created_at, id);

PRAGMA optimize;
