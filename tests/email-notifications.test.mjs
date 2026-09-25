import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/src/index.js";
import { createD1Mock, createR2Mock } from "./helpers/d1-mock.mjs";
import { emailEnqueueStatement, dispatchEmails, emailSettings, saveEmailSettings, claimEmail, completeEmail } from "../worker/src/email-notifications.js";
import { initEmailSettings } from "../public/js/email-settings.js";

const schema = await readFile(new URL("../worker/schema/schema.sql", import.meta.url), "utf8");
const origin = "https://musikinstrument-ankauf.de";
const now = Date.parse("2026-09-25T12:00:00Z");
const makeEnv = () => ({
  LEADS: createD1Mock(schema), PHOTOS: createR2Mock(), REVIEW_TOKEN: "test-review",
  ALLOWED_ORIGIN: origin, UPLOAD_TOKEN_SECRET: "test-upload-key-only-not-a-real-secret",
  EMAIL_WEBHOOK_URL: "https://make.example.invalid/mail", EMAIL_WEBHOOK_SECRET: "test-only-mail-secret-with-at-least-32-characters",
  EMAIL_NOTIFICATION_TO: "owner@example.invalid",
});
async function enqueue(env, id = "TEST-1", priority = "A") {
  env.LEADS.database.prepare(`INSERT INTO leads (id,created_at,type,lead_class,summary,city,name,email,phone,story)
    VALUES (?,?,'double_bass',?,'Ein alter Kontrabass','Berlin','PRIVATE NAME','PRIVATE EMAIL','PRIVATE PHONE','PRIVATE STORY')`)
    .run(id, new Date(now).toISOString(), priority);
  await emailEnqueueStatement(env, id, new Date(now).toISOString()).run();
  return `lead-email:${id}`;
}
const outbox = env => env.LEADS.database.prepare("SELECT * FROM email_notification_outbox ORDER BY id").all();
const request = (env, path, method = "GET", body, auth = `Bearer ${env.REVIEW_TOKEN}`, source = origin) => new Request(`https://api.test${path}`, {
  method, headers: { Authorization: auth, Origin: source, "Content-Type": "application/json" },
  ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
});

test("mail preferences default to all A/B/C, require admin auth and reject invalid/conflicting saves", async () => {
  const env = makeEnv();
  try {
    const path = "/api/review/email-settings";
    assert.equal((await worker.fetch(request(env, path, "GET", undefined, ""), env)).status, 401);
    const defaults = await (await worker.fetch(request(env, path), env)).json();
    assert.deepEqual(defaults.priorities, { A: true, B: true, C: true });
    assert.equal(defaults.recipient, "owner@example.invalid");
    assert.ok(defaults.configured);
    assert.doesNotMatch(JSON.stringify(defaults), /test-only-mail-secret|make\.example/);
    const body = { revision: 0, priorities: { A: true, B: false, C: true } };
    assert.equal((await worker.fetch(request(env, path, "PUT", body, "Bearer test-review", "https://evil.test"), env)).status, 403);
    assert.equal((await worker.fetch(request(env, path, "PUT", body), env)).status, 200);
    assert.equal((await worker.fetch(request(env, path, "PUT", body), env)).status, 409);
    for (const invalid of [{ revision: 1, priorities: { A: 1, B: true, C: true } }, { ...body, revision: 1, recipient: "other@example.invalid" }, { revision: 1, priorities: { A: true } }])
      assert.equal((await worker.fetch(request(env, path, "PUT", invalid), env)).status, 400);
    assert.equal((await worker.fetch(request(env, path, "PUT", " ".repeat(3000)), env)).status, 413);
  } finally { env.LEADS.close(); }
});

test("one durable event per lead, selected priorities only, no contact copies and no old-lead backfill", async () => {
  const env = makeEnv();
  try {
    await saveEmailSettings(env, { revision: 0, priorities: { A: true, B: false, C: true } });
    await enqueue(env, "A", "A"); await enqueue(env, "B", "B"); await enqueue(env, "C", "C");
    await emailEnqueueStatement(env, "A").run();
    assert.equal(outbox(env).length, 3);
    assert.equal(outbox(env).find(x => x.lead_id === "B").status, "skipped");
    assert.doesNotMatch(JSON.stringify(outbox(env)), /PRIVATE|owner@example|Kontrabass/);
    env.LEADS.database.prepare("INSERT INTO leads (id,created_at) VALUES ('OLD','2026-01-01')").run();
    assert.equal(outbox(env).length, 3);
  } finally { env.LEADS.close(); }
});

