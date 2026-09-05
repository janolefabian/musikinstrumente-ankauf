import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/src/index.js";
import { createD1Mock, createR2Mock } from "./helpers/d1-mock.mjs";
import { initQuickInquiry, parseQuickContact } from "../public/js/quick-inquiry.js";

const schema = await readFile(new URL("../worker/schema/schema.sql", import.meta.url), "utf8");
const origin = "https://musikinstrument-ankauf.de";
function env() { return {
  LEADS: createD1Mock(schema), PHOTOS: createR2Mock(),
  ALLOWED_ORIGIN: origin, REVIEW_TOKEN: "test-review",
  UPLOAD_TOKEN_SECRET: "test-upload-secret-long-enough-for-tests",
}; }
function quickRequest({ entry = "/stuttgart/", contact = "test@example.invalid", story = "Ein Kontrabass aus einem Nachlass", key = crypto.randomUUID(), website = "", source = origin, photos = false } = {}) {
  const form = new FormData();
  form.set("meta", JSON.stringify({ entry_path: entry, type: "guitar", data: { contact, story, name: "", website } }));
  if (photos) form.set("photo_0", jpeg());
  return new Request("https://api.test/api/quick-inquiries", { method: "POST", headers: { Origin: source, "Idempotency-Key": key }, body: form });
}
function openRequest(entry = "/stuttgart/", headers = {}) {
  return new Request("https://api.test/api/analytics/quick-inquiry", { method: "POST", headers: {
    Origin: origin, "Content-Type": "application/json", "User-Agent": "Test browser", "CF-Connecting-IP": "203.0.113.10", ...headers,
  }, body: JSON.stringify({ entry_path: entry, event_name: "sent", email: "must-not-be-stored@example.invalid" }) });
}
function jpeg() { return new File([new Uint8Array([255, 216, 255, 224, 0, 1, 2, 3, 255, 217])], "test.jpg", { type: "image/jpeg" }); }
async function invoke(request, e) {
  const tasks = [];
  const response = await worker.fetch(request, e, { waitUntil(promise) { tasks.push(promise); } });
  await Promise.all(tasks);
  return response;
}

test("quick inquiry accepts email OR phone, persists no-photo lead and never calls AI initially", async () => {
  for (const contact of ["test@example.invalid", "+49 (0) 30 12345678"]) {
    const e = env();
    e.OPENAI_API_KEY = "must-not-be-used";
    const original = globalThis.fetch;
    globalThis.fetch = async () => { assert.fail("Initial quick inquiry must not invoke an external service"); };
    try {
      const r = await invoke(quickRequest({ contact }), e);
      assert.equal(r.status, 201, await r.clone().text());
      const result = await r.json();
      assert.ok(result.continuation_token);
      const lead = e.LEADS.database.prepare("SELECT * FROM leads").get();
      assert.equal(lead.inquiry_kind, "quick");
      assert.equal(lead.entry_path, "/stuttgart/");
      assert.equal(lead.city, "Stuttgart");
      assert.equal(lead.type, "unknown");
      assert.equal(lead.name, "");
      assert.equal(lead.photo_count, 0);
      assert.equal(lead.processing_status, "ready");
      assert.equal(lead.lead_class, "B");
      assert.equal(lead.consent_version, "contact-request-2026-09-05");
      assert.equal(lead.email, contact.includes("@") ? contact : "");
      assert.equal(lead.phone, contact.includes("@") ? "" : contact);
      assert.equal(e.PHOTOS.objects.size, 0);
    } finally { globalThis.fetch = original; e.LEADS.close(); }
  }
});

test("quick validation, spam trap and origin checks reject before saving", async () => {
  for (const [options, expected] of [
    [{ contact: "" }, 400], [{ contact: "abc" }, 400], [{ contact: "test@invalid" }, 400],
    [{ contact: "12345" }, 400], [{ story: " " }, 400], [{ story: "a".repeat(1501) }, 413],
    [{ website: "spam" }, 400], [{ entry: "/unapproved/" }, 400],
    [{ entry: "/stuttgart/?email=private" }, 400], [{ source: "https://evil.test" }, 403],
    [{ photos: true }, 400],
  ]) {
    const e = env();
    try {
      const r = await invoke(quickRequest(options), e);
      assert.equal(r.status, expected, `${JSON.stringify(options)} ${await r.text()}`);
      assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM leads").get().n, 0);
      assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM quick_inquiry_daily").get().n, 0);
    } finally { e.LEADS.close(); }
  }
});

