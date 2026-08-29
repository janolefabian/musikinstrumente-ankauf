import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import worker from "../worker/src/index.js";
import { createD1Mock, createR2Mock } from "./helpers/d1-mock.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaSql = await readFile(path.join(root, "worker/schema/schema.sql"), "utf8");
const allowedOrigin = "https://musikinstrument-ankauf.de";

function environment(overrides = {}) {
  return {
    LEADS: createD1Mock(schemaSql),
    PHOTOS: createR2Mock(),
    UPLOAD_TOKEN_SECRET: "test-upload-token-secret-with-sufficient-length",
    REVIEW_TOKEN: "test-review-token",
    ALLOWED_ORIGIN: allowedOrigin,
    ...overrides,
  };
}

function context() {
  return { waitUntil() {} };
}

function leadRequest({
  key = `test-${crypto.randomUUID()}`,
  origin = allowedOrigin,
  type = "guitar",
  data = {},
  files = [],
  consent = {
    accepted: true,
    version: "2026-08-24",
    at: new Date().toISOString(),
  },
} = {}) {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      type,
      idempotencyKey: key,
      data: {
        name: "Testperson",
        email: "test@example.invalid",
        phone: "",
        city: "Teststadt",
        story: "",
        maker: "",
        ...data,
      },
      photoMeta: files.map((_, index) => ({
        kind: `photo_${index + 1}`,
        label: `Foto ${index + 1}`,
      })),
      consent,
    }),
  );
  files.forEach((file, index) => form.set(`photo_${index}`, file));
  return new Request("https://api.example.test/api/leads", {
    method: "POST",
    headers: {
      Origin: origin,
      "Idempotency-Key": key,
      "X-Idempotency-Key": key,
    },
    body: form,
  });
}

function continuationRequest({ leadId, token, key, files = [], data = {} }) {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      classifiedType: "guitar",
      data: { story: "Ergänzung", maker: "", ...data },
      photoMeta: files.map((_, index) => ({
        kind: `extra_${index + 1}`,
        label: `Ergänzung ${index + 1}`,
      })),
    }),
  );
  files.forEach((file, index) => form.set(`photo_${index}`, file));
  return new Request(
    `https://api.example.test/api/leads/${encodeURIComponent(leadId)}/continue`,
    {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        Authorization: `Bearer ${token}`,
        "Idempotency-Key": key,
      },
      body: form,
    },
  );
}

function funnelRequest({
  event = "wizard_opened",
  instrumentType = "double_bass",
  deviceType = "mobile",
  entryPage = "instrument",
  sourceGroup = "google",
  origin = allowedOrigin,
} = {}) {
  return new Request("https://api.example.test/api/funnel", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event,
      instrument_type: instrumentType,
      device_type: deviceType,
      entry_page: entryPage,
      source_group: sourceGroup,
      email: "must-not-be-stored@example.invalid",
    }),
  });
}

function analyticsRequest({
  path = "/",
  sourceGroup = "google",
  deviceType = "mobile",
  origin = allowedOrigin,
  ip = "203.0.113.10",
  userAgent = "Analytics Test Browser/1.0",
} = {}) {
  return new Request("https://api.example.test/api/analytics/pageview", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Forwarded-For": ip,
      "User-Agent": userAgent,
    },
    body: JSON.stringify({
      page_path: path,
      source_group: sourceGroup,
      device_type: deviceType,
    }),
  });
}

test("review and photo endpoints fail closed without the exact token", async () => {
  const env = environment();
  const cases = [
    ["GET", "/api/review"],
    ["GET", "/api/review/funnel"],
    ["GET", "/api/review/analytics"],
    ["POST", "/api/review/bulk"],
    ["GET", "/api/review/lead-1"],
    ["PATCH", "/api/review/lead-1"],
    ["DELETE", "/api/review/lead-1"],
    ["GET", "/api/photo/photo-1"],
    ["PUT", "/api/review/photo/photo-1/thumbnail"],
  ];

  try {
    for (const [method, pathname] of cases) {
      for (const authorization of [null, "Bearer wrong-token"]) {
        const headers = authorization ? { Authorization: authorization } : {};
        const response = await worker.fetch(
          new Request(`https://api.example.test${pathname}`, { method, headers }),
          env,
          context(),
        );
        assert.equal(response.status, 401, `${method} ${pathname} must be denied`);
      }
    }
  } finally {
    env.LEADS.close();
  }
});