test("missing mail setup fails closed without network, redirects or arbitrary recipients", async () => {
  const env = makeEnv();
  try {
    await enqueue(env);
    for (const [key, value] of [["EMAIL_WEBHOOK_URL", ""], ["EMAIL_WEBHOOK_URL", "http://insecure.test"], ["EMAIL_WEBHOOK_SECRET", "short"], ["EMAIL_NOTIFICATION_TO", "a@example.invalid\r\nBcc: victim@example.invalid"]]) {
      const saved = env[key]; env[key] = value;
      assert.equal((await emailSettings(env)).configured, false);
      await dispatchEmails(env, { nowMs: now, fetcher: async () => assert.fail("not configured") });
      env[key] = saved;
    }
    assert.equal(outbox(env)[0].attempts, 0);
  } finally { env.LEADS.close(); }
});

test("webhook delivery is leased, bounded, retryable and 2xx is not an email-send receipt", async () => {
  const env = makeEnv(); let count = 0;
  try {
    await enqueue(env);
    const fetcher = async (url, options) => {
      count++; assert.equal(options.redirect, "error");
      assert.equal(JSON.parse(options.body).notification_id, "lead-email:TEST-1");
      assert.doesNotMatch(options.body, /PRIVATE|owner@example/);
      return new Response("accepted", { status: 200 });
    };
    await Promise.all([dispatchEmails(env, { nowMs: now, fetcher }), dispatchEmails(env, { nowMs: now, fetcher })]);
    assert.equal(count, 1); assert.equal(outbox(env)[0].status, "awaiting");
    for (let attempt = 1; attempt < 8; attempt++) {
      await dispatchEmails(env, { nowMs: Date.parse(outbox(env)[0].next_attempt_at), fetcher });
    }
    await dispatchEmails(env, { nowMs: Date.parse(outbox(env)[0].next_attempt_at), fetcher });
    assert.equal(count, 8); assert.equal(outbox(env)[0].status, "failed");
  } finally { env.LEADS.close(); }
});

test("lost webhook response safely retries stable event; claimed mail is sent only once", async () => {
  const env = makeEnv();
  try {
    const id = await enqueue(env);
    await dispatchEmails(env, { nowMs: now, fetcher: async () => { throw new Error("contains secret URL"); } });
    assert.equal(outbox(env)[0].status, "retry");
    assert.equal(outbox(env)[0].last_error, "handoff_network_error");
    const claims = await Promise.all([claimEmail(env, { notification_id: id }, now + 1000), claimEmail(env, { notification_id: id }, now + 1000)]);
    assert.equal(claims.filter(x => x.body.send).length, 1);
    const claim = claims.find(x => x.body.send).body;
    assert.equal(claim.message.to, "owner@example.invalid");
    assert.doesNotMatch(JSON.stringify(claim.message), /PRIVATE NAME|PRIVATE EMAIL|PRIVATE PHONE|test-review|token=/);
    assert.equal((await completeEmail(env, { notification_id: id, receipt_token: "wrong" }, now)).status, 409);
    const receipt = { notification_id: id, receipt_token: claim.receipt_token };
    assert.equal((await completeEmail(env, receipt, now)).status, 200);
    assert.equal((await completeEmail(env, receipt, now)).status, 200);
    assert.equal((await claimEmail(env, { notification_id: id }, now)).body.send, false);
    await dispatchEmails(env, { nowMs: now + 24 * 3600_000, fetcher: async () => assert.fail("already sent") });
  } finally { env.LEADS.close(); }
});

test("claim during webhook dispatch cannot be overwritten by late HTTP status", async () => {
  const env = makeEnv();
  try {
    const id = await enqueue(env);
    await dispatchEmails(env, { nowMs: now, fetcher: async () => {
      const claimed = await claimEmail(env, { notification_id: id }, now);
      await completeEmail(env, { notification_id: id, receipt_token: claimed.body.receipt_token }, now);
      return new Response("ok");
    } });
    assert.equal(outbox(env)[0].status, "sent");
  } finally { env.LEADS.close(); }
});

test("uncertain email delivery is visible and never blindly resent; late receipts are accepted", async () => {
  const env = makeEnv();
  try {
    const id = await enqueue(env);
    const claim = (await claimEmail(env, { notification_id: id }, now)).body;
    await dispatchEmails(env, { nowMs: now + 31 * 60_000, fetcher: async () => assert.fail("uncertain send") });
    assert.equal(outbox(env)[0].status, "uncertain");
    assert.equal((await claimEmail(env, { notification_id: id }, now)).body.send, false);
    await completeEmail(env, { notification_id: id, receipt_token: claim.receipt_token }, now + 32 * 60_000);
    assert.equal(outbox(env)[0].status, "sent");
  } finally { env.LEADS.close(); }
});

