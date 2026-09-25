CREATE TABLE email_notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  notify_a INTEGER NOT NULL DEFAULT 1 CHECK (notify_a IN (0,1)),
  notify_b INTEGER NOT NULL DEFAULT 1 CHECK (notify_b IN (0,1)),
  notify_c INTEGER NOT NULL DEFAULT 1 CHECK (notify_c IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
INSERT INTO email_notification_settings (id,updated_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- No historical backfill: only newly completed initial submissions enqueue mail.
-- No copied contact data; deletion of a lead also removes its notification.
CREATE TABLE email_notification_outbox (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('A','B','C')),
  status TEXT NOT NULL CHECK (status IN ('pending','dispatching','awaiting','retry','sending','sent','uncertain','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  dispatch_token TEXT,
  claim_token TEXT,
  claimed_at TEXT,
  sent_at TEXT,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_email_outbox_due ON email_notification_outbox(status,next_attempt_at);