test("site analytics counts pageviews and daily visitors without raw identifiers", async () => {
  const env = environment();
  const rawIp = "203.0.113.77";
  const rawAgent = "PRIVATE-ANALYTICS-UA-77";
  try {
    const requests = [
      analyticsRequest({ ip: rawIp, userAgent: rawAgent }),
      analyticsRequest({
        path: "/instrument-verkaufen/",
        sourceGroup: "internal",
        ip: rawIp,
        userAgent: rawAgent,
      }),
      analyticsRequest({ ip: "203.0.113.88", userAgent: rawAgent }),
    ];
    for (const request of requests) {
      const response = await worker.fetch(request, env, context());
      assert.equal(response.status, 202);
    }

    const views = env.LEADS.database
      .prepare("SELECT SUM(view_count) AS count FROM site_pageviews_daily")
      .get().count;
    const visitors = env.LEADS.database
      .prepare("SELECT SUM(visitor_count) AS count FROM site_visitors_daily")
      .get().count;
    assert.equal(views, 3);
    assert.equal(visitors, 2, "the same browser must count once per calendar day");

    const report = await worker.fetch(
      new Request("https://api.example.test/api/review/analytics?days=30", {
        headers: { Authorization: `Bearer ${env.REVIEW_TOKEN}` },
      }),
      env,
      context(),
    );
    assert.equal(report.status, 200);
    const payload = await report.json();
    assert.equal(payload.totals.views, 3);
    assert.equal(payload.totals.visitors, 2);
    assert.equal(payload.pages[0].views >= 1, true);
    assert.equal(payload.sources.some((row) => row.key === "google"), true);

    const stored = JSON.stringify({
      views: env.LEADS.database.prepare("SELECT * FROM site_pageviews_daily").all(),
      visitors: env.LEADS.database.prepare("SELECT * FROM site_visitors_daily").all(),
      uniques: env.LEADS.database.prepare("SELECT * FROM site_visitor_uniques").all(),
      rates: env.LEADS.database.prepare("SELECT * FROM api_rate_limits").all(),
    });
    assert.equal(stored.includes(rawIp), false);
    assert.equal(stored.includes(rawAgent), false);

    for (const request of [
      analyticsRequest({ path: "/review/" }),
      analyticsRequest({ path: "/arbitrary-private-path/" }),
      analyticsRequest({ sourceGroup: "google?q=private" }),
    ]) {
      const response = await worker.fetch(request, env, context());
      assert.equal(response.status, 400);
    }

    const beforeBot = env.LEADS.database
      .prepare("SELECT SUM(view_count) AS count FROM site_pageviews_daily")
      .get().count;
    const bot = await worker.fetch(
      analyticsRequest({ userAgent: "Googlebot/2.1" }),
      env,
      context(),
    );
    assert.equal(bot.status, 202);
    const afterBot = env.LEADS.database
      .prepare("SELECT SUM(view_count) AS count FROM site_pageviews_daily")
      .get().count;
    assert.equal(afterBot, beforeBot);
  } finally {
    env.LEADS.close();
  }
});