test("turning off a priority prevents queued claims; deleting a lead removes notification state", async () => {
  const env = makeEnv();
  try {
    const id = await enqueue(env);
    await saveEmailSettings(env, { revision: 0, priorities: { A: false, B: true, C: true } });
    assert.equal((await claimEmail(env, { notification_id: id }, now)).body.send, false);
    assert.equal(outbox(env)[0].status, "skipped");
    env.LEADS.database.prepare("DELETE FROM leads WHERE id='TEST-1'").run();
    assert.equal(outbox(env).length, 0);
    const deleted = await enqueue(env, "DELETED", "B");
    env.LEADS.database.prepare("UPDATE leads SET deleted_at=? WHERE id='DELETED'").run(new Date(now).toISOString());
    assert.equal((await claimEmail(env, { notification_id: deleted }, now)).body.send, false);
  } finally { env.LEADS.close(); }
});

test("Make callbacks use a separate secret, not the review token, and reject malformed bodies", async () => {
  const env = makeEnv();
  try {
    const id = await enqueue(env);
    const path = "/api/email-notifications/claim";
    assert.equal((await worker.fetch(request(env, path, "POST", { notification_id: id }), env)).status, 401);
    const secret = `Bearer ${env.EMAIL_WEBHOOK_SECRET}`;
    assert.equal((await worker.fetch(request(env, path, "POST", "x", secret), env)).status, 400);
    assert.equal((await worker.fetch(request(env, path, "POST", "x".repeat(3000), secret), env)).status, 413);
    const claim = await (await worker.fetch(request(env, path, "POST", { notification_id: id }, secret), env)).json();
    assert.equal(claim.send, true);
    const receipt = await worker.fetch(request(env, "/api/email-notifications/complete", "POST", { notification_id: id, receipt_token: claim.receipt_token }, secret), env);
    assert.equal(receipt.status, 200);
  } finally { env.LEADS.close(); }
});

test("initial quick inquiry creates its email event atomically, retry does not duplicate it", async () => {
  const env = makeEnv(); delete env.EMAIL_WEBHOOK_URL;
  const key = crypto.randomUUID();
  const submit = async () => {
    const form = new FormData(); form.set("meta", JSON.stringify({ entry_path: "/stuttgart/", data: { contact: "test@example.invalid", story: "Ein Kontrabass" } }));
    const tasks = [];
    const response = await worker.fetch(new Request("https://api.test/api/quick-inquiries", {
      method: "POST", headers: { Origin: origin, "Idempotency-Key": key }, body: form,
    }), env, { waitUntil(task) { tasks.push(task); } });
    await Promise.all(tasks); return response;
  };
  try {
    assert.equal((await submit()).status, 201);
    assert.equal((await submit()).status, 200);
    assert.equal(outbox(env).length, 1); assert.equal(outbox(env)[0].priority, "B");
  } finally { env.LEADS.close(); }
});

function ui() {
  const elements = new Map();
  const find = selector => {
    if (!elements.has(selector)) elements.set(selector, { hidden: true, textContent: "", value: "", dataset: {}, disabled: false });
    return elements.get(selector);
  };
  const fields = new Map(["A", "B", "C"].map(name => [name, { name, checked: true }]));
  find("[data-email-preferences]").elements = { namedItem: key => fields.get(key) };
  const saved = new Map([["review-token", "test-review"]]);
  return { root: { dataset: { apiBase: "https://api.test" }, querySelector: find }, find, fields, saved,
    storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) } };
}

test("settings UI is gated, saves all three booleans and honestly displays unconfigured transport", async () => {
  const state = ui(), calls = [];
  const payload = { priorities: { A: true, B: true, C: true }, revision: 0, recipient: "owner@example.invalid", configured: false, counts: { uncertain: 1 } };
  const controller = initEmailSettings(state.root, { storage: state.storage, fetch: async (url, options) => {
    calls.push({ url, options });
    return Response.json(options.method === "PUT" ? { ...payload, ...JSON.parse(options.body), revision: 1 } : payload);
  } });
  assert.equal(state.find("[data-email-dashboard]").hidden, true);
  await controller.ready;
  assert.equal(state.find("[data-email-dashboard]").hidden, false);
  assert.match(state.find("[data-email-connection]").textContent, /Noch kein E-Mail-Versand/);
  state.fields.get("C").checked = false;
  await state.find("[data-email-preferences]").onsubmit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(calls[1].options.body), { revision: 0, priorities: { A: true, B: true, C: false } });
  assert.match(state.find("[data-email-save-status]").textContent, /Gespeichert/);
});

test("settings UI clears privileged display on expired login and never fakes missing API success", async () => {
  for (const api of ["https://api.test", ""]) {
    const state = ui(); state.root.dataset.apiBase = api;
    await initEmailSettings(state.root, { storage: state.storage, fetch: async () => {
      assert.ok(api); return new Response("", { status: 401 });
    } }).ready;
    assert.equal(state.find("[data-email-dashboard]").hidden, true);
    assert.equal(state.find("[data-email-recipient]").textContent, "");
    assert.equal(state.saved.has("review-token"), false);
  }
});