test("quick submission retry creates one lead and one server-side sent counter", async () => {
  const e = env(); const key = crypto.randomUUID();
  try {
    const a = await (await invoke(quickRequest({ key }), e)).json();
    const r = await invoke(quickRequest({ key }), e); const b = await r.json();
    assert.equal(r.status, 200); assert.equal(a.id, b.id); assert.equal(b.idempotent, true);
    assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM leads").get().n, 1);
    assert.equal(e.LEADS.database.prepare("SELECT SUM(event_count) n FROM quick_inquiry_daily WHERE event_name='sent'").get().n, 1);
    assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM funnel_daily").get().n, 0);
  } finally { e.LEADS.close(); }
});

test("quick counters roll back atomically if lead insertion fails", async () => {
  const e = env();
  try {
    e.LEADS.database.exec("CREATE TRIGGER reject_quick BEFORE INSERT ON quick_inquiry_daily BEGIN SELECT RAISE(ABORT, 'test_rollback'); END;");
    assert.equal((await invoke(quickRequest(), e)).status, 500);
    assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM leads").get().n, 0);
  } finally { e.LEADS.close(); }
});

test("quick openings deduplicate across reloads per page and honor privacy/bot signals", async () => {
  const e = env();
  try {
    for (let i = 0; i < 3; i++) assert.equal((await invoke(openRequest(), e)).status, 202);
    await invoke(openRequest("/kontrabass-verkaufen/"), e);
    for (const headers of [{ DNT: "1" }, { "Sec-GPC": "1" }, { "User-Agent": "Googlebot" }])
      await invoke(openRequest("/instrumentengeschichten/albert-volkmann-1908/", headers), e);
    const rows = e.LEADS.database.prepare("SELECT * FROM quick_inquiry_daily").all();
    assert.equal(rows.length, 2); assert.ok(rows.every(r => r.event_count === 1 && r.event_name === "opened"));
    assert.doesNotMatch(JSON.stringify(rows), /must-not-be-stored|203\.0\.113|Test browser/);
    assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM funnel_daily").get().n, 0);
  } finally { e.LEADS.close(); }
});

test("optional photos are authenticated, retry-safe, preserve original message and stay on the same lead", async () => {
  const e = env();
  try {
    const lead = await (await invoke(quickRequest({ entry: "/kontrabass-verkaufen/" }), e)).json();
    const key = crypto.randomUUID();
    const makeRequest = (token = lead.continuation_token) => {
      const body = new FormData(); body.set("meta", JSON.stringify({ photoMeta: [{ kind: "overview", label: "Foto" }] }));
      body.set("photo_0", jpeg()); body.set("thumb_0", jpeg()); body.set("ai_0", jpeg());
      return new Request(`https://api.test/api/leads/${lead.id}/continue`, {
        method: "POST", headers: { Origin: origin, Authorization: `Bearer ${token}`, "Idempotency-Key": key }, body,
      });
    };
    assert.equal((await invoke(makeRequest("wrong"), e)).status, 401);
    assert.equal((await invoke(makeRequest(), e)).status, 200);
    assert.equal((await invoke(makeRequest(), e)).status, 200);
    const saved = e.LEADS.database.prepare("SELECT * FROM leads").get();
    assert.equal(saved.story, "Ein Kontrabass aus einem Nachlass");
    assert.equal(saved.id, lead.id); assert.equal(saved.inquiry_kind, "quick"); assert.equal(saved.photo_count, 1);
    assert.equal(e.LEADS.database.prepare("SELECT COUNT(*) n FROM photos").get().n, 1);
    assert.equal(e.LEADS.database.prepare("SELECT SUM(event_count) n FROM quick_inquiry_daily WHERE event_name='sent'").get().n, 1);
    const review = await (await invoke(new Request("https://api.test/api/review", { headers: { Authorization: "Bearer test-review" } }), e)).json();
    assert.equal(review.items[0].inquiry_kind, "quick"); assert.equal(review.items[0].photo_count, 1);
  } finally { e.LEADS.close(); }
});

test("quick analysis is protected, separate from photo funnel and included in total enquiries", async () => {
  const e = env();
  try {
    await invoke(openRequest(), e); await invoke(quickRequest(), e);
    const path = "https://api.test/api/review/analytics?days=7";
    assert.equal((await invoke(new Request(path), e)).status, 401);
    const report = await (await invoke(new Request(path, { headers: { Authorization: "Bearer test-review" } }), e)).json();
    assert.deepEqual(report.quick_inquiries.find(x => x.path === "/stuttgart/"), { path: "/stuttgart/", opened: 1, sent: 1 });
    assert.equal(report.totals.leads, 1);
  } finally { e.LEADS.close(); }
});