test("funnel tracking stores only validated aggregate counters", async () => {
  const env = environment();
  try {
    for (const request of [
      funnelRequest(),
      funnelRequest(),
      funnelRequest({ event: "contact_reached" }),
    ]) {
      const response = await worker.fetch(request, env, context());
      assert.equal(response.status, 202);
    }

    const invalid = await worker.fetch(
      funnelRequest({ event: "arbitrary_event" }),
      env,
      context(),
    );
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error, "funnel_event_invalid");

    const invalidEntry = await worker.fetch(
      funnelRequest({ entryPage: "/private/full-url" }),
      env,
      context(),
    );
    assert.equal(invalidEntry.status, 400);
    assert.equal((await invalidEntry.json()).error, "funnel_entry_page_invalid");

    const invalidSource = await worker.fetch(
      funnelRequest({ sourceGroup: "google?q=private-search" }),
      env,
      context(),
    );
    assert.equal(invalidSource.status, 400);
    assert.equal((await invalidSource.json()).error, "funnel_source_group_invalid");

    const foreignOrigin = await worker.fetch(
      funnelRequest({ origin: "https://attacker.invalid" }),
      env,
      context(),
    );
    assert.equal(foreignOrigin.status, 403);

    const rows = env.LEADS.database
      .prepare(
        `SELECT event_name,instrument_type,device_type,event_count
         FROM funnel_daily ORDER BY event_name`,
      )
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(rows, [
      {
        event_name: "contact_reached",
        instrument_type: "double_bass",
        device_type: "mobile",
        event_count: 1,
      },
      {
        event_name: "wizard_opened",
        instrument_type: "double_bass",
        device_type: "mobile",
        event_count: 2,
      },
    ]);

    const breakdownRows = env.LEADS.database
      .prepare(
        `SELECT breakdown_name,breakdown_value,event_name,event_count
         FROM funnel_breakdowns_daily
         ORDER BY breakdown_name,event_name`,
      )
      .all()
      .map((row) => ({ ...row }));
    assert.deepEqual(breakdownRows, [
      {
        breakdown_name: "entry_page",
        breakdown_value: "instrument",
        event_name: "contact_reached",
        event_count: 1,
      },
      {
        breakdown_name: "entry_page",
        breakdown_value: "instrument",
        event_name: "wizard_opened",
        event_count: 2,
      },
      {
        breakdown_name: "source_group",
        breakdown_value: "google",
        event_name: "contact_reached",
        event_count: 1,
      },
      {
        breakdown_name: "source_group",
        breakdown_value: "google",
        event_name: "wizard_opened",
        event_count: 2,
      },
    ]);

    const report = await worker.fetch(
      new Request("https://api.example.test/api/review/funnel?days=7", {
        headers: { Authorization: `Bearer ${env.REVIEW_TOKEN}` },
      }),
      env,
      context(),
    );
    assert.equal(report.status, 200);
    const payload = await report.json();
    assert.equal(payload.range.days, 7);
    assert.equal(payload.totals.wizard_opened, 2);
    assert.equal(payload.totals.contact_reached, 1);
    assert.equal(payload.by_type.double_bass.wizard_opened, 2);
    assert.equal(payload.by_device.mobile.wizard_opened, 2);
    assert.equal(payload.by_device_type.double_bass.mobile.wizard_opened, 2);
    assert.equal(payload.breakdowns.entry_page.instrument.wizard_opened, 2);
    assert.equal(payload.breakdowns.source_group.google.contact_reached, 1);
    assert.equal(JSON.stringify(payload).includes("must-not-be-stored"), false);
  } finally {
    env.LEADS.close();
  }
});

test("lead creation rejects a disallowed Origin before processing", async () => {
  const env = environment();
  try {
    const response = await worker.fetch(
      leadRequest({ origin: "https://attacker.invalid" }),
      env,
      context(),
    );
    assert.equal(response.status, 403);
    assert.equal(
      env.LEADS.database.prepare("SELECT COUNT(*) AS count FROM leads").get().count,
      0,
    );
  } finally {
    env.LEADS.close();
  }
});

