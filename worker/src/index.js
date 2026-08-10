import { PHOTO_PROMPT, LEAD_PROMPT } from "./prompt.js";

function cors(request, env) {
  const origin = request?.headers?.get("Origin") || "";

  const allowedOrigins = new Set([
    "http://localhost:4321",
    "http://localhost:4322",
    "https://janolefabian.github.io",
    "https://musikinstrument-ankauf.de",
    "https://www.musikinstrument-ankauf.de",
  ]);

  // Optional additional origins from Wrangler config:
  // "https://example.com,https://another.example.com"
  for (const value of (env.ALLOWED_ORIGINS || "").split(",")) {
    const trimmed = value.trim();
    if (trimmed) allowedOrigins.add(trimmed);
  }

  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };

  if (allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
function json(data, status = 200, request, env = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...cors(request, env),
    },
  });
}
function id(prefix = "ANK") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
function extractText(response) {
  return (
    response.output_text ||
    response.output
      ?.flatMap((x) => x.content || [])
      .find((x) => x.type === "output_text")?.text ||
    ""
  );
}
function routeForLead(ai) {
  if (ai.lead_class === "A") return "immediate";
  if (ai.lead_class === "B" || ai.notable) return "normal";
  return "weekly";
}
function effectiveType(meta) {
  return meta.classifiedType || meta.type || "other";
}
function aiEligible(meta) {
  return ["double_bass", "bow", "strings", "estate", "unknown"].includes(
    effectiveType(meta),
  );
}
function reviewUrl(env, leadId) {
  const base = (
    env.REVIEW_BASE_URL || "https://musikinstrument-ankauf.de"
  ).replace(/\/$/, "");
  return `${base}/review/?lead=${encodeURIComponent(leadId)}`;
}

