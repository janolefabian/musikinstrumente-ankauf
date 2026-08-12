import { PHOTO_PROMPT, LEAD_PROMPT } from "./prompt.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:4321",
  "http://localhost:4322",
  "http://127.0.0.1:4321",
  "http://127.0.0.1:4322",
  "https://janolefabian.github.io",
  "https://musikinstrument-ankauf.de",
  "https://www.musikinstrument-ankauf.de",
];

function getAllowedOrigins(env) {
  const allowed = new Set(DEFAULT_ALLOWED_ORIGINS);
  const configured = [env.ALLOWED_ORIGIN, env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .join(",");
  for (const value of configured.split(",")) {
    const origin = value.trim();
    if (origin) allowed.add(origin);
  }
  return allowed;
}

function cors(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = getAllowedOrigins(env);
  const localDevelopmentOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(
    origin,
  );
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    Vary: "Origin",
  };

  if (allowedOrigins.has(origin) || localDevelopmentOrigin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(data, status = 200, request = null, env = null) {
  let req = null;
  let environment = null;

  if (request instanceof Request) {
    req = request;
    environment = env;
  } else if (request && typeof request === "object" && request.headers) {
    req = request;
    environment = env;
  } else {
    environment = request;
  }

  const headers = {
    "content-type": "application/json; charset=utf-8",
    ...(req && environment ? cors(req, environment) : {}),
  };

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}
function id(prefix = "ANK") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

function continuationSecret(env) {
  return env.UPLOAD_TOKEN_SECRET || env.OPENAI_API_KEY || "";
}

function base64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function continuationKey(env, usages) {
  const secret = continuationSecret(env);
  if (!secret) return null;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function createContinuationToken(env, leadId) {
  const key = await continuationKey(env, ["sign"]);
  if (!key) return null;
  const expires = Date.now() + 72 * 60 * 60 * 1000;
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const payload = `${leadId}.${expires}.${nonce}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
  );
  return `${expires}.${nonce}.${base64Url(signature)}`;
}

async function validContinuationToken(env, leadId, token) {
  const [expiresRaw, nonce, signatureRaw, ...rest] = String(token || "").split(
    ".",
  );
  const expires = Number(expiresRaw);
  if (
    rest.length ||
    !expiresRaw ||
    !nonce ||
    !signatureRaw ||
    !Number.isFinite(expires) ||
    expires < Date.now()
  )
    return false;
  const key = await continuationKey(env, ["verify"]);
  if (!key) return false;
  try {
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureRaw),
      new TextEncoder().encode(`${leadId}.${expiresRaw}.${nonce}`),
    );
  } catch {
    return false;
  }
}

function sortedFiles(formData, prefix) {
  return [...formData.entries()]
    .filter(([key, value]) => key.startsWith(prefix) && value instanceof File)
    .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
}

async function storePhotos(
  env,
  leadId,
  files,
  thumbnailFiles,
  photoMeta,
  created,
) {
  const stored = [];
  for (let i = 0; i < files.length; i++) {
    const [, file] = files[i];
    if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024)
      throw new Error("invalid_photo");
    const pid = id("P");
    const safeName = (file.name || "photo.jpg").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const key = `${leadId}/${pid}-${safeName}`;
    const thumbnail = thumbnailFiles[i]?.[1];
    let thumbnailKey = null;
    const writes = [
      env.PHOTOS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" },
      }),
    ];
    if (thumbnail) {
      if (
        !thumbnail.type.startsWith("image/") ||
        thumbnail.size > 2 * 1024 * 1024
      )
        throw new Error("invalid_thumbnail");
      thumbnailKey = `${leadId}/${pid}-thumb.jpg`;
      writes.push(
        env.PHOTOS.put(thumbnailKey, thumbnail.stream(), {
          httpMetadata: { contentType: thumbnail.type || "image/jpeg" },
        }),
      );
    }
    await Promise.all(writes);
    stored.push({
      id: pid,
      key,
      thumbnailKey,
      kind: photoMeta[i]?.kind || "",
      label: photoMeta[i]?.label || "",
      type: file.type || "image/jpeg",
    });
  }
  return stored;
}

async function insertPhotoRows(env, leadId, photos, created) {
  for (const photo of photos)
    await env.LEADS.prepare(
      `INSERT INTO photos (id,lead_id,object_key,thumbnail_key,kind,label,content_type,created_at) VALUES (?,?,?,?,?,?,?,?)`,
    )
      .bind(
        photo.id,
        leadId,
        photo.key,
        photo.thumbnailKey,
        photo.kind,
        photo.label,
        photo.type,
        created,
      )
      .run();
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
    return json(
      { ok: true, message: "Foto ist brauchbar." },
      200,
      request,
      env,
    );
  const fd = await request.formData();
  const image = fd.get("image");
  const expected = fd.get("expected") || "Foto";
  const instruction = fd.get("instruction") || "";
  const mode = fd.get("mode") || "quality";
  if (!(image instanceof File))
    return json({ error: "image missing" }, 400, request, env);
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
  return json(JSON.parse(extractText(response)), 200, request, env);
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
  const files = sortedFiles(fd, "photo_");
  const thumbnailFiles = sortedFiles(fd, "thumb_");
  const aiFiles = sortedFiles(fd, "ai_");
  for (const [, file] of aiFiles.slice(0, 8))
    small.push(await blobDataUrl(file));
  const stored = await storePhotos(
    env,
    leadId,
    files,
    thumbnailFiles,
    photoMeta,
    created,
  );
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
  await insertPhotoRows(env, leadId, stored, created);
  const payload = makePayload(env, leadId, created, meta, ai, stored.length);
  if (ctx?.waitUntil) ctx.waitUntil(notifyMake(env, payload));
  else await notifyMake(env, payload);
  const continuationToken = await createContinuationToken(env, leadId);
  return json(
    {
      id: leadId,
      class: ai.lead_class,
      notable: ai.notable,
      review_url: payload.review_url,
      continuation_token: continuationToken,
    },
    201,
    request,
    env,
  );
}

async function continueLead(request, leadId, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!(await validContinuationToken(env, leadId, token)))
    return json({ error: "unauthorized" }, 401, request, env);

  const lead = await env.LEADS.prepare(`SELECT * FROM leads WHERE id=?`)
    .bind(leadId)
    .first();
  if (!lead) return json({ error: "not_found" }, 404, request, env);

  const fd = await request.formData();
  const meta = JSON.parse(fd.get("meta") || "{}");
  const photoMeta = Array.isArray(meta.photoMeta) ? meta.photoMeta : [];
  const files = sortedFiles(fd, "photo_");
  const thumbnailFiles = sortedFiles(fd, "thumb_");
  const aiFiles = sortedFiles(fd, "ai_");
  const currentPhotoCount = Number(lead.photo_count || 0);
  if (files.length > 8 || currentPhotoCount + files.length > 12)
    return json({ error: "too_many_photos" }, 400, request, env);

  const allowedTypes = new Set([
    "double_bass",
    "bow",
    "strings",
    "guitar",
    "estate",
    "unknown",
    "other",
  ]);
  const classifiedType = allowedTypes.has(meta.classifiedType)
    ? meta.classifiedType
    : lead.classified_type || "";
  const story = String(meta.data?.story ?? lead.story ?? "").slice(0, 10000);
  const maker = String(meta.data?.maker ?? lead.maker ?? "").slice(0, 1000);
  const created = new Date().toISOString();
  const stored = await storePhotos(
    env,
    leadId,
    files,
    thumbnailFiles,
    photoMeta,
    created,
  );
  await insertPhotoRows(env, leadId, stored, created);

  let previousAnalysis = {};
  try {
    previousAnalysis = JSON.parse(lead.ai_json || "{}");
  } catch {}
  const analysisMeta = {
    type: lead.type || "",
    classifiedType,
    data: {
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
      city: lead.city || "",
      story,
      maker,
    },
    previousAnalysis,
  };
  const small = [];
  for (const [, file] of aiFiles.slice(0, 8))
    small.push(await blobDataUrl(file));
  const photoCount = currentPhotoCount + stored.length;
  let ai = previousAnalysis;
  const analysisChanged =
    small.length > 0 ||
    story !== (lead.story || "") ||
    maker !== (lead.maker || "") ||
    classifiedType !== (lead.classified_type || "");
  if (analysisChanged) {
    try {
      ai = await analyzeLead(env, analysisMeta, small);
    } catch (error) {
      console.error("Lead continuation analysis failed", error);
    }
  }
  if (!ai || !ai.lead_class) {
    ai = {
      lead_class: lead.lead_class || "C",
      interest_score: Number(lead.interest_score || 0),
      confidence: Number(lead.confidence || 0),
      notable: Boolean(lead.notable),
      summary: lead.summary || "",
      title: effectiveType(analysisMeta),
      signals: [],
    };
  }
  await env.LEADS.prepare(
    `UPDATE leads SET classified_type=?,story=?,maker=?,lead_class=?,interest_score=?,confidence=?,notable=?,summary=?,ai_json=?,photo_count=? WHERE id=?`,
  )
    .bind(
      classifiedType,
      story,
      maker,
      ai.lead_class,
      ai.interest_score,
      ai.confidence,
      ai.notable ? 1 : 0,
      ai.summary,
      JSON.stringify(ai),
      photoCount,
      leadId,
    )
    .run();

  return json(
    {
      ok: true,
      id: leadId,
      photo_count: photoCount,
      class: ai.lead_class,
      notable: ai.notable,
    },
    200,
    request,
    env,
  );
}

function authorized(request, env) {
  const auth = request.headers.get("Authorization");
  return Boolean(env.REVIEW_TOKEN) && auth === `Bearer ${env.REVIEW_TOKEN}`;
}

function reviewAuthError(request, env) {
  if (!env.REVIEW_TOKEN)
    return json({ error: "review_not_configured" }, 503, request, env);
  return json({ error: "unauthorized" }, 401, request, env);
}

function encodeReviewCursor(row) {
  return base64Url(
    new TextEncoder().encode(JSON.stringify([row.created_at, row.id])),
  );
}

function decodeReviewCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(fromBase64Url(String(value))),
    );
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== "string" ||
      typeof parsed[1] !== "string"
    )
      return null;
    return { createdAt: parsed[0], id: parsed[1] };
  } catch {
    return null;
  }
}

async function reviewList(request, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(50, Math.trunc(requestedLimit)))
    : 30;
  const filter = [
    "all",
    "urgent",
    "notable",
    "week",
    "c",
    "new",
    "interesting",
    "contacted",
    "purchased",
    "declined",
    "archived",
  ].includes(url.searchParams.get("filter"))
    ? url.searchParams.get("filter")
    : "all";
  const query = String(url.searchParams.get("q") || "")
    .trim()
    .toLocaleLowerCase("de-DE")
    .slice(0, 200);
  const cursorValue = url.searchParams.get("cursor");
  const cursor = decodeReviewCursor(cursorValue);
  if (cursorValue && !cursor)
    return json({ error: "invalid_cursor" }, 400, request, env);

  const conditions = [];
  const bindings = [];
  const statusFilters = new Set([
    "new",
    "interesting",
    "contacted",
    "purchased",
    "declined",
    "archived",
  ]);
  if (statusFilters.has(filter)) {
    conditions.push("COALESCE(l.status, 'new') = ?");
    bindings.push(filter);
  } else conditions.push("COALESCE(l.status, 'new') != 'archived'");
  if (filter === "urgent") conditions.push("l.lead_class = 'A'");
  if (filter === "notable")
    conditions.push("l.lead_class != 'A' AND COALESCE(l.notable, 0) = 1");
  if (filter === "week")
    conditions.push("l.lead_class = 'B' AND COALESCE(l.notable, 0) = 0");
  if (filter === "c")
    conditions.push("l.lead_class = 'C' AND COALESCE(l.notable, 0) = 0");
  if (query) {
    conditions.push(`LOWER(
      COALESCE(l.id, '') || ' ' || COALESCE(l.name, '') || ' ' ||
      COALESCE(l.email, '') || ' ' || COALESCE(l.phone, '') || ' ' ||
      COALESCE(l.city, '') || ' ' || COALESCE(l.maker, '') || ' ' ||
      COALESCE(l.type, '') || ' ' || COALESCE(l.classified_type, '') || ' ' ||
      COALESCE(l.summary, '') || ' ' || COALESCE(l.ai_json, '')
    ) LIKE ?`);
    bindings.push(`%${query}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const cursorWhere = cursor
    ? "WHERE f.created_at < ? OR (f.created_at = ? AND f.id < ?)"
    : "";
  const cursorBindings = cursor
    ? [cursor.createdAt, cursor.createdAt, cursor.id]
    : [];

  const { results = [] } = await env.LEADS.prepare(
    `WITH filtered AS (
      SELECT
        l.id, l.created_at, l.type, l.classified_type, l.name, l.email,
        l.phone, l.maker, l.city, l.summary, l.lead_class,
        l.interest_score, l.confidence, l.notable, l.status,
        l.make_status, l.photo_count, l.ai_json
      FROM leads l
      ${where}
    ),
    page AS (
      SELECT f.*,
        (SELECT p.id FROM photos p
          WHERE p.lead_id = f.id
          ORDER BY p.created_at ASC, p.id ASC LIMIT 1) AS preview_photo_id
      FROM filtered f
      ${cursorWhere}
      ORDER BY f.created_at DESC, f.id DESC
      LIMIT ?
    ),
    counts AS (
      SELECT
        SUM(CASE WHEN COALESCE(status, 'new') != 'archived' THEN 1 ELSE 0 END) AS count_all,
        SUM(CASE WHEN COALESCE(status, 'new') != 'archived' AND lead_class = 'A' THEN 1 ELSE 0 END) AS count_urgent,
        SUM(CASE WHEN COALESCE(status, 'new') != 'archived' AND lead_class != 'A' AND COALESCE(notable, 0) = 1 THEN 1 ELSE 0 END) AS count_notable,
        SUM(CASE WHEN COALESCE(status, 'new') != 'archived' AND lead_class = 'B' AND COALESCE(notable, 0) = 0 THEN 1 ELSE 0 END) AS count_week,
        SUM(CASE WHEN COALESCE(status, 'new') != 'archived' AND lead_class = 'C' AND COALESCE(notable, 0) = 0 THEN 1 ELSE 0 END) AS count_c,
        SUM(CASE WHEN COALESCE(status, 'new') = 'new' THEN 1 ELSE 0 END) AS count_new,
        SUM(CASE WHEN COALESCE(status, 'new') = 'interesting' THEN 1 ELSE 0 END) AS count_interesting,
        SUM(CASE WHEN COALESCE(status, 'new') = 'contacted' THEN 1 ELSE 0 END) AS count_contacted,
        SUM(CASE WHEN COALESCE(status, 'new') = 'purchased' THEN 1 ELSE 0 END) AS count_purchased,
        SUM(CASE WHEN COALESCE(status, 'new') = 'declined' THEN 1 ELSE 0 END) AS count_declined,
        SUM(CASE WHEN COALESCE(status, 'new') = 'archived' THEN 1 ELSE 0 END) AS count_archived
      FROM leads
    ),
    filtered_count AS (SELECT COUNT(*) AS filtered_total FROM filtered)
    SELECT page.*, counts.*, filtered_count.filtered_total
    FROM counts
    CROSS JOIN filtered_count
    LEFT JOIN page ON 1 = 1
    ORDER BY page.created_at DESC, page.id DESC`,
  )
    .bind(...bindings, ...cursorBindings, limit + 1)
    .all();

  const pageRows = results.filter((row) => row.id);
  const hasMore = pageRows.length > limit;
  const rows = pageRows.slice(0, limit);
  const origin = url.origin;
  const items = rows.map((l) => {
    let parsed = {};
    try {
      parsed = JSON.parse(l.ai_json || "{}");
    } catch {}
    const thumbnail = l.preview_photo_id
      ? `${origin}/api/photo/${l.preview_photo_id}?variant=thumbnail`
      : null;
    return {
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
      image: thumbnail,
      thumbnail,
    };
  });
  const countRow = results[0] || {};
  return json(
    {
      items,
      counts: {
        all: Number(countRow.count_all || 0),
        urgent: Number(countRow.count_urgent || 0),
        notable: Number(countRow.count_notable || 0),
        week: Number(countRow.count_week || 0),
        c: Number(countRow.count_c || 0),
        new: Number(countRow.count_new || 0),
        interesting: Number(countRow.count_interesting || 0),
        contacted: Number(countRow.count_contacted || 0),
        purchased: Number(countRow.count_purchased || 0),
        declined: Number(countRow.count_declined || 0),
        archived: Number(countRow.count_archived || 0),
      },
      filtered_total: Number(countRow.filtered_total || 0),
      has_more: hasMore,
      next_cursor:
        hasMore && items.length ? encodeReviewCursor(items.at(-1)) : null,
    },
    200,
    request,
    env,
  );
}
async function reviewDetail(request, leadId, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);
  const l = await env.LEADS.prepare(`SELECT * FROM leads WHERE id=?`)
    .bind(leadId)
    .first();
  if (!l) return json({ error: "not_found" }, 404, request, env);
  const { results: photos } = await env.LEADS.prepare(
    `SELECT id,kind,label,content_type,created_at,
      CASE WHEN thumbnail_key IS NOT NULL THEN 1 ELSE 0 END AS has_thumbnail
      FROM photos WHERE lead_id=? ORDER BY created_at, id`,
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
        has_thumbnail: Boolean(p.has_thumbnail),
        url: `${new URL(request.url).origin}/api/photo/${p.id}`,
        thumbnail_url: `${new URL(request.url).origin}/api/photo/${p.id}?variant=thumbnail`,
      })),
    },
    200,
    request,
    env,
  );
}
async function updateLead(request, leadId, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);
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
    return json({ error: "invalid_status" }, 400, request, env);
  await env.LEADS.prepare(`UPDATE leads SET status=? WHERE id=?`)
    .bind(body.status, leadId)
    .run();
  return json({ ok: true, status: body.status }, 200, request, env);
}