test("the same initial idempotency key creates exactly one lead", async () => {
  const env = environment();
  const key = "test-idempotency-key-00000001";
  try {
    const first = await worker.fetch(
      leadRequest({ key }),
      env,
      context(),
    );
    const second = await worker.fetch(
      leadRequest({ key }),
      env,
      context(),
    );
    assert.ok([200, 201].includes(first.status));
    assert.ok([200, 201].includes(second.status));
    assert.equal((await first.json()).id, (await second.json()).id);
    assert.equal(
      env.LEADS.database.prepare("SELECT COUNT(*) AS count FROM leads").get().count,
      1,
    );
  } finally {
    env.LEADS.close();
  }
});

test("current explicit consent is validated and stored", async () => {
  const env = environment();
  try {
    const accepted = await worker.fetch(leadRequest(), env, context());
    assert.equal(accepted.status, 201);
    const row = env.LEADS.database
      .prepare("SELECT consent_at, consent_version FROM leads")
      .get();
    assert.equal(row.consent_version, "2026-08-24");
    assert.ok(Number.isFinite(Date.parse(row.consent_at)));

    const rejected = await worker.fetch(
      leadRequest({
        consent: { accepted: false, version: "2026-08-24" },
      }),
      env,
      context(),
    );
    assert.equal(rejected.status, 400);
    assert.equal((await rejected.json()).error, "consent_invalid");
  } finally {
    env.LEADS.close();
  }
});

test("the same continuation idempotency key stores an upload exactly once", async () => {
  const env = environment();
  const continuationKey = "test-continuation-key-00000001";
  const image = new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3])],
    "continuation.jpg",
    { type: "image/jpeg" },
  );

  try {
    const initial = await worker.fetch(
      leadRequest({ key: "test-initial-for-continuation-01" }),
      env,
      context(),
    );
    assert.equal(initial.status, 201);
    const { id: leadId, continuation_token: token } = await initial.json();
    assert.ok(leadId);
    assert.ok(token);

    const first = await worker.fetch(
      continuationRequest({
        leadId,
        token,
        key: continuationKey,
        files: [image],
      }),
      env,
      context(),
    );
    const repeated = await worker.fetch(
      continuationRequest({
        leadId,
        token,
        key: continuationKey,
        files: [image],
      }),
      env,
      context(),
    );
    assert.equal(first.status, 200);
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).idempotent, true);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE lead_id=?")
        .get(leadId).count,
      1,
    );
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM lead_continuations WHERE lead_id=?")
        .get(leadId).count,
      1,
    );
    assert.equal(env.PHOTOS.objects.size, 1);
  } finally {
    env.LEADS.close();
  }
});

test("initial upload count and file-size limits reject before storage", async () => {
  const env = environment();
  const tooMany = Array.from(
    { length: 13 },
    (_, index) => new File([`image-${index}`], `photo-${index}.jpg`, { type: "image/jpeg" }),
  );
  const tooLarge = new File(
    [new Uint8Array(20 * 1024 * 1024 + 1)],
    "too-large.jpg",
    { type: "image/jpeg" },
  );

  try {
    for (const files of [tooMany, [tooLarge]]) {
      const response = await worker.fetch(
        leadRequest({ files }),
        env,
        context(),
      );
      assert.ok([400, 413].includes(response.status));
    }
    assert.equal(env.PHOTOS.objects.size, 0);
    assert.equal(
      env.LEADS.database.prepare("SELECT COUNT(*) AS count FROM leads").get().count,
      0,
    );
  } finally {
    env.LEADS.close();
  }
});