async function openai(env, body) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return r.json();
}
async function blobDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}`;
}

async function photoCheck(request, env) {
  if (!env.OPENAI_API_KEY)
    return json({ ok: true, message: "Foto ist brauchbar." }, 200, env);
  const fd = await request.formData();
  const image = fd.get("image");
  const expected = fd.get("expected") || "Foto";
  const instruction = fd.get("instruction") || "";
  const mode = fd.get("mode") || "quality";
  if (!(image instanceof File))
    return json({ error: "image missing" }, 400, env);
  const dataUrl = await blobDataUrl(image);
  const schema =
    mode === "identify"
      ? {
          type: "object",
          properties: {
            ok: { type: "boolean" },
            message: { type: "string" },
            detected_type: {
              type: "string",
              enum: [
                "double_bass",
                "bow",
                "violin",
                "viola",
                "cello",
                "guitar",
                "other",
                "uncertain",
              ],
            },
          },
          required: ["ok", "message", "detected_type"],
          additionalProperties: false,
        }
      : {
          type: "object",
          properties: { ok: { type: "boolean" }, message: { type: "string" } },
          required: ["ok", "message"],
          additionalProperties: false,
        };
  const prompt =
    mode === "identify"
      ? `${PHOTO_PROMPT}\nZusätzlich ordne den Gegenstand grob ein. Wenn unsicher, detected_type=uncertain. Aufgabe: ${expected}. ${instruction}`
      : `${PHOTO_PROMPT}\nErwartetes Motiv: ${expected}. Anweisung: ${instruction}`;
  const response = await openai(env, {
    model: env.OPENAI_MODEL || "gpt-5.6-luna",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: dataUrl, detail: "low" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "photo_check",
        strict: true,
        schema,
      },
    },
  });
  return json(JSON.parse(extractText(response)), 200, env);
}

async function analyzeLead(env, meta, smallImages = []) {
  const type = effectiveType(meta);
  if (!aiEligible(meta))
    return {
      lead_class: "C",
      interest_score: 10,
      confidence: 90,
      notable: false,
      summary:
        "Normale Anfrage zur wöchentlichen Durchsicht; keine KI-Analyse ausgeführt.",
      title: type === "guitar" ? "Gitarre" : "Sonstiges Instrument",
      signals: [],
    };
  if (!env.OPENAI_API_KEY)
    return {
      lead_class: type === "double_bass" || type === "bow" ? "A" : "B",
      interest_score: type === "double_bass" || type === "bow" ? 90 : 45,
      confidence: 55,
      notable: ["estate", "unknown", "bow"].includes(type),
      summary: "KI nicht konfiguriert – konservative Regelklassifizierung.",
      title: type || "Instrument",
      signals: [],
    };
  const schema = {
    type: "object",
    properties: {
      lead_class: { type: "string", enum: ["A", "B", "C"] },
      interest_score: { type: "integer", minimum: 0, maximum: 100 },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      notable: { type: "boolean" },
      title: { type: "string" },
      summary: { type: "string" },
      signals: { type: "array", items: { type: "string" } },
    },
    required: [
      "lead_class",
      "interest_score",
      "confidence",
      "notable",
      "title",
      "summary",
      "signals",
    ],
    additionalProperties: false,
  };
  const content = [
    {
      type: "input_text",
      text: `${LEAD_PROMPT}\nAnfrage: ${JSON.stringify(meta)}`,
    },
  ];
  for (const image of smallImages.slice(0, 8))
    content.push({ type: "input_image", image_url: image, detail: "low" });
  const response = await openai(env, {
    model: env.OPENAI_MODEL || "gpt-5.6-luna",
    input: [{ role: "user", content }],
    text: {
      format: {
        type: "json_schema",
        name: "lead_triage",
        strict: true,
        schema,
      },
    },
  });
  return JSON.parse(extractText(response));
}

function makePayload(env, leadId, created, meta, ai, photoCount) {
  return {
    event: "lead.created",
    id: leadId,
    created_at: created,
    instrument_type: meta.type || "",
    classified_type: meta.classifiedType || "",
    ai_used: aiEligible(meta),
    title: ai.title || effectiveType(meta),
    lead_class: ai.lead_class,
    notable: Boolean(ai.notable),
    interest_score: ai.interest_score,
    confidence: ai.confidence,
    summary: ai.summary || "",
    signals: ai.signals || [],
    photo_count: photoCount,
    name: meta.data?.name || "",
    email: meta.data?.email || "",
    phone: meta.data?.phone || "",
    city: meta.data?.city || "",
    story: meta.data?.story || "",
    maker: meta.data?.maker || "",
    suggested_route: routeForLead(ai),
    review_url: reviewUrl(env, leadId),
  };
}

async function notifyMake(env, payload) {
  if (!env.MAKE_WEBHOOK_URL) {
    await env.LEADS.prepare(
      `UPDATE leads SET make_status='disabled' WHERE id=?`,
    )
      .bind(payload.id)
      .run();
    return;
  }
  try {
    const headers = { "Content-Type": "application/json" };
    if (env.MAKE_WEBHOOK_SECRET)
      headers["X-Webhook-Secret"] = env.MAKE_WEBHOOK_SECRET;
    const r = await fetch(env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r.ok)
      throw new Error(`Make ${r.status}: ${(await r.text()).slice(0, 500)}`);
    await env.LEADS.prepare(
      `UPDATE leads SET make_status='sent', make_error='' WHERE id=?`,
    )
      .bind(payload.id)
      .run();
  } catch (e) {
    console.error("Make webhook failed", e);
    await env.LEADS.prepare(
      `UPDATE leads SET make_status='failed', make_error=? WHERE id=?`,
    )
      .bind(String(e).slice(0, 1000), payload.id)
      .run();
  }
}

async function createLead(request, env, ctx) {
  const fd = await request.formData();
  const meta = JSON.parse(fd.get("meta") || "{}");
  const leadId = id();
  const created = new Date().toISOString();
  const photoMeta = meta.photoMeta || [];
  const small = [];
  const stored = [];
  const files = [...fd.entries()]
    .filter(([k, v]) => k.startsWith("photo_") && v instanceof File)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  const aiFiles = [...fd.entries()]
    .filter(([k, v]) => k.startsWith("ai_") && v instanceof File)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  for (const [, file] of aiFiles.slice(0, 8))
    small.push(await blobDataUrl(file));
  for (let i = 0; i < files.length; i++) {
    const [, file] = files[i];
    const pid = id("P");
    const safeName = (file.name || "photo.jpg").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const key = `${leadId}/${pid}-${safeName}`;
    await env.PHOTOS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    stored.push({
      id: pid,
      key,
      kind: photoMeta[i]?.kind || "",
      label: photoMeta[i]?.label || "",
      type: file.type || "image/jpeg",
    });
  }
  const ai = await analyzeLead(env, meta, small);
  await env.LEADS.prepare(
    `INSERT INTO leads (id,created_at,type,classified_type,name,email,phone,city,story,maker,lead_class,interest_score,confidence,notable,summary,ai_json,photo_count,make_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      leadId,
      created,
      meta.type || "",
      meta.classifiedType || "",
      meta.data?.name || "",
      meta.data?.email || "",
      meta.data?.phone || "",
      meta.data?.city || "",
      meta.data?.story || "",
      meta.data?.maker || "",
      ai.lead_class,
      ai.interest_score,
      ai.confidence,
      ai.notable ? 1 : 0,
      ai.summary,
      JSON.stringify(ai),
      stored.length,
      env.MAKE_WEBHOOK_URL ? "pending" : "disabled",
    )
    .run();
  for (const p of stored)
    await env.LEADS.prepare(
      `INSERT INTO photos (id,lead_id,object_key,kind,label,content_type,created_at) VALUES (?,?,?,?,?,?,?)`,
    )
      .bind(p.id, leadId, p.key, p.kind, p.label, p.type, created)
      .run();
  const payload = makePayload(env, leadId, created, meta, ai, stored.length);
  if (ctx?.waitUntil) ctx.waitUntil(notifyMake(env, payload));
  else await notifyMake(env, payload);
  return json(
    {
      id: leadId,
      class: ai.lead_class,
      notable: ai.notable,
      review_url: payload.review_url,
    },
    201,
    env,
  );
}