async function deleteLeadsByIds(env, leadIds) {
  const placeholders = leadIds.map(() => "?").join(",");
  const { results: photos } = await env.LEADS.prepare(
    `SELECT object_key,thumbnail_key FROM photos WHERE lead_id IN (${placeholders})`,
  )
    .bind(...leadIds)
    .all();
  const objectKeys = photos.flatMap((photo) =>
    [photo.object_key, photo.thumbnail_key].filter(Boolean),
  );
  const deletions = await Promise.allSettled(
    objectKeys.map((objectKey) => env.PHOTOS.delete(objectKey)),
  );
  for (const deletion of deletions) {
    if (deletion.status === "rejected")
      console.error("R2 delete failed", deletion.reason);
  }
  await env.LEADS.batch([
    env.LEADS.prepare(
      `DELETE FROM photos WHERE lead_id IN (${placeholders})`,
    ).bind(...leadIds),
    env.LEADS.prepare(`DELETE FROM leads WHERE id IN (${placeholders})`).bind(
      ...leadIds,
    ),
  ]);
}

async function deleteLead(request, leadId, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);
  await deleteLeadsByIds(env, [leadId]);
  return json({ ok: true }, 200, request, env);
}

async function bulkReviewAction(request, env) {
  if (!authorized(request, env)) return reviewAuthError(request, env);
  const body = await request.json().catch(() => ({}));
  const ids = [
    ...new Set(
      (Array.isArray(body.ids) ? body.ids : [])
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
  if (!ids.length || ids.length > 100)
    return json({ error: "invalid_ids" }, 400, request, env);
  if (body.action === "archive") {
    const placeholders = ids.map(() => "?").join(",");
    const result = await env.LEADS.prepare(
      `UPDATE leads SET status='archived' WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .run();
    return json(
      { ok: true, action: "archive", count: result.meta?.changes || 0 },
      200,
      request,
      env,
    );
  }
  if (body.action === "delete") {
    const placeholders = ids.map(() => "?").join(",");
    const { results = [] } = await env.LEADS.prepare(
      `SELECT id FROM leads WHERE id IN (${placeholders})`,
    )
      .bind(...ids)
      .all();
    const existingIds = results.map((row) => row.id);
    if (existingIds.length) await deleteLeadsByIds(env, existingIds);
    return json(
      { ok: true, action: "delete", count: existingIds.length },
      200,
      request,
      env,
    );
  }
  return json({ error: "invalid_action" }, 400, request, env);
}
async function servePhoto(request, photoId, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);
  const row = await env.LEADS.prepare(
    `SELECT object_key,thumbnail_key,content_type FROM photos WHERE id=?`,
  )
    .bind(photoId)
    .first();
  if (!row)
    return new Response("Not found", {
      status: 404,
      headers: cors(request, env),
    });
  const variant = new URL(request.url).searchParams.get("variant");
  const useThumbnail = variant === "thumbnail" || variant === "thumb";
  const objectKey = useThumbnail && row.thumbnail_key
    ? row.thumbnail_key
    : row.object_key;
  let servedThumbnail = useThumbnail && Boolean(row.thumbnail_key);
  let obj = await env.PHOTOS.get(objectKey);
  if (!obj && servedThumbnail) {
    obj = await env.PHOTOS.get(row.object_key);
    servedThumbnail = false;
  }
  if (!obj)
    return new Response("Not found", {
      status: 404,
      headers: cors(request, env),
    });
  return new Response(obj.body, {
    headers: {
      "Content-Type":
        obj.httpMetadata?.contentType ||
        (servedThumbnail
          ? "image/jpeg"
          : row.content_type || "image/jpeg"),
      "Cache-Control": "private, max-age=3600",
      "X-Photo-Variant":
        servedThumbnail ? "thumbnail" : "original",
      ...cors(request, env),
    },
  });
}

async function savePhotoThumbnail(request, photoId, env) {
  if (!authorized(request, env)) return reviewAuthError(request, env);
  const contentType = request.headers.get("Content-Type") || "";
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (!contentType.startsWith("image/") || contentLength > 2 * 1024 * 1024)
    return json({ error: "invalid_thumbnail" }, 400, request, env);
  const row = await env.LEADS.prepare(
    `SELECT object_key,thumbnail_key FROM photos WHERE id=?`,
  )
    .bind(photoId)
    .first();
  if (!row) return json({ error: "not_found" }, 404, request, env);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 2 * 1024 * 1024)
    return json({ error: "invalid_thumbnail" }, 400, request, env);
  const slash = row.object_key.lastIndexOf("/");
  const prefix = slash >= 0 ? row.object_key.slice(0, slash + 1) : "";
  const thumbnailKey = `${prefix}${photoId}-thumb.jpg`;
  await env.PHOTOS.put(thumbnailKey, bytes, {
    httpMetadata: { contentType },
  });
  await env.LEADS.prepare(`UPDATE photos SET thumbnail_key=? WHERE id=?`)
    .bind(thumbnailKey, photoId)
    .run();
  if (row.thumbnail_key && row.thumbnail_key !== thumbnailKey)
    await env.PHOTOS.delete(row.thumbnail_key);
  return json({ ok: true, id: photoId }, 200, request, env);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return new Response(null, { headers: cors(request, env) });
    try {
      if (url.pathname === "/api/health")
        return json({ ok: true }, 200, request, env);
      if (url.pathname === "/api/photo-check" && request.method === "POST")
        return photoCheck(request, env);
      if (url.pathname === "/api/leads" && request.method === "POST")
        return createLead(request, env, ctx);
      const continuation = url.pathname.match(/^\/api\/leads\/([^/]+)\/continue$/);
      if (continuation && request.method === "POST")
        return continueLead(
          request,
          decodeURIComponent(continuation[1]),
          env,
        );
      if (url.pathname === "/api/review" && request.method === "GET")
        return reviewList(request, env);
      if (url.pathname === "/api/review/bulk" && request.method === "POST")
        return bulkReviewAction(request, env);
      const thumbnail = url.pathname.match(
        /^\/api\/review\/photo\/([^/]+)\/thumbnail$/,
      );
      if (thumbnail && request.method === "PUT")
        return savePhotoThumbnail(
          request,
          decodeURIComponent(thumbnail[1]),
          env,
        );
      const detail = url.pathname.match(/^\/api\/review\/([^/]+)$/);
      if (detail && request.method === "GET")
        return reviewDetail(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "PATCH")
        return updateLead(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "DELETE")
        return deleteLead(request, decodeURIComponent(detail[1]), env);
      if (url.pathname.startsWith("/api/photo/") && request.method === "GET")
        return servePhoto(request, url.pathname.split("/").pop(), env);
      return json({ error: "not found" }, 404, request, env);
    } catch (e) {
      console.error(e);
      return json({ error: "server_error" }, 500, request, env);
    }
  },
};