test("lead is pending before AI and PII is excluded from the AI prompt", async () => {
  const env = environment({ OPENAI_API_KEY: "test-openai-key" });
  const originalFetch = globalThis.fetch;
  const markers = {
    name: "PRIVATE-NAME-7eea",
    email: "private-7eea@example.invalid",
    phone: "+49-PRIVATE-7EEA",
    city: "PRIVATE-CITY-7EEA",
  };
  let countAtAiCall = -1;
  let openAiBody = "";

  globalThis.fetch = async (_url, options) => {
    countAtAiCall = env.LEADS.database
      .prepare("SELECT COUNT(*) AS count FROM leads")
      .get().count;
    openAiBody = String(options?.body || "");
    return new Response(
      JSON.stringify({
        output_text: JSON.stringify({
          lead_class: "B",
          interest_score: 50,
          confidence: 70,
          notable: false,
          title: "Testinstrument",
          summary: "Konservative Testeinordnung",
          signals: [],
        }),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const response = await worker.fetch(
      leadRequest({ type: "strings", data: markers }),
      env,
      context(),
    );
    assert.equal(response.status, 201);
    assert.equal(countAtAiCall, 1, "lead must exist before the external AI call");
    for (const marker of Object.values(markers))
      assert.equal(openAiBody.includes(marker), false, `${marker} leaked to AI`);
  } finally {
    globalThis.fetch = originalFetch;
    env.LEADS.close();
  }
});

test("an AI outage still accepts the request with a conservative result", async () => {
  const env = environment({ OPENAI_API_KEY: "test-openai-key" });
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  globalThis.fetch = async () => {
    throw new Error("simulated_ai_outage");
  };
  console.error = () => {};

  try {
    const response = await worker.fetch(
      leadRequest({ type: "strings" }),
      env,
      context(),
    );
    assert.equal(response.status, 201);
    const row = env.LEADS.database.prepare("SELECT * FROM leads").get();
    assert.ok(row?.id);
    assert.ok(row?.lead_class);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
    env.LEADS.close();
  }
});

test("a pending object deletion is accepted, clears PII and remains retryable", async () => {
  const env = environment();
  const originalConsoleError = console.error;
  const leadId = "ANK-DELETE-RETRY";
  const photoId = "P-DELETE-RETRY";
  const objectKey = `${leadId}/photo.jpg`;
  env.LEADS.database
    .prepare(
      `INSERT INTO leads
        (id,created_at,name,email,phone,city,story,maker,summary,ai_json,status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      leadId,
      new Date().toISOString(),
      "PRIVATE NAME",
      "private@example.invalid",
      "+49 123 456789",
      "PRIVATE CITY",
      "PRIVATE STORY",
      "PRIVATE MAKER",
      "PRIVATE SUMMARY",
      JSON.stringify({ private: "PRIVATE AI DATA" }),
      "new",
    );
  env.LEADS.database
    .prepare(
      "INSERT INTO photos (id, lead_id, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(photoId, leadId, objectKey, "image/jpeg", new Date().toISOString());
  env.PHOTOS.objects.set(objectKey, {
    bytes: new Uint8Array([1, 2, 3]),
    httpMetadata: { contentType: "image/jpeg" },
  });
  env.PHOTOS.setDeleteFailure(true);

  const request = () =>
    new Request(`https://api.example.test/api/review/${leadId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${env.REVIEW_TOKEN}` },
    });

  console.error = () => {};
  try {
    const accepted = await worker.fetch(request(), env, context());
    assert.equal(accepted.status, 202);
    assert.deepEqual(await accepted.json(), {
      ok: true,
      accepted: true,
      deletion_pending: true,
    });
    const tombstone = env.LEADS.database
      .prepare("SELECT * FROM leads WHERE id=?")
      .get(leadId);
    assert.ok(tombstone.deleted_at);
    assert.equal(tombstone.deletion_status, "pending");
    for (const field of [
      "name",
      "email",
      "phone",
      "city",
      "story",
      "maker",
      "summary",
    ])
      assert.equal(tombstone[field], "", `${field} was not cleared`);
    assert.equal(tombstone.ai_json, "{}");

    env.PHOTOS.setDeleteFailure(false);
    const retried = await worker.fetch(request(), env, context());
    assert.equal(retried.status, 200);
    assert.equal(
      env.LEADS.database.prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?").get(leadId).count,
      0,
    );
  } finally {
    console.error = originalConsoleError;
    env.LEADS.close();
  }
});