function authorized(request, env) {
  const auth = request.headers.get("Authorization");
  return !env.REVIEW_TOKEN || auth === `Bearer ${env.REVIEW_TOKEN}`;
}
async function reviewList(request, env) {
  if (!authorized(request, env))
    return json({ error: "unauthorized" }, 401, env);
  const { results } = await env.LEADS.prepare(
    `SELECT * FROM leads ORDER BY created_at DESC LIMIT 300`,
  ).all();
  const out = [];
  for (const l of results) {
    const photo = await env.LEADS.prepare(
      `SELECT id FROM photos WHERE lead_id=? ORDER BY created_at LIMIT 1`,
    )
      .bind(l.id)
      .first();
    let parsed = {};
    try {
      parsed = JSON.parse(l.ai_json || "{}");
    } catch {}
    out.push({
      id: l.id,
      class: l.lead_class,
      notable: Boolean(l.notable),
      title: parsed.title || l.type || "Anfrage",
      type: l.type,
      classified_type: l.classified_type,
      name: l.name,
      email: l.email,
      phone: l.phone,
      maker: l.maker,
      city: l.city,
      summary: l.summary,
      score: l.interest_score,
      confidence: l.confidence,
      status: l.status,
      make_status: l.make_status,
      photo_count: l.photo_count,
      created_at: l.created_at,
      image: photo
        ? `${new URL(request.url).origin}/api/photo/${photo.id}`
        : null,
    });
  }
  return json(out, 200, env);
}
async function reviewDetail(request, leadId, env) {
  if (!authorized(request, env))
    return json({ error: "unauthorized" }, 401, env);
  const l = await env.LEADS.prepare(`SELECT * FROM leads WHERE id=?`)
    .bind(leadId)
    .first();
  if (!l) return json({ error: "not_found" }, 404, env);
  const { results: photos } = await env.LEADS.prepare(
    `SELECT id,kind,label,content_type,created_at FROM photos WHERE lead_id=? ORDER BY created_at`,
  )
    .bind(leadId)
    .all();
  let ai = {};
  try {
    ai = JSON.parse(l.ai_json || "{}");
  } catch {}
  return json(
    {
      ...l,
      notable: Boolean(l.notable),
      ai,
      photos: photos.map((p) => ({
        ...p,
        url: `${new URL(request.url).origin}/api/photo/${p.id}`,
      })),
    },
    200,
    env,
  );
}
async function updateLead(request, leadId, env) {
  if (!authorized(request, env))
    return json({ error: "unauthorized" }, 401, env);
  const body = await request.json().catch(() => ({}));
  const allowed = [
    "new",
    "contacted",
    "interesting",
    "purchased",
    "declined",
    "archived",
  ];
  if (!allowed.includes(body.status))
    return json({ error: "invalid_status" }, 400, env);
  await env.LEADS.prepare(`UPDATE leads SET status=? WHERE id=?`)
    .bind(body.status, leadId)
    .run();
  return json({ ok: true, status: body.status }, 200, env);
}

