import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Miniflare } from 'miniflare';

test('real workerd dispatch reaches webhook, rejects redirects and retains failure cause', async () => {
  const source = await readFile(new URL('../worker/src/email-notifications.js', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../worker/schema/schema.sql', import.meta.url), 'utf8');
  let status = 302;
  let requests = 0;
  const mf = new Miniflare({
    modules: true, compatibilityDate: '2026-08-01',
    script: source + `\nexport default {async fetch(request, env) {
      await dispatchEmails(env); return Response.json(await emailSettings(env));
    }};`,
    d1Databases: { LEADS: 'mail-runtime-test' },
    outboundService: async request => {
      requests++;
      assert.equal(request.url, 'https://mail.example.invalid/hook');
      assert.equal(request.method, 'POST');
      assert.equal(request.headers.get('X-Webhook-Secret'), 'test-only-secret-at-least-32-characters');
      assert.deepEqual(await request.json(), { event: 'lead.email.requested', notification_id: 'lead-email:TEST' });
      return new Response('', { status, headers: status === 302 ? { location: 'https://never-follow.example.invalid/' } : {} });
    },
    bindings: { EMAIL_WEBHOOK_URL: 'https://mail.example.invalid/hook',
      EMAIL_WEBHOOK_SECRET: 'test-only-secret-at-least-32-characters',
      EMAIL_NOTIFICATION_TO: 'test@example.invalid' },
  });
  try {
    const db = await mf.getD1Database('LEADS');
    for (const sql of schema.replace(/--[^\n]*/g, '').split(';').filter(s => s.trim()))
      await db.prepare(sql).run();
    await db.prepare("INSERT INTO leads (id,created_at) VALUES ('TEST','2026-01-01')").run();
    await db.prepare(`INSERT INTO email_notification_outbox
      (id,lead_id,priority,status,next_attempt_at,created_at,updated_at)
      VALUES ('lead-email:TEST','TEST','A','pending','2026-01-01','2026-01-01','2026-01-01')`).run();
    await mf.dispatchFetch('http://localhost');
    assert.equal(requests, 1);
    let row = await db.prepare('SELECT status,last_error FROM email_notification_outbox').first();
    assert.equal(row.status, 'retry');
    assert.equal(row.last_error, 'handoff_http_302');
    await db.prepare("UPDATE email_notification_outbox SET attempts=8,next_attempt_at='2026-01-01'").run();
    await mf.dispatchFetch('http://localhost');
    row = await db.prepare('SELECT status,last_error FROM email_notification_outbox').first();
    assert.equal(row.status, 'failed');
    assert.equal(row.last_error, 'handoff_http_302');
    await db.prepare("UPDATE email_notification_outbox SET status='pending',attempts=0,next_attempt_at='2026-01-01'").run();
    status = 200;
    await mf.dispatchFetch('http://localhost');
    row = await db.prepare('SELECT status,last_error FROM email_notification_outbox').first();
    assert.equal(row.status, 'awaiting');
    assert.equal(row.last_error, '');
    assert.equal(requests, 2);
  } finally { await mf.dispose(); }
});