function element() { return { hidden: true, disabled: false, value: "", dataset: {}, textContent: "", files: [], focus() { this.focused = true; }, setAttribute(name, value) { this[name] = value; }, setCustomValidity(value) { this.validity = value; } }; }
function ui() {
  const elements = new Map(); const find = selector => { if (!elements.has(selector)) elements.set(selector, element()); return elements.get(selector); };
  const fields = new Map(["story", "contact", "name", "website"].map(name => [name, element()]));
  fields.get("story").value = "Kontrabass"; fields.get("contact").value = "test@example.invalid";
  const form = find("[data-quick-form]");
  form.elements = { namedItem(name) { return fields.get(name); } };
  form.reportValidity = () => !fields.get("contact").validity && Boolean(fields.get("story").value);
  form.reset = () => fields.forEach(field => { field.value = ""; });
  const saved = new Map();
  return { find, fields, root: { dataset: { apiBase: "https://api.test", entryPath: "/stuttgart/" }, querySelector: find }, storage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }, saved };
}

test("frontend validates either contact method and does not simulate missing API success", () => {
  assert.equal(parseQuickContact("+49 30 12345678"), "+49 30 12345678");
  assert.equal(parseQuickContact(" test@example.invalid "), "test@example.invalid");
  for (const value of ["", "hello", "123", "abc@localhost", "javascript:alert(1)"]) assert.equal(parseQuickContact(value), null);
  const state = ui(); state.root.dataset.apiBase = "";
  initQuickInquiry(state.root);
  assert.equal(state.find("[data-quick-open]").hidden, true);
});

test("frontend contact retries reuse the original body/key and store only scoped photo-resume state", async () => {
  const state = ui(); const requests = []; let attempt = 0;
  initQuickInquiry(state.root, { storage: state.storage, fetch: async (url, options) => {
    requests.push({ url, options, meta: options.body.get("meta") });
    if (++attempt === 1) throw new TypeError("network");
    return Response.json({ id: "saved-lead", continuation_token: "scoped-token", processing_status: "ready" });
  } });
  const submit = () => state.find("[data-quick-form]").onsubmit({ preventDefault() {} });
  await submit(); assert.equal(state.find("[data-quick-success]").hidden, true);
  await submit(); assert.equal(state.find("[data-quick-success]").hidden, false);
  assert.equal(requests[0].options.headers["Idempotency-Key"], requests[1].options.headers["Idempotency-Key"]);
  assert.equal(requests[0].meta, requests[1].meta);
  assert.doesNotMatch([...state.saved.values()].join(""), /test@example|Kontrabass/);
  const restored = ui(); initQuickInquiry(restored.root, { storage: state.storage, fetch: async () => assert.fail("Restoring must not resubmit") });
  assert.equal(restored.find("[data-quick-success]").hidden, false);
});

test("frontend optional upload retries reuse their batch and stay out of photo funnel", async () => {
  const state = ui(); const calls = []; let uploads = 0;
  initQuickInquiry(state.root, { storage: state.storage, photoBundle: async () => new FormData(), fetch: async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/api/quick-inquiries")) return Response.json({ id: "same-lead", continuation_token: "same-token", processing_status: "ready" });
    if (++uploads === 1) throw new TypeError("network");
    return Response.json({ id: "same-lead", photo_count: 1, processing_status: "ready" });
  } });
  await state.find("[data-quick-form]").onsubmit({ preventDefault() {} });
  state.find("[data-quick-photos]").files = [jpeg()]; state.find("[data-quick-photos]").onchange();
  await state.find("[data-quick-upload]").onclick(); await state.find("[data-quick-upload]").onclick();
  assert.equal(calls[1].url, "https://api.test/api/leads/same-lead/continue");
  assert.equal(calls[1].options.headers.Authorization, "Bearer same-token");
  assert.equal(calls[1].options.headers["Idempotency-Key"], calls[2].options.headers["Idempotency-Key"]);
  assert.equal(calls[1].options.body, calls[2].options.body);
  assert.ok(calls.every(call => !call.url.endsWith("/api/funnel")));
  assert.equal(state.find("[data-quick-upload]").hidden, true);
});