async function deleteLead(request, leadId, env) {
  if (!authorized(request, env))
    return json({ error: "unauthorized" }, 401, env);
  // fetch photos for lead
  const { results: photos } = await env.LEADS.prepare(
    `SELECT object_key FROM photos WHERE lead_id=?`,
  )
    .bind(leadId)
    .all();
  // delete objects from R2 if present
  for (const p of photos) {
    try {
      if (p && p.object_key) await env.PHOTOS.delete(p.object_key);
    } catch (e) {
      console.error("R2 delete failed", e);
    }
  }
  // delete photo rows
  await env.LEADS.prepare(`DELETE FROM photos WHERE lead_id=?`)
    .bind(leadId)
    .run();
  // delete lead row
  await env.LEADS.prepare(`DELETE FROM leads WHERE id=?`).bind(leadId).run();
  return json({ ok: true }, 200, env);
}
async function servePhoto(request, photoId, env) {
  if (!authorized(request, env))
    return json({ error: "unauthorized" }, 401, env);
  const row = await env.LEADS.prepare(
    `SELECT object_key,content_type FROM photos WHERE id=?`,
  )
    .bind(photoId)
    .first();
  if (!row)
    return new Response("Not found", { status: 404, headers: cors(env) });
  const obj = await env.PHOTOS.get(row.object_key);
  if (!obj)
    return new Response("Not found", { status: 404, headers: cors(env) });
  return new Response(obj.body, {
    headers: {
      "Content-Type": row.content_type || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      ...cors(env),
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors(env) });
    try {
      if (url.pathname === "/api/health") return json({ ok: true }, 200, env);
      if (url.pathname === "/api/photo-check" && request.method === "POST")
        return photoCheck(request, env);
      if (url.pathname === "/api/leads" && request.method === "POST")
        return createLead(request, env, ctx);
      if (url.pathname === "/api/review" && request.method === "GET")
        return reviewList(request, env);
      const detail = url.pathname.match(/^\/api\/review\/([^/]+)$/);
      if (detail && request.method === "GET")
        return reviewDetail(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "PATCH")
        return updateLead(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "DELETE")
        return deleteLead(request, decodeURIComponent(detail[1]), env);
      if (url.pathname.startsWith("/api/photo/") && request.method === "GET")
        return servePhoto(request, url.pathname.split("/").pop(), env);
      return json({ error: "not found" }, 404, env);
    } catch (e) {
      console.error(e);
      return json({ error: "server_error" }, 500, env);
    }
  },
};
