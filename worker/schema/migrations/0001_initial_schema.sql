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
  make_error TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  kind TEXT,
  label TEXT,
  content_type TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_class ON leads(lead_class, notable, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_lead ON photos(lead_id);

PRAGMA optimize;
