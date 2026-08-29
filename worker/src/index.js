import { PHOTO_PROMPT, LEAD_PROMPT } from "./prompt.js";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:4321",
  "http://localhost:4322",
  "http://localhost:4323",
  "http://localhost:4324",
  "http://localhost:4326",
  "http://127.0.0.1:4321",
  "http://127.0.0.1:4322",
  "http://127.0.0.1:4323",
  "http://127.0.0.1:4324",
  "http://127.0.0.1:4326",
  "https://janolefabian.github.io",
  "https://musikinstrument-ankauf.de",
  "https://www.musikinstrument-ankauf.de",
];

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_INSTRUMENT_TYPES = new Set([
  "double_bass",
  "bow",
  "strings",
  "guitar",
  "estate",
  "unknown",
  "other",
]);
const CONSENT_VERSION = "2026-08-24";
const LEGACY_SUBMISSION_HARD_END = Date.parse("2026-09-08T00:00:00.000Z");
const CONSENT_MAX_AGE_MS = 72 * 60 * 60 * 1000;
const CONSENT_FUTURE_SKEW_MS = 5 * 60 * 1000;
const STALE_UPLOAD_MS = 10 * 60 * 1000;
const JOURNAL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PHOTOS_PER_REQUEST = 8;
const MAX_PHOTOS_PER_LEAD = 12;
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;
const MAX_THUMBNAIL_BYTES = 1024 * 1024;
const MAX_AI_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_PHOTO_CHECK_BYTES = 2 * 1024 * 1024;
const MAX_LEAD_REQUEST_BYTES = 40 * 1024 * 1024;
const MAX_PHOTO_CHECK_REQUEST_BYTES = 3 * 1024 * 1024;
const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const PHOTO_ISSUE_CODES = [
  "none",
  "wrong_subject",
  "not_visible",
  "extreme_blur",
  "extreme_exposure",
  "severe_crop",
];
const PHOTO_ISSUE_CODE_SET = new Set(PHOTO_ISSUE_CODES);
const DETECTED_INSTRUMENT_TYPES = [
  "double_bass",
  "bow",
  "violin",
  "viola",
  "cello",
  "guitar",
  "other",
  "uncertain",
];
const DETECTED_INSTRUMENT_TYPE_SET = new Set(DETECTED_INSTRUMENT_TYPES);
const FUNNEL_STEP_EVENTS = [
  "wizard_opened",
  "type_selected",
  "contact_reached",
  "lead_saved",
  "flow_completed",
];
const FUNNEL_PHOTO_EVENTS = [
  "first_photo_added",
  "additional_photos_started",
  "additional_photo_uploaded",
];
const FUNNEL_DIAGNOSTIC_EVENTS = [
  "lead_submit_error",
  "continuation_submit_error",
];
const FUNNEL_FRICTION_EVENTS = [
  "photo_skipped",
  "photo_warning_shown",
  "photo_warning_overridden",
  "photo_check_unavailable",
  "back_used",
  "early_finish",
  "contact_validation_failed",
];
const FUNNEL_EVENTS = new Set([
  ...FUNNEL_STEP_EVENTS,
  ...FUNNEL_PHOTO_EVENTS,
  ...FUNNEL_DIAGNOSTIC_EVENTS,
  ...FUNNEL_FRICTION_EVENTS,
]);
const FUNNEL_INSTRUMENT_TYPES = new Set([
  ...ALLOWED_INSTRUMENT_TYPES,
  "unselected",
]);
const FUNNEL_DEVICE_TYPES = new Set([
  "mobile",
  "tablet",
  "desktop",
  "unknown",
]);
const FUNNEL_ENTRY_PAGES = new Set([
  "direct",
  "home",
  "city",
  "instrument",
  "story",
  "other_internal",
  "external",
  "unknown",
]);
const FUNNEL_SOURCE_GROUPS = new Set([
  "direct",
  "internal",
  "google",
  "bing",
  "duckduckgo",
  "external",
  "unknown",
]);
const FUNNEL_RETENTION_DAYS = 400;
const ANALYTICS_UNIQUE_RETENTION_DAYS = 3;
const ANALYTICS_CITY_PATHS = new Set([
  "berlin",
  "bremen",
  "dortmund",
  "dresden",
  "duesseldorf",
  "duisburg",
  "essen",
  "frankfurt",
  "hamburg",
  "hannover",
  "koeln",
  "leipzig",
  "muenchen",
  "nuernberg",
  "stuttgart",
]);
const ANALYTICS_INSTRUMENT_PATHS = new Set([
  "/bogen-verkaufen/",
  "/cello-verkaufen/",
  "/geige-verkaufen/",
  "/instrument-geerbt/",
  "/kontrabass-verkaufen/",
  "/kontrabassbogen-verkaufen/",
]);
const ANALYTICS_STORY_PATHS = new Set([
  "/instrumentengeschichten/",
  "/instrumentengeschichten/albert-volkmann-1908/",
  "/instrumentengeschichten/august-rau-geigenbogen-um-1910/",
  "/instrumentengeschichten/f-guenter-hoyer-kontrabassbogen-um-1950/",
  "/instrumentengeschichten/johannes-rubner-1967/",
]);
const ANALYTICS_SOURCE_GROUPS = new Set([
  "direct",
  "internal",
  "google",
  "bing",
  "duckduckgo",
  "external",
  "unknown",
]);

class ApiError extends Error {
  constructor(status, code, headers = {}) {
    super(code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

function apiError(status, code, headers) {
  throw new ApiError(status, code, headers);
}

function boundedText(value, maxLength, field, { required = false } = {}) {
  const text = String(value ?? "").replace(/\0/g, "").trim();
  if (required && !text) apiError(400, `${field}_missing`);
  if (text.length > maxLength) apiError(413, `${field}_too_long`);
  return text;
}

function validEmail(value) {
  return (
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) &&
    !/[\r\n]/.test(value)
  );
}

function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  return Boolean(origin) && getAllowedOrigins(env).has(origin);
}

function requirePublicWriteOrigin(request, env) {
  if (!isAllowedOrigin(request, env)) apiError(403, "origin_not_allowed");
}

function assertContentLength(request, maxBytes) {
  const raw = request.headers.get("Content-Length");
  if (!raw) return;
  const size = Number(raw);
  if (!Number.isFinite(size) || size < 0) apiError(400, "invalid_length");
  if (size > maxBytes) apiError(413, "request_too_large");
}

async function readMultipart(request, maxBytes) {
  assertContentLength(request, maxBytes);
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;"))
    apiError(415, "multipart_required");
  let formData;
  try {
    formData = await request.formData();
  } catch {
    apiError(400, "invalid_multipart");
  }
  let total = 0;
  const encoder = new TextEncoder();
  for (const [, value] of formData.entries()) {
    total += value instanceof File ? value.size : encoder.encode(value).length;
    if (total > maxBytes) apiError(413, "request_too_large");
  }
  return formData;
}

function imageSignatureMatches(bytes, type) {
  if (type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  if (type === "image/webp")
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  return false;
}

async function validateImageFile(file, maxBytes, code = "invalid_photo") {
  if (!(file instanceof File)) apiError(400, code);
  const type = String(file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(type)) apiError(415, `${code}_type`);
  if (!file.size) apiError(400, `${code}_empty`);
  if (file.size > maxBytes) apiError(413, `${code}_too_large`);
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!imageSignatureMatches(signature, type))
    apiError(415, `${code}_signature`);
}

async function sha256(value) {
  return sha256Bytes(new TextEncoder().encode(value));
}

async function sha256Bytes(value) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", value),
  );
  return base64Url(bytes);
}

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
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(data, status = 200, request = null, env = null, extraHeaders = {}) {
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
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(req && environment ? cors(req, environment) : {}),
    ...extraHeaders,
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
  // Never reuse an unrelated credential as a signing key. If the dedicated
  // secret is missing, initial leads are still accepted, but continuation is
  // deliberately disabled until UPLOAD_TOKEN_SECRET is configured.
  return env.UPLOAD_TOKEN_SECRET || "";
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

async function enforceRateLimit(
  request,
  env,
  scope,
  limit,
  windowSeconds,
) {
  const origin = request.headers.get("Origin") || "unknown";
  const forwarded = (request.headers.get("X-Forwarded-For") || "")
    .split(",")[0]
    .trim();
  const client =
    request.headers.get("CF-Connecting-IP") || forwarded || "unknown";
  const identityHash = await sha256(`${scope}\n${origin}\n${client}`);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const expiresAt = windowStart + windowSeconds * 2;
  const { results = [] } = await env.LEADS.prepare(
    `INSERT INTO api_rate_limits
      (scope,identity_hash,window_start,count,expires_at)
     VALUES (?,?,?,?,?)
     ON CONFLICT(scope,identity_hash,window_start)
     DO UPDATE SET count=count+1,expires_at=excluded.expires_at
     RETURNING count`,
  )
    .bind(scope, identityHash, windowStart, 1, expiresAt)
    .all();
  const count = Number(results[0]?.count || 1);
  if (Math.random() < 0.02)
    await env.LEADS.prepare(`DELETE FROM api_rate_limits WHERE expires_at < ?`)
      .bind(now)
      .run();
  if (count > limit) {
    const retryAfter = Math.max(1, windowStart + windowSeconds - now);
    apiError(429, "rate_limited", { "Retry-After": String(retryAfter) });
  }
}

function parseJsonField(formData, field = "meta") {
  const raw = formData.get(field);
  if (typeof raw !== "string" || !raw || raw.length > 24000)
    apiError(400, `${field}_invalid`);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      apiError(400, `${field}_invalid`);
    return parsed;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    apiError(400, `${field}_invalid`);
  }
}

function normalizePhotoMeta(value, photoCount) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > photoCount)
    apiError(400, "photo_meta_invalid");
  return value.map((item) => ({
    kind: boundedText(item?.kind, 80, "photo_kind"),
    label: boundedText(item?.label, 200, "photo_label"),
  }));
}

function legacySubmissionAllowed(env) {
  // Compatibility is fail-closed. It can only be enabled deliberately during
  // the short cache-rollout window and becomes impossible after the hard end.
  return (
    env.ALLOW_LEGACY_LEAD_SUBMISSIONS === "true" &&
    Date.now() <= LEGACY_SUBMISSION_HARD_END
  );
}

function normalizeInitialMeta(raw, created, { allowLegacy = false } = {}) {
  const type = boundedText(raw.type, 40, "type", { required: true });
  if (!ALLOWED_INSTRUMENT_TYPES.has(type)) apiError(400, "type_invalid");
  const classifiedType = boundedText(
    raw.classifiedType,
    40,
    "classified_type",
  );
  if (classifiedType && !ALLOWED_INSTRUMENT_TYPES.has(classifiedType))
    apiError(400, "classified_type_invalid");
  const data = raw.data && typeof raw.data === "object" ? raw.data : {};
  const email = boundedText(data.email, 320, "email", { required: true });
  if (!validEmail(email)) apiError(400, "email_invalid");

  let consentAt;
  let consentVersion;
  if (allowLegacy && raw.consent === undefined) {
    consentAt = created;
    consentVersion = "legacy-ui-implicit-v1";
  } else {
    const consent = raw.consent;
    const consentTime =
      typeof consent?.at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(consent.at)
        ? Date.parse(consent.at)
        : Number.NaN;
    const now = Date.now();
    if (
      !consent ||
      typeof consent !== "object" ||
      Array.isArray(consent) ||
      consent.accepted !== true ||
      consent.version !== CONSENT_VERSION ||
      !Number.isFinite(consentTime) ||
      consentTime > now + CONSENT_FUTURE_SKEW_MS ||
      consentTime < now - CONSENT_MAX_AGE_MS
    )
      apiError(400, "consent_invalid");
    consentAt = new Date(consentTime).toISOString();
    consentVersion = CONSENT_VERSION;
  }

  return {
    type,
    classifiedType,
    data: {
      name: boundedText(data.name, 200, "name"),
      email,
      phone: boundedText(data.phone, 80, "phone"),
      city: boundedText(data.city, 200, "city"),
      story: boundedText(data.story, 10000, "story"),
      maker: boundedText(data.maker, 1000, "maker"),
    },
    photoMeta: raw.photoMeta,
    consentAt,
    consentVersion,
  };
}

function normalizeContinuationMeta(raw, lead) {
  const classifiedType = boundedText(
    raw.classifiedType ?? lead.classified_type,
    40,
    "classified_type",
  );
  if (classifiedType && !ALLOWED_INSTRUMENT_TYPES.has(classifiedType))
    apiError(400, "classified_type_invalid");
  const data = raw.data && typeof raw.data === "object" ? raw.data : {};
  return {
    type: lead.type || "other",
    classifiedType,
    data: {
      story: boundedText(data.story ?? lead.story, 10000, "story"),
      maker: boundedText(data.maker ?? lead.maker, 1000, "maker"),
    },
    photoMeta: raw.photoMeta,
  };
}

function redactContactDetails(value) {
  return String(value || "")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gu, "[E-Mail entfernt]")
    .replace(/(?:\+?\d[\d\s()./-]{7,}\d)/gu, "[Telefonnummer entfernt]");
}

function aiSafeMeta(meta) {
  const previous = meta.previousAnalysis || {};
  return {
    type: effectiveType(meta),
    classifiedType: meta.classifiedType || "",
    data: {
      story: redactContactDetails(meta.data?.story).slice(0, 10000),
      maker: redactContactDetails(meta.data?.maker).slice(0, 1000),
    },
    previousAnalysis: meta.previousAnalysis
      ? {
          lead_class: ["A", "B", "C"].includes(previous.lead_class)
            ? previous.lead_class
            : undefined,
          notable: Boolean(previous.notable),
          title: redactContactDetails(previous.title).slice(0, 300),
          summary: redactContactDetails(previous.summary).slice(0, 2000),
          signals: Array.isArray(previous.signals)
            ? previous.signals
                .slice(0, 12)
                .map((value) => redactContactDetails(value).slice(0, 300))
            : [],
        }
      : undefined,
  };
}

function sortedFiles(formData, prefix) {
  const entries = [...formData.entries()].filter(
    ([key, value]) => key.startsWith(prefix) && value instanceof File,
  );
  const seen = new Set();
  for (const [key] of entries) {
    const suffix = key.slice(prefix.length);
    if (!/^\d{1,2}$/u.test(suffix) || seen.has(suffix))
      apiError(400, "photo_field_invalid");
    seen.add(suffix);
  }
  return entries.sort(
    (a, b) => Number(a[0].slice(prefix.length)) - Number(b[0].slice(prefix.length)),
  );
}

async function continuationOperationHash(request, leadId, meta, files) {
  const clientKey = (request.headers.get("Idempotency-Key") || "").trim();
  if (clientKey && !/^[A-Za-z0-9._:-]{16,128}$/u.test(clientKey))
    apiError(400, "idempotency_key_invalid");
  if (clientKey)
    return {
      hash: await sha256(`lead-continuation\n${leadId}\n${clientKey}`),
      legacy: false,
    };

  // Cached clients from before the Idempotency-Key rollout remain safe: their
  // operation key is derived from the normalized mutation and original bytes.
  const fileFingerprints = [];
  for (const [field, file] of files)
    fileFingerprints.push({
      field,
      name: file.name || "",
      type: file.type,
      size: file.size,
      digest: await sha256Bytes(await file.arrayBuffer()),
    });
  return {
    hash: await sha256(
      `lead-continuation-legacy\n${leadId}\n${JSON.stringify({
        classifiedType: meta.classifiedType,
        data: meta.data,
        photoMeta: meta.photoMeta || [],
        files: fileFingerprints,
      })}`,
    ),
    legacy: true,
  };
}

async function legacyInitialOperationHash(request, meta, files) {
  const fingerprints = [];
  for (const [field, file] of files) {
    fingerprints.push({
      field,
      name: file.name || "",
      type: file.type,
      size: file.size,
      digest: await sha256Bytes(await file.arrayBuffer()),
    });
  }
  return sha256(
    `lead-create-legacy\n${request.headers.get("Origin") || ""}\n${JSON.stringify({
      type: meta.type,
      classifiedType: meta.classifiedType,
      data: meta.data,
      photoMeta: meta.photoMeta || [],
      files: fingerprints,
    })}`,
  );
}

async function validatePhotoBundle(
  files,
  thumbnailFiles,
  aiFiles,
  currentPhotoCount = 0,
) {
  if (
    files.length > MAX_PHOTOS_PER_REQUEST ||
    currentPhotoCount + files.length > MAX_PHOTOS_PER_LEAD
  )
    apiError(400, "too_many_photos");
  if (thumbnailFiles.length > files.length || aiFiles.length > files.length)
    apiError(400, "photo_variants_invalid");
  const originalIndexes = new Set(
    files.map(([key]) => key.slice("photo_".length)),
  );
  if (
    [...thumbnailFiles, ...aiFiles].some(([key]) => {
      const prefix = key.startsWith("thumb_") ? "thumb_" : "ai_";
      return !originalIndexes.has(key.slice(prefix.length));
    })
  )
    apiError(400, "photo_variants_invalid");

  let originalBytes = 0;
  let thumbnailBytes = 0;
  let aiBytes = 0;
  for (const [, file] of files) {
    await validateImageFile(file, MAX_ORIGINAL_BYTES, "invalid_photo");
    originalBytes += file.size;
  }
  for (const [, file] of thumbnailFiles) {
    await validateImageFile(file, MAX_THUMBNAIL_BYTES, "invalid_thumbnail");
    thumbnailBytes += file.size;
  }
  for (const [, file] of aiFiles) {
    await validateImageFile(file, MAX_AI_IMAGE_BYTES, "invalid_ai_image");
    aiBytes += file.size;
  }
  if (originalBytes > 32 * 1024 * 1024) apiError(413, "photos_too_large");
  if (thumbnailBytes > 5 * 1024 * 1024)
    apiError(413, "thumbnails_too_large");
  if (aiBytes > 8 * 1024 * 1024) apiError(413, "ai_images_too_large");
}

function photoDescriptors(
  leadId,
  files,
  thumbnailFiles,
  photoMeta,
  created,
  { deterministic = false, operationKeyHash = null } = {},
) {
  const thumbnailsByIndex = new Map(
    thumbnailFiles.map(([key, file]) => [key.slice("thumb_".length), file]),
  );
  return files.map(([fieldName, file], index) => {
    const pid = operationKeyHash
      ? `${leadId}-C${operationKeyHash.slice(0, 20)}-P${index + 1}`
      : deterministic
        ? `${leadId}-P${index + 1}`
        : id("P");
    const safeName = (file.name || "photo.jpg")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120);
    const objectKey = `${leadId}/${pid}-${safeName || "photo.jpg"}`;
    const thumbnail = thumbnailsByIndex.get(
      fieldName.slice("photo_".length),
    );
    const thumbnailKey = thumbnail
      ? `${leadId}/${pid}-thumb.${
          thumbnail.type === "image/png"
            ? "png"
            : thumbnail.type === "image/webp"
              ? "webp"
              : "jpg"
        }`
      : null;
    return {
      pid,
      file,
      thumbnail,
      objectKey,
      thumbnailKey,
      kind: photoMeta[index]?.kind || "",
      label: photoMeta[index]?.label || "",
      created,
      operationKeyHash,
    };
  });
}

async function reservePhotoRows(env, leadId, descriptors) {
  if (!descriptors.length) return;
  const ids = descriptors.map((descriptor) => descriptor.pid);
  const placeholders = ids.map(() => "?").join(",");
  const operationKeyHash = descriptors[0].operationKeyHash;
  const operationRow = operationKeyHash
    ? await env.LEADS.prepare(
        `SELECT COUNT(*) AS count FROM photos
         WHERE lead_id=? AND operation_key_hash=?`,
      )
        .bind(leadId, operationKeyHash)
        .first()
    : await env.LEADS.prepare(
        `SELECT COUNT(*) AS count FROM photos
         WHERE lead_id=? AND operation_key_hash IS NULL`,
      )
        .bind(leadId)
        .first();
  const operationCount = Number(operationRow?.count || 0);
  if (operationCount && operationCount !== descriptors.length)
    apiError(409, "idempotency_payload_conflict");
  const { results: existing = [] } = await env.LEADS.prepare(
    `SELECT id FROM photos WHERE lead_id=? AND id IN (${placeholders})`,
  )
    .bind(leadId, ...ids)
    .all();
  if (existing.length && existing.length !== descriptors.length)
    apiError(409, "idempotency_payload_conflict");
  if (existing.length === descriptors.length) return;

  const first = descriptors[0];
  const statements = [
    env.LEADS.prepare(
      `INSERT INTO photos
        (id,lead_id,object_key,thumbnail_key,kind,label,content_type,created_at,
         storage_status,storage_error,operation_key_hash)
       SELECT ?,?,?,?,?,?,?,?,'pending','',?
       FROM leads l
       WHERE l.id=? AND l.deleted_at IS NULL
         AND (SELECT COUNT(*) FROM photos WHERE lead_id=?) + ? <= ?
       ON CONFLICT(id) DO NOTHING`,
    ).bind(
      first.pid,
      leadId,
      first.objectKey,
      first.thumbnailKey,
      first.kind,
      first.label,
      first.file.type,
      first.created,
      first.operationKeyHash,
      leadId,
      leadId,
      descriptors.length,
      MAX_PHOTOS_PER_LEAD,
    ),
  ];
  for (const descriptor of descriptors.slice(1)) {
    statements.push(
      env.LEADS.prepare(
        `INSERT INTO photos
          (id,lead_id,object_key,thumbnail_key,kind,label,content_type,created_at,
           storage_status,storage_error,operation_key_hash)
         SELECT ?,?,?,?,?,?,?,?,'pending','',?
         FROM leads l
         WHERE l.id=? AND l.deleted_at IS NULL
           AND EXISTS (
             SELECT 1 FROM photos p
             WHERE p.id=? AND p.lead_id=? AND p.created_at=?
           )
         ON CONFLICT(id) DO NOTHING`,
      ).bind(
        descriptor.pid,
        leadId,
        descriptor.objectKey,
        descriptor.thumbnailKey,
        descriptor.kind,
        descriptor.label,
        descriptor.file.type,
        descriptor.created,
        descriptor.operationKeyHash,
        leadId,
        first.pid,
        leadId,
        first.created,
      ),
    );
  }
  await env.LEADS.batch(statements);
  const row = await env.LEADS.prepare(
    `SELECT
       (SELECT COUNT(*) FROM photos WHERE lead_id=? AND id IN (${placeholders})) AS reserved,
       (SELECT COUNT(*) FROM leads WHERE id=? AND deleted_at IS NULL) AS active`,
  )
    .bind(leadId, ...ids, leadId)
    .first();
  if (!Number(row?.active || 0)) apiError(410, "lead_deleted");
  if (Number(row?.reserved || 0) !== descriptors.length)
    apiError(400, "too_many_photos");
}

async function activeLeadExists(env, leadId) {
  const row = await env.LEADS.prepare(
    `SELECT COUNT(*) AS count FROM leads WHERE id=? AND deleted_at IS NULL`,
  )
    .bind(leadId)
    .first();
  return Number(row?.count || 0) > 0;
}

async function persistPhotos(
  env,
  leadId,
  files,
  thumbnailFiles,
  photoMeta,
  created,
  { deterministic = false, operationKeyHash = null } = {},
) {
  const descriptors = photoDescriptors(
    leadId,
    files,
    thumbnailFiles,
    photoMeta,
    created,
    { deterministic, operationKeyHash },
  );
  await reservePhotoRows(env, leadId, descriptors);
  const stored = [];
  for (const descriptor of descriptors) {
    const { pid, file, thumbnail } = descriptor;
    const row = await env.LEADS.prepare(
      `SELECT object_key,thumbnail_key,storage_status FROM photos WHERE id=? AND lead_id=?`,
    )
      .bind(pid, leadId)
      .first();
    if (!row) throw new Error("photo_journal_missing");
    if (row.storage_status === "ready") {
      stored.push({ id: pid, ready: true });
      continue;
    }
    try {
      await env.PHOTOS.put(row.object_key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
      if (thumbnail && row.thumbnail_key)
        await env.PHOTOS.put(row.thumbnail_key, thumbnail.stream(), {
          httpMetadata: { contentType: thumbnail.type },
        });
      const marked = await env.LEADS.prepare(
        `UPDATE photos SET storage_status='ready',storage_error=''
         WHERE id=? AND lead_id=? AND EXISTS (
           SELECT 1 FROM leads WHERE id=? AND deleted_at IS NULL
         )`,
      )
        .bind(pid, leadId, leadId)
        .run();
      if (!Number(marked.meta?.changes || 0)) {
        await env.LEADS.prepare(
          `UPDATE photos SET storage_status='failed',storage_error='lead_deleted'
           WHERE id=? AND lead_id=?`,
        )
          .bind(pid, leadId)
          .run();
        await queueObjectDeletions(env, leadId, [
          row.object_key,
          row.thumbnail_key,
        ]);
        await processDeletionQueue(env, [leadId], 10);
        stored.push({ id: pid, ready: false, deleted: true });
        continue;
      }
      stored.push({ id: pid, ready: true });
    } catch (error) {
      console.error("Photo storage failed", leadId, pid, error);
      try {
        await env.LEADS.prepare(
          `UPDATE photos SET storage_status='failed',storage_error=? WHERE id=?`,
        )
          .bind(String(error).slice(0, 1000), pid)
          .run();
      } catch (journalError) {
        console.error("Photo journal update failed", leadId, pid, journalError);
      }
      const deleted = !(await activeLeadExists(env, leadId));
      if (deleted) {
        await queueObjectDeletions(env, leadId, [
          row.object_key,
          row.thumbnail_key,
        ]);
        await processDeletionQueue(env, [leadId], 10);
      }
      stored.push({ id: pid, ready: false, deleted });
    }
  }
  return stored;
}

async function readyPhotoCount(env, leadId) {
  const row = await env.LEADS.prepare(
    `SELECT COUNT(*) AS count FROM photos
     WHERE lead_id=? AND storage_status IN ('ready','thumbnail_pending')`,
  )
    .bind(leadId)
    .first();
  return Number(row?.count || 0);
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

function fallbackAnalysis(meta, reason = "unavailable") {
  const type = effectiveType(meta);
  const priority = type === "double_bass" || type === "bow";
  return {
    lead_class: priority ? "A" : type === "guitar" || type === "other" ? "C" : "B",
    interest_score: priority ? 85 : type === "guitar" || type === "other" ? 10 : 45,
    confidence: 45,
    notable: ["estate", "unknown", "bow"].includes(type),
    summary: "Konservative Regelklassifizierung; persönliche Prüfung erforderlich.",
    title: type === "guitar" ? "Gitarre" : type || "Instrument",
    signals: [],
    analysis_source: "fallback",
    analysis_reason: reason,
  };
}

function normalizedAnalysis(value, meta, source = "openai") {
  const fallback = fallbackAnalysis(meta);
  const leadClass = ["A", "B", "C"].includes(value?.lead_class)
    ? value.lead_class
    : fallback.lead_class;
  const score = Number(value?.interest_score);
  const confidence = Number(value?.confidence);
  const signals = Array.isArray(value?.signals)
    ? value.signals
        .slice(0, 12)
        .map((signal) => boundedText(signal, 300, "ai_signal"))
    : [];
  return {
    lead_class: leadClass,
    interest_score: Number.isFinite(score)
      ? Math.max(0, Math.min(100, Math.round(score)))
      : fallback.interest_score,
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : fallback.confidence,
    notable: Boolean(value?.notable),
    title: boundedText(value?.title || fallback.title, 300, "ai_title"),
    summary: boundedText(value?.summary || fallback.summary, 2000, "ai_summary"),
    signals,
    analysis_source: source,
  };
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
  if (!r.ok)
    throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 500)}`);
  return r.json();
}

function openAIModel(env) {
  const configured =
    typeof env.OPENAI_MODEL === "string" ? env.OPENAI_MODEL.trim() : "";
  return /^[A-Za-z0-9._:-]{1,100}$/u.test(configured)
    ? configured
    : DEFAULT_OPENAI_MODEL;
}

function invalidPhotoCheckResponse() {
  apiError(502, "photo_check_invalid_response");
}

function parsePhotoCheckResult(response, mode) {
  const output = extractText(response);
  if (typeof output !== "string" || !output.trim())
    invalidPhotoCheckResponse();

  let result;
  try {
    result = JSON.parse(output);
  } catch {
    invalidPhotoCheckResponse();
  }
  if (!result || typeof result !== "object" || Array.isArray(result))
    invalidPhotoCheckResponse();
  const allowedKeys = new Set(
    mode === "identify"
      ? ["issue_code", "message", "detected_type"]
      : ["issue_code", "message"],
  );
  if (Object.keys(result).some((key) => !allowedKeys.has(key)))
    invalidPhotoCheckResponse();

  const issueCode = result.issue_code;
  if (typeof issueCode !== "string" || !PHOTO_ISSUE_CODE_SET.has(issueCode))
    invalidPhotoCheckResponse();

  if (typeof result.message !== "string") invalidPhotoCheckResponse();
  const message = result.message.replace(/\0/g, "").trim();
  if (!message || message.length > 500) invalidPhotoCheckResponse();

  let detectedType;
  if (mode === "identify") {
    detectedType = result.detected_type;
    if (
      typeof detectedType !== "string" ||
      !DETECTED_INSTRUMENT_TYPE_SET.has(detectedType)
    )
      invalidPhotoCheckResponse();
  }

  return {
    ok: issueCode === "none",
    issue_code: issueCode,
    message,
    ...(mode === "identify" && { detected_type: detectedType }),
  };
}

async function blobDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}`;
}

async function photoCheck(request, env) {
  requirePublicWriteOrigin(request, env);
  await enforceRateLimit(request, env, "photo-check", 20, 10 * 60);
  assertContentLength(request, MAX_PHOTO_CHECK_REQUEST_BYTES);
  const fd = await readMultipart(request, MAX_PHOTO_CHECK_REQUEST_BYTES);
  const image = fd.get("image");
  const expected = boundedText(fd.get("expected") || "Foto", 120, "expected");
  const instruction = boundedText(fd.get("instruction"), 500, "instruction");
  const mode = boundedText(fd.get("mode") || "quality", 20, "mode");
  if (!["quality", "identify"].includes(mode)) apiError(400, "mode_invalid");
  if (!(image instanceof File))
    return json({ error: "image missing" }, 400, request, env);
  await validateImageFile(image, MAX_PHOTO_CHECK_BYTES, "invalid_image");
  if (!env.OPENAI_API_KEY) apiError(503, "photo_check_unavailable");
  const dataUrl = await blobDataUrl(image);
  const properties = {
    issue_code: { type: "string", enum: PHOTO_ISSUE_CODES },
    message: { type: "string" },
  };
  const required = ["issue_code", "message"];
  if (mode === "identify") {
    properties.detected_type = {
      type: "string",
      enum: DETECTED_INSTRUMENT_TYPES,
    };
    required.push("detected_type");
  }
  const schema = {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
  const prompt =
    mode === "identify"
      ? `${PHOTO_PROMPT}\nZusätzlich ordne den Gegenstand grob ein. Wenn unsicher, detected_type=uncertain. Aufgabe: ${redactContactDetails(expected)}. ${redactContactDetails(instruction)}`
      : `${PHOTO_PROMPT}\nErwartetes Motiv: ${redactContactDetails(expected)}. Anweisung: ${redactContactDetails(instruction)}`;
  let response;
  try {
    response = await openai(env, {
      model: openAIModel(env),
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
  } catch (error) {
    console.error("Photo check unavailable", error);
    apiError(503, "photo_check_unavailable");
  }
  return json(parsePhotoCheckResult(response, mode), 200, request, env);
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
      analysis_source: "rule",
    };
  if (!env.OPENAI_API_KEY) return fallbackAnalysis(meta, "not_configured");
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
      text: `${LEAD_PROMPT}\nAnfrage: ${JSON.stringify(aiSafeMeta(meta))}`,
    },
  ];
  for (const image of smallImages.slice(0, 8))
    content.push({ type: "input_image", image_url: image, detail: "low" });
  const response = await openai(env, {
    model: openAIModel(env),
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
  return normalizedAnalysis(JSON.parse(extractText(response)), meta);
}

function makePayload(env, leadId, created, meta, ai, photoCount) {
  return {
    event: "lead.created",
    id: leadId,
    created_at: created,
    instrument_type: meta.type || "",
    classified_type: meta.classifiedType || "",
    ai_used: ai.analysis_source === "openai",
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
  requirePublicWriteOrigin(request, env);
  await enforceRateLimit(request, env, "lead-create", 5, 60 * 60);
  const clientKey = (request.headers.get("Idempotency-Key") || "").trim();
  if (clientKey && !/^[A-Za-z0-9._:-]{16,128}$/u.test(clientKey))
    apiError(400, "idempotency_key_invalid");
  const fd = await readMultipart(request, MAX_LEAD_REQUEST_BYTES);
  const created = new Date().toISOString();
  const rawMeta = parseJsonField(fd);
  const allowLegacy =
    !clientKey && rawMeta.consent === undefined && legacySubmissionAllowed(env);
  if (!clientKey && !allowLegacy)
    apiError(400, "idempotency_key_missing");
  const meta = normalizeInitialMeta(rawMeta, created, { allowLegacy });
  const files = sortedFiles(fd, "photo_");
  const thumbnailFiles = sortedFiles(fd, "thumb_");
  const aiFiles = sortedFiles(fd, "ai_");
  await validatePhotoBundle(files, thumbnailFiles, aiFiles);
  const photoMeta = normalizePhotoMeta(meta.photoMeta, files.length);
  const idempotencyHash = clientKey
    ? await sha256(clientKey)
    : await legacyInitialOperationHash(
        request,
        { ...meta, photoMeta },
        files,
      );

  let existing = await env.LEADS.prepare(
    `SELECT * FROM leads WHERE idempotency_key_hash=?`,
  )
    .bind(idempotencyHash)
    .first();
  const responseFor = async (lead, status, idempotent) => {
    const continuationToken = await createContinuationToken(env, lead.id);
    return json(
      {
        ...(status === 409 && {
          error: "operation_pending",
          retryable: true,
        }),
        id: lead.id,
        class: lead.lead_class || "C",
        notable: Boolean(lead.notable),
        review_url: reviewUrl(env, lead.id),
        continuation_token: continuationToken,
        continuation_available: Boolean(continuationToken),
        processing_status: lead.processing_status || "ready",
        idempotent,
      },
      status,
      request,
      env,
      status === 409 ? { "Retry-After": "2" } : {},
    );
  };
  if (existing) {
    const updatedAt = Date.parse(
      existing.processing_updated_at || existing.created_at || "",
    );
    const stalePending =
      existing.processing_status === "pending" &&
      (!Number.isFinite(updatedAt) || Date.now() - updatedAt > 2 * 60 * 1000);
    const retryable =
      ["failed", "partial"].includes(existing.processing_status) ||
      stalePending;
    if (!retryable)
      return responseFor(
        existing,
        existing.processing_status === "pending" ? 409 : 200,
        true,
      );
    const staleCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const claimed = await env.LEADS.prepare(
      `UPDATE leads
       SET processing_status='pending',processing_error='',processing_updated_at=?
       WHERE id=? AND deleted_at IS NULL AND (
         processing_status IN ('failed','partial') OR
         (processing_status='pending' AND
          COALESCE(processing_updated_at,created_at)<=?)
       )`,
    )
      .bind(created, existing.id, staleCutoff)
      .run();
    if (!Number(claimed.meta?.changes || 0)) {
      const current = await env.LEADS.prepare(`SELECT * FROM leads WHERE id=?`)
        .bind(existing.id)
        .first();
      if (!current || current.deleted_at) apiError(410, "lead_deleted");
      return responseFor(
        current,
        current.processing_status === "pending" ? 409 : 200,
        true,
      );
    }
  }

  const leadId = existing?.id || id();
  const fallback = fallbackAnalysis(meta, "pending");
  if (!existing) try {
    await env.LEADS.prepare(
      `INSERT INTO leads (
        id,created_at,type,classified_type,name,email,phone,city,story,maker,
        lead_class,interest_score,confidence,notable,summary,ai_json,photo_count,
        make_status,idempotency_key_hash,processing_status,processing_error,
        processing_updated_at,consent_at,consent_version
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        leadId,
        created,
        meta.type,
        meta.classifiedType,
        meta.data.name,
        meta.data.email,
        meta.data.phone,
        meta.data.city,
        meta.data.story,
        meta.data.maker,
        fallback.lead_class,
        fallback.interest_score,
        fallback.confidence,
        fallback.notable ? 1 : 0,
        fallback.summary,
        JSON.stringify(fallback),
        0,
        env.MAKE_WEBHOOK_URL ? "pending" : "disabled",
        idempotencyHash,
        "pending",
        "",
        created,
        meta.consentAt,
        meta.consentVersion,
      )
      .run();
  } catch (error) {
    existing = await env.LEADS.prepare(
      `SELECT * FROM leads WHERE idempotency_key_hash=?`,
    )
      .bind(idempotencyHash)
      .first();
    if (existing)
      return responseFor(
        existing,
        existing.processing_status === "pending" ? 409 : 200,
        true,
      );
    throw error;
  }

  try {
    const stored = await persistPhotos(
      env,
      leadId,
      files,
      thumbnailFiles,
      photoMeta,
      created,
      { deterministic: true },
    );
    const small = [];
    for (const [, file] of aiFiles.slice(0, MAX_PHOTOS_PER_REQUEST))
      small.push(await blobDataUrl(file));

    let ai;
    let analysisError = "";
    try {
      ai = await analyzeLead(env, meta, small);
    } catch (error) {
      console.error("Lead analysis failed", leadId, error);
      analysisError = `ai_failed: ${String(error).slice(0, 900)}`;
      ai = fallbackAnalysis(meta, "analysis_failed");
    }
    const photoCount = await readyPhotoCount(env, leadId);
    const photoFailure = stored.some((photo) => !photo.ready);
    const processingStatus = photoFailure ? "partial" : "ready";
    const processingError = [
      photoFailure ? "one_or_more_photos_failed" : "",
      analysisError,
    ]
      .filter(Boolean)
      .join("; ")
      .slice(0, 1000);
    const updated = await env.LEADS.prepare(
      `UPDATE leads SET
        lead_class=?,interest_score=?,confidence=?,notable=?,summary=?,ai_json=?,
        photo_count=?,processing_status=?,processing_error=?,processing_updated_at=?
       WHERE id=? AND deleted_at IS NULL`,
    )
      .bind(
        ai.lead_class,
        ai.interest_score,
        ai.confidence,
        ai.notable ? 1 : 0,
        ai.summary,
        JSON.stringify(ai),
        photoCount,
        processingStatus,
        processingError,
        new Date().toISOString(),
        leadId,
      )
      .run();
    if (!Number(updated.meta?.changes || 0)) apiError(410, "lead_deleted");
    if (photoFailure)
      return json(
        {
          error: "photo_storage_failed",
          id: leadId,
          retryable: true,
          processing_status: "partial",
        },
        503,
        request,
        env,
        { "Retry-After": "2" },
      );
    const payload = makePayload(env, leadId, created, meta, ai, photoCount);
    if (ctx?.waitUntil) ctx.waitUntil(notifyMake(env, payload));
    else await notifyMake(env, payload);
    return responseFor(
      {
        id: leadId,
        lead_class: ai.lead_class,
        notable: ai.notable,
        processing_status: processingStatus,
      },
      existing ? 200 : 201,
      Boolean(existing),
    );
  } catch (error) {
    console.error("Lead processing failed", leadId, error);
    try {
      await env.LEADS.prepare(
        `UPDATE leads SET processing_status='failed',processing_error=?,processing_updated_at=? WHERE id=?`,
      )
        .bind(
          String(error).slice(0, 1000),
          new Date().toISOString(),
          leadId,
        )
        .run();
    } catch (journalError) {
      console.error("Lead processing journal failed", leadId, journalError);
    }
    throw error;
  }
}

async function continueLead(request, leadId, env) {
  requirePublicWriteOrigin(request, env);
  await enforceRateLimit(request, env, "lead-continue", 30, 60 * 60);
  leadId = boundedText(leadId, 128, "lead_id", { required: true });
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!(await validContinuationToken(env, leadId, token)))
    return json({ error: "unauthorized" }, 401, request, env);

  const lead = await env.LEADS.prepare(
    `SELECT * FROM leads WHERE id=? AND deleted_at IS NULL`,
  )
    .bind(leadId)
    .first();
  if (!lead) return json({ error: "not_found" }, 404, request, env);

  const fd = await readMultipart(request, MAX_LEAD_REQUEST_BYTES);
  const meta = normalizeContinuationMeta(parseJsonField(fd), lead);
  const files = sortedFiles(fd, "photo_");
  const thumbnailFiles = sortedFiles(fd, "thumb_");
  const aiFiles = sortedFiles(fd, "ai_");
  await validatePhotoBundle(files, thumbnailFiles, aiFiles);
  const photoMeta = normalizePhotoMeta(meta.photoMeta, files.length);
  const operation = await continuationOperationHash(
    request,
    leadId,
    { ...meta, photoMeta },
    files,
  );
  const operationResponse = (payload, status = 200, idempotent = false) =>
    json(
      {
        ...payload,
        idempotent,
        legacy_idempotency: operation.legacy,
      },
      status,
      request,
      env,
      status === 409 ? { "Retry-After": "2" } : {},
    );
  let journal = await env.LEADS.prepare(
    `SELECT * FROM lead_continuations
     WHERE lead_id=? AND idempotency_key_hash=?`,
  )
    .bind(leadId, operation.hash)
    .first();
  if (journal?.status === "complete" && journal.response_json) {
    try {
      return operationResponse(JSON.parse(journal.response_json), 200, true);
    } catch {
      await env.LEADS.prepare(
        `UPDATE lead_continuations SET status='failed',last_error='invalid_response_json'
         WHERE lead_id=? AND idempotency_key_hash=? AND status='complete'`,
      )
        .bind(leadId, operation.hash)
        .run();
      journal.status = "failed";
    }
  }
  if (journal?.status === "pending") {
    const updatedAt = Date.parse(journal.updated_at || journal.created_at || "");
    if (Number.isFinite(updatedAt) && Date.now() - updatedAt <= 2 * 60 * 1000)
      return operationResponse(
        {
          ok: false,
          error: "operation_pending",
          retryable: true,
          id: leadId,
          photo_count: Number(lead.photo_count || 0),
          processing_status: "pending",
        },
        409,
        true,
      );
  }

  const classifiedType = meta.classifiedType;
  const story = meta.data.story;
  const maker = meta.data.maker;
  const created = new Date().toISOString();
  if (journal) {
    const staleCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const claimed = await env.LEADS.prepare(
      `UPDATE lead_continuations SET
        status='pending',updated_at=?,last_error='',response_json=NULL
       WHERE lead_id=? AND idempotency_key_hash=? AND (
         status='failed' OR (status='pending' AND updated_at<=?)
       )`,
    )
      .bind(created, leadId, operation.hash, staleCutoff)
      .run();
    if (!Number(claimed.meta?.changes || 0))
      return operationResponse(
        {
          ok: false,
          error: "operation_pending",
          retryable: true,
          id: leadId,
          photo_count: Number(lead.photo_count || 0),
          processing_status: "pending",
        },
        409,
        true,
      );
  } else {
    const insert = await env.LEADS.prepare(
      `INSERT INTO lead_continuations
        (lead_id,idempotency_key_hash,created_at,updated_at,status)
       VALUES (?,?,?,?,?)
       ON CONFLICT(lead_id,idempotency_key_hash) DO NOTHING`,
    )
      .bind(leadId, operation.hash, created, created, "pending")
      .run();
    if (Number(insert.meta?.changes || 0) === 0) {
      journal = await env.LEADS.prepare(
        `SELECT * FROM lead_continuations
         WHERE lead_id=? AND idempotency_key_hash=?`,
      )
        .bind(leadId, operation.hash)
        .first();
      if (journal?.status === "complete" && journal.response_json)
        return operationResponse(JSON.parse(journal.response_json), 200, true);
      return operationResponse(
        {
          ok: false,
          error: "operation_pending",
          retryable: true,
          id: leadId,
          photo_count: Number(lead.photo_count || 0),
          processing_status: "pending",
        },
        409,
        true,
      );
    }
  }

  let stored;
  try {
    stored = await persistPhotos(
      env,
      leadId,
      files,
      thumbnailFiles,
      photoMeta,
      created,
      { operationKeyHash: operation.hash },
    );
  } catch (error) {
    await env.LEADS.prepare(
      `UPDATE lead_continuations SET status='failed',updated_at=?,last_error=?
       WHERE lead_id=? AND idempotency_key_hash=?`,
    )
      .bind(
        new Date().toISOString(),
        String(error).slice(0, 1000),
        leadId,
        operation.hash,
      )
      .run();
    throw error;
  }

  let previousAnalysis = {};
  try {
    previousAnalysis = JSON.parse(lead.ai_json || "{}");
  } catch {}
  const analysisMeta = {
    type: lead.type || "",
    classifiedType,
    data: {
      story,
      maker,
    },
    previousAnalysis,
  };
  const small = [];
  for (const [, file] of aiFiles.slice(0, 8))
    small.push(await blobDataUrl(file));
  const photoCount = await readyPhotoCount(env, leadId);
  let ai = previousAnalysis;
  let analysisError = "";
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
      analysisError = `ai_failed: ${String(error).slice(0, 900)}`;
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
      analysis_source: "fallback",
    };
  }
  const photoFailure = stored.some((photo) => !photo.ready);
  const leadDeleted = stored.some((photo) => photo.deleted);
  const processingStatus = photoFailure ? "partial" : "ready";
  const processingError = [
    photoFailure ? "one_or_more_photos_failed" : "",
    analysisError,
  ]
    .filter(Boolean)
    .join("; ")
    .slice(0, 1000);
  const responsePayload = {
    ok: true,
    accepted: true,
    id: leadId,
    photo_count: photoCount,
    class: ai.lead_class,
    notable: ai.notable,
    processing_status: processingStatus,
  };
  const finished = new Date().toISOString();
  if (leadDeleted) {
    await env.LEADS.prepare(
      `UPDATE lead_continuations SET status='failed',updated_at=?,last_error='lead_deleted'
       WHERE lead_id=? AND idempotency_key_hash=?`,
    )
      .bind(finished, leadId, operation.hash)
      .run();
    apiError(410, "lead_deleted");
  }
  if (photoFailure) {
    const results = await env.LEADS.batch([
      env.LEADS.prepare(
        `UPDATE leads SET classified_type=?,story=?,maker=?,lead_class=?,interest_score=?,confidence=?,notable=?,summary=?,ai_json=?,photo_count=?,processing_status=?,processing_error=?,processing_updated_at=? WHERE id=? AND deleted_at IS NULL`,
      ).bind(
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
        processingStatus,
        processingError,
        finished,
        leadId,
      ),
      env.LEADS.prepare(
        `UPDATE lead_continuations SET status='failed',updated_at=?,last_error=?
         WHERE lead_id=? AND idempotency_key_hash=?`,
      ).bind(finished, processingError, leadId, operation.hash),
    ]);
    if (!Number(results[0]?.meta?.changes || 0)) apiError(410, "lead_deleted");
    apiError(503, "photo_storage_failed");
  }

  const results = await env.LEADS.batch([
    env.LEADS.prepare(
      `UPDATE leads SET classified_type=?,story=?,maker=?,lead_class=?,interest_score=?,confidence=?,notable=?,summary=?,ai_json=?,photo_count=?,processing_status=?,processing_error=?,processing_updated_at=? WHERE id=? AND deleted_at IS NULL`,
    ).bind(
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
      processingStatus,
      processingError,
      finished,
      leadId,
    ),
    env.LEADS.prepare(
      `UPDATE lead_continuations SET
        status='complete',updated_at=?,response_json=?,last_error=''
       WHERE lead_id=? AND idempotency_key_hash=?`,
    ).bind(
      finished,
      JSON.stringify(responsePayload),
      leadId,
      operation.hash,
    ),
  ]);
  if (!Number(results[0]?.meta?.changes || 0)) {
    await env.LEADS.prepare(
      `UPDATE lead_continuations SET status='failed',updated_at=?,last_error='lead_deleted'
       WHERE lead_id=? AND idempotency_key_hash=?`,
    )
      .bind(finished, leadId, operation.hash)
      .run();
    apiError(410, "lead_deleted");
  }

  return operationResponse(responsePayload, 200, false);
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

function analyticsPageGroup(path) {
  if (path === "/") return "home";
  if (path === "/instrument-verkaufen/") return "form";
  if (ANALYTICS_INSTRUMENT_PATHS.has(path)) return "instrument";
  if (ANALYTICS_STORY_PATHS.has(path)) return "story";
  const city = path.match(/^\/([a-z0-9-]+)\/$/)?.[1];
  if (city && ANALYTICS_CITY_PATHS.has(city)) return "city";
  return null;
}

function isLikelyBot(request) {
  if (request.cf?.botManagement?.verifiedBot) return true;
  const userAgent = request.headers.get("User-Agent") || "";
  return /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegrambot|discordbot/i.test(
    userAgent,
  );
}

function berlinDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Math.max(0, Math.min(23, Number(values.hour) || 0)),
  };
}

async function analyticsVisitorHash(request, env, eventDate) {
  const key = await continuationKey(env, ["sign"]);
  if (!key) return null;
  const forwarded = (request.headers.get("X-Forwarded-For") || "")
    .split(",")[0]
    .trim();
  const client =
    request.headers.get("CF-Connecting-IP") || forwarded || "unknown";
  const userAgent = (request.headers.get("User-Agent") || "unknown").slice(0, 300);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(
        `site-analytics-v1\n${eventDate}\n${client}\n${userAgent}`,
      ),
    ),
  );
  return base64Url(signature);
}

async function recordSitePageview(request, env) {
  requirePublicWriteOrigin(request, env);
  assertContentLength(request, 2048);
  if (isLikelyBot(request)) return json({ ok: true }, 202, request, env);
  await enforceRateLimit(request, env, "site-analytics", 180, 10 * 60);
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json"))
    apiError(415, "json_required");
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    apiError(400, "analytics_event_invalid");
  const pagePath = boundedText(body.page_path, 140, "analytics_page_path", {
    required: true,
  });
  const pageGroup = analyticsPageGroup(pagePath);
  if (!pageGroup) apiError(400, "analytics_page_invalid");
  const sourceGroup = boundedText(
    body.source_group || "unknown",
    30,
    "analytics_source_group",
  );
  const deviceType = boundedText(
    body.device_type || "unknown",
    20,
    "analytics_device_type",
  );
  if (!ANALYTICS_SOURCE_GROUPS.has(sourceGroup))
    apiError(400, "analytics_source_group_invalid");
  if (!FUNNEL_DEVICE_TYPES.has(deviceType))
    apiError(400, "analytics_device_type_invalid");

  const now = new Date();
  const updatedAt = now.toISOString();
  const { date: eventDate, hour } = berlinDateParts(now);
  const countryRaw = String(request.cf?.country || "XX").toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : "XX";
  const visitorHash = await analyticsVisitorHash(request, env, eventDate);
  let firstVisit = false;
  if (visitorHash) {
    const unique = await env.LEADS.prepare(
      `INSERT OR IGNORE INTO site_visitor_uniques
        (event_date,visitor_hash,created_at) VALUES (?,?,?)`,
    )
      .bind(eventDate, visitorHash, updatedAt)
      .run();
    firstVisit = Number(unique?.meta?.changes || 0) > 0;
  }

  const statements = [
    env.LEADS.prepare(
      `INSERT INTO site_pageviews_daily
        (event_date,hour_of_day,page_path,page_group,source_group,device_type,country_code,view_count,updated_at)
       VALUES (?,?,?,?,?,?,?,1,?)
       ON CONFLICT(event_date,hour_of_day,page_path,source_group,device_type,country_code)
       DO UPDATE SET view_count=site_pageviews_daily.view_count+1,
                     updated_at=excluded.updated_at`,
    ).bind(
      eventDate,
      hour,
      pagePath,
      pageGroup,
      sourceGroup,
      deviceType,
      countryCode,
      updatedAt,
    ),
  ];
  if (firstVisit) {
    statements.push(
      env.LEADS.prepare(
        `INSERT INTO site_visitors_daily
          (event_date,entry_path,entry_group,source_group,device_type,country_code,visitor_count,updated_at)
         VALUES (?,?,?,?,?,?,1,?)
         ON CONFLICT(event_date,entry_path,source_group,device_type,country_code)
         DO UPDATE SET visitor_count=site_visitors_daily.visitor_count+1,
                       updated_at=excluded.updated_at`,
      ).bind(
        eventDate,
        pagePath,
        pageGroup,
        sourceGroup,
        deviceType,
        countryCode,
        updatedAt,
      ),
    );
  }
  await env.LEADS.batch(statements);
  return json({ ok: true }, 202, request, env);
}

async function recordFunnelEvent(request, env) {
  requirePublicWriteOrigin(request, env);
  assertContentLength(request, 2048);
  await enforceRateLimit(request, env, "funnel", 120, 10 * 60);
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().startsWith("application/json"))
    apiError(415, "json_required");
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    apiError(400, "funnel_event_invalid");
  const event = boundedText(body.event, 60, "funnel_event", {
    required: true,
  });
  const instrumentType = boundedText(
    body.instrument_type || "unselected",
    40,
    "funnel_instrument_type",
  );
  const deviceType = boundedText(
    body.device_type || "unknown",
    20,
    "funnel_device_type",
  );
  const entryPage = boundedText(
    body.entry_page || "unknown",
    30,
    "funnel_entry_page",
  );
  const sourceGroup = boundedText(
    body.source_group || "unknown",
    30,
    "funnel_source_group",
  );
  if (!FUNNEL_EVENTS.has(event)) apiError(400, "funnel_event_invalid");
  if (!FUNNEL_INSTRUMENT_TYPES.has(instrumentType))
    apiError(400, "funnel_instrument_type_invalid");
  if (!FUNNEL_DEVICE_TYPES.has(deviceType))
    apiError(400, "funnel_device_type_invalid");
  if (!FUNNEL_ENTRY_PAGES.has(entryPage))
    apiError(400, "funnel_entry_page_invalid");
  if (!FUNNEL_SOURCE_GROUPS.has(sourceGroup))
    apiError(400, "funnel_source_group_invalid");

  const now = new Date();
  const updatedAt = now.toISOString();
  const eventDate = berlinDateParts(now).date;
  const breakdownStatement = (name, value) =>
    env.LEADS.prepare(
      `INSERT INTO funnel_breakdowns_daily
        (event_date,event_name,instrument_type,breakdown_name,breakdown_value,event_count,updated_at)
       VALUES (?,?,?,?,?,1,?)
       ON CONFLICT(event_date,event_name,instrument_type,breakdown_name,breakdown_value)
       DO UPDATE SET
         event_count=funnel_breakdowns_daily.event_count+1,
         updated_at=excluded.updated_at`,
    ).bind(eventDate, event, instrumentType, name, value, updatedAt);
  await env.LEADS.batch([
    env.LEADS.prepare(
      `INSERT INTO funnel_daily
        (event_date,event_name,instrument_type,device_type,event_count,updated_at)
       VALUES (?,?,?,?,1,?)
       ON CONFLICT(event_date,event_name,instrument_type,device_type)
       DO UPDATE SET
         event_count=funnel_daily.event_count+1,
         updated_at=excluded.updated_at`,
    ).bind(eventDate, event, instrumentType, deviceType, updatedAt),
    breakdownStatement("entry_page", entryPage),
    breakdownStatement("source_group", sourceGroup),
  ]);
  return json({ ok: true }, 202, request, env);
}

function emptyFunnelCounts() {
  return Object.fromEntries([...FUNNEL_EVENTS].map((event) => [event, 0]));
}

async function reviewFunnel(request, env) {
  if (!authorized(request, env)) return reviewAuthError(request, env);
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const to = berlinDateParts().date;
  const start = new Date(`${to}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const from = start.toISOString().slice(0, 10);
  const { results = [] } = await env.LEADS.prepare(
    `SELECT event_name,instrument_type,device_type,SUM(event_count) AS count
     FROM funnel_daily
     WHERE event_date>=? AND event_date<=?
     GROUP BY event_name,instrument_type,device_type`,
  )
    .bind(from, to)
    .all();

  const totals = emptyFunnelCounts();
  const byType = {};
  const byDevice = {};
  const byDeviceType = {};
  for (const row of results) {
    if (!FUNNEL_EVENTS.has(row.event_name)) continue;
    const count = Number(row.count || 0);
    totals[row.event_name] += count;
    byType[row.instrument_type] ||= emptyFunnelCounts();
    byType[row.instrument_type][row.event_name] += count;
    byDevice[row.device_type] ||= emptyFunnelCounts();
    byDevice[row.device_type][row.event_name] += count;
    byDeviceType[row.instrument_type] ||= {};
    byDeviceType[row.instrument_type][row.device_type] ||= emptyFunnelCounts();
    byDeviceType[row.instrument_type][row.device_type][row.event_name] += count;
  }

  const { results: breakdownRows = [] } = await env.LEADS.prepare(
    `SELECT event_name,instrument_type,breakdown_name,breakdown_value,
            SUM(event_count) AS count
     FROM funnel_breakdowns_daily
     WHERE event_date>=? AND event_date<=?
     GROUP BY event_name,instrument_type,breakdown_name,breakdown_value`,
  )
    .bind(from, to)
    .all();
  const breakdowns = {};
  const breakdownsByType = {};
  for (const row of breakdownRows) {
    if (!FUNNEL_EVENTS.has(row.event_name)) continue;
    const count = Number(row.count || 0);
    breakdowns[row.breakdown_name] ||= {};
    breakdowns[row.breakdown_name][row.breakdown_value] ||= emptyFunnelCounts();
    breakdowns[row.breakdown_name][row.breakdown_value][row.event_name] += count;
    breakdownsByType[row.instrument_type] ||= {};
    breakdownsByType[row.instrument_type][row.breakdown_name] ||= {};
    breakdownsByType[row.instrument_type][row.breakdown_name][row.breakdown_value] ||=
      emptyFunnelCounts();
    breakdownsByType[row.instrument_type][row.breakdown_name][row.breakdown_value][
      row.event_name
    ] += count;
  }

  return json(
    {
      range: { days, from, to },
      events: {
        steps: FUNNEL_STEP_EVENTS,
        photos: FUNNEL_PHOTO_EVENTS,
        diagnostics: FUNNEL_DIAGNOSTIC_EVENTS,
        friction: FUNNEL_FRICTION_EVENTS,
      },
      totals,
      by_type: byType,
      by_device: byDevice,
      by_device_type: byDeviceType,
      breakdowns,
      breakdowns_by_type: breakdownsByType,
    },
    200,
    request,
    env,
  );
}

function mergeAnalyticsBreakdown(viewRows, visitorRows, keyName) {
  const merged = new Map();
  for (const row of viewRows) {
    const key = String(row[keyName] || "unknown");
    merged.set(key, {
      key,
      views: Number(row.count || 0),
      visitors: 0,
    });
  }
  for (const row of visitorRows) {
    const key = String(row[keyName] || "unknown");
    const item = merged.get(key) || { key, views: 0, visitors: 0 };
    item.visitors += Number(row.count || 0);
    merged.set(key, item);
  }
  return [...merged.values()].sort(
    (a, b) => b.visitors - a.visitors || b.views - a.views,
  );
}

async function reviewSiteAnalytics(request, env) {
  if (!authorized(request, env)) return reviewAuthError(request, env);
  const url = new URL(request.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const today = berlinDateParts().date;
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const from = start.toISOString().slice(0, 10);
  const to = today;

  const query = (sql) => env.LEADS.prepare(sql).bind(from, to).all();
  const [
    viewsByDayResult,
    visitorsByDayResult,
    leadsByDayResult,
    pagesResult,
    entriesResult,
    viewSourcesResult,
    visitorSourcesResult,
    viewDevicesResult,
    visitorDevicesResult,
    viewCountriesResult,
    visitorCountriesResult,
    hoursResult,
    groupsResult,
  ] = await Promise.all([
    query(
      `SELECT event_date,SUM(view_count) AS count
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY event_date`,
    ),
    query(
      `SELECT event_date,SUM(visitor_count) AS count
       FROM site_visitors_daily WHERE event_date>=? AND event_date<=?
       GROUP BY event_date`,
    ),
    query(
      `SELECT event_date,SUM(event_count) AS count
       FROM funnel_daily
       WHERE event_date>=? AND event_date<=? AND event_name='lead_saved'
       GROUP BY event_date`,
    ),
    query(
      `SELECT page_path,page_group,SUM(view_count) AS views
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY page_path,page_group ORDER BY views DESC LIMIT 20`,
    ),
    query(
      `SELECT entry_path,entry_group,SUM(visitor_count) AS visitors
       FROM site_visitors_daily WHERE event_date>=? AND event_date<=?
       GROUP BY entry_path,entry_group ORDER BY visitors DESC LIMIT 20`,
    ),
    query(
      `SELECT source_group,SUM(view_count) AS count
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY source_group`,
    ),
    query(
      `SELECT source_group,SUM(visitor_count) AS count
       FROM site_visitors_daily WHERE event_date>=? AND event_date<=?
       GROUP BY source_group`,
    ),
    query(
      `SELECT device_type,SUM(view_count) AS count
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY device_type`,
    ),
    query(
      `SELECT device_type,SUM(visitor_count) AS count
       FROM site_visitors_daily WHERE event_date>=? AND event_date<=?
       GROUP BY device_type`,
    ),
    query(
      `SELECT country_code,SUM(view_count) AS count
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY country_code`,
    ),
    query(
      `SELECT country_code,SUM(visitor_count) AS count
       FROM site_visitors_daily WHERE event_date>=? AND event_date<=?
       GROUP BY country_code`,
    ),
    query(
      `SELECT hour_of_day,SUM(view_count) AS views
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY hour_of_day ORDER BY hour_of_day`,
    ),
    query(
      `SELECT page_group,SUM(view_count) AS views
       FROM site_pageviews_daily WHERE event_date>=? AND event_date<=?
       GROUP BY page_group ORDER BY views DESC`,
    ),
  ]);

  const dateMap = new Map();
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(`${from}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    dateMap.set(key, { date: key, views: 0, visitors: 0, leads: 0 });
  }
  for (const row of viewsByDayResult.results || [])
    if (dateMap.has(row.event_date))
      dateMap.get(row.event_date).views = Number(row.count || 0);
  for (const row of visitorsByDayResult.results || [])
    if (dateMap.has(row.event_date))
      dateMap.get(row.event_date).visitors = Number(row.count || 0);
  for (const row of leadsByDayResult.results || [])
    if (dateMap.has(row.event_date))
      dateMap.get(row.event_date).leads = Number(row.count || 0);
  const timeline = [...dateMap.values()];
  const totals = timeline.reduce(
    (sum, row) => ({
      views: sum.views + row.views,
      visitors: sum.visitors + row.visitors,
      leads: sum.leads + row.leads,
    }),
    { views: 0, visitors: 0, leads: 0 },
  );

  return json(
    {
      range: { days, from, to },
      totals,
      timeline,
      pages: (pagesResult.results || []).map((row) => ({
        path: row.page_path,
        group: row.page_group,
        views: Number(row.views || 0),
      })),
      entries: (entriesResult.results || []).map((row) => ({
        path: row.entry_path,
        group: row.entry_group,
        visitors: Number(row.visitors || 0),
      })),
      sources: mergeAnalyticsBreakdown(
        viewSourcesResult.results || [],
        visitorSourcesResult.results || [],
        "source_group",
      ),
      devices: mergeAnalyticsBreakdown(
        viewDevicesResult.results || [],
        visitorDevicesResult.results || [],
        "device_type",
      ),
      countries: mergeAnalyticsBreakdown(
        viewCountriesResult.results || [],
        visitorCountriesResult.results || [],
        "country_code",
      ),
      hours: (hoursResult.results || []).map((row) => ({
        hour: Number(row.hour_of_day || 0),
        views: Number(row.views || 0),
      })),
      page_groups: (groupsResult.results || []).map((row) => ({
        key: row.page_group,
        views: Number(row.views || 0),
      })),
    },
    200,
    request,
    env,
  );
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

  const conditions = ["l.deleted_at IS NULL"];
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
            AND COALESCE(p.storage_status, 'ready') IN ('ready','thumbnail_pending')
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
      WHERE deleted_at IS NULL
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
  const l = await env.LEADS.prepare(
    `SELECT * FROM leads WHERE id=? AND deleted_at IS NULL`,
  )
    .bind(leadId)
    .first();
  if (!l) return json({ error: "not_found" }, 404, request, env);
  const { results: photos } = await env.LEADS.prepare(
    `SELECT id,kind,label,content_type,created_at,
      CASE WHEN thumbnail_key IS NOT NULL THEN 1 ELSE 0 END AS has_thumbnail
      FROM photos WHERE lead_id=? AND
        COALESCE(storage_status, 'ready') IN ('ready','thumbnail_pending')
      ORDER BY created_at, id`,
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
  const result = await env.LEADS.prepare(
    `UPDATE leads SET status=? WHERE id=? AND deleted_at IS NULL`,
  )
    .bind(body.status, leadId)
    .run();
  if (!Number(result.meta?.changes || 0))
    return json({ error: "not_found" }, 404, request, env);
  return json({ ok: true, status: body.status }, 200, request, env);
}

function objectDeletionStatement(env, { objectKey, leadId }, created) {
  return env.LEADS.prepare(
    `INSERT INTO object_deletions
      (object_key,lead_id,created_at,next_attempt_at)
     VALUES (?,?,?,?)
     ON CONFLICT(object_key) DO UPDATE SET
       lead_id=excluded.lead_id,
       completed_at=NULL,
       last_error='',
       attempts=object_deletions.attempts+1,
       next_attempt_at=excluded.next_attempt_at`,
  ).bind(objectKey, leadId, created, created);
}

async function queueObjectDeletionRows(env, objects, created = new Date().toISOString()) {
  const unique = [
    ...new Map(
      objects
        .filter(({ objectKey, leadId }) => objectKey && leadId)
        .map((item) => [`${item.leadId}\n${item.objectKey}`, item]),
    ).values(),
  ];
  const statements = unique.map((item) =>
    objectDeletionStatement(env, item, created),
  );
  for (let index = 0; index < statements.length; index += 80)
    await env.LEADS.batch(statements.slice(index, index + 80));
}

async function queueObjectDeletions(env, leadId, objectKeys) {
  // A very late R2 put can finish after stale-upload maintenance finalized the
  // original tombstone. Recreate a PII-free deletion anchor so that even a
  // failed compensating delete remains autonomously retryable.
  await env.LEADS.prepare(
    `INSERT INTO leads
      (id,created_at,status,processing_status,processing_error,deleted_at,deletion_status)
     VALUES (?,?,'archived','failed','late_deleted_upload',?,'pending')
     ON CONFLICT(id) DO NOTHING`,
  )
    .bind(leadId, new Date().toISOString(), new Date().toISOString())
    .run();
  await queueObjectDeletionRows(
    env,
    objectKeys.filter(Boolean).map((objectKey) => ({ objectKey, leadId })),
  );
}

async function finalizeTombstones(env, leadIds) {
  for (const leadId of [...new Set(leadIds)]) {
    const row = await env.LEADS.prepare(
      `SELECT
        l.deletion_status,
        (SELECT COUNT(*) FROM object_deletions d
          WHERE d.lead_id=l.id AND d.completed_at IS NULL) AS pending,
        (SELECT COUNT(*) FROM photos p
          WHERE p.lead_id=l.id AND p.storage_status IN
            ('pending','thumbnail_pending')) AS in_flight
       FROM leads l WHERE l.id=? AND l.deleted_at IS NOT NULL`,
    )
      .bind(leadId)
      .first();
    if (
      !row ||
      Number(row.pending || 0) > 0 ||
      Number(row.in_flight || 0) > 0
    )
      continue;
    await env.LEADS.batch([
      env.LEADS.prepare(`DELETE FROM photos WHERE lead_id=?`).bind(leadId),
      env.LEADS.prepare(`DELETE FROM lead_continuations WHERE lead_id=?`).bind(
        leadId,
      ),
      env.LEADS.prepare(`DELETE FROM object_deletions WHERE lead_id=?`).bind(
        leadId,
      ),
      env.LEADS.prepare(`DELETE FROM leads WHERE id=?`).bind(leadId),
    ]);
  }
}

async function processDeletionQueue(env, leadIds = [], limit = 50) {
  const ids = [...new Set(leadIds)].slice(0, 100);
  const idWhere = ids.length
    ? `AND d.lead_id IN (${ids.map(() => "?").join(",")})`
    : "";
  const now = new Date().toISOString();
  const { results = [] } = await env.LEADS.prepare(
    `SELECT d.id,d.object_key,d.lead_id,d.attempts
     FROM object_deletions d
     INNER JOIN leads l ON l.id=d.lead_id
     WHERE d.completed_at IS NULL AND d.next_attempt_at<=? ${idWhere}
       AND (
         l.deleted_at IS NOT NULL OR NOT EXISTS (
           SELECT 1 FROM photos p
           WHERE p.lead_id=d.lead_id AND
             (p.object_key=d.object_key OR p.thumbnail_key=d.object_key)
         )
       )
     ORDER BY d.next_attempt_at,d.id
     LIMIT ?`,
  )
    .bind(now, ...ids, Math.max(1, Math.min(100, limit)))
    .all();

  const outcomes = await Promise.all(
    results.map(async (row) => {
      try {
        await env.PHOTOS.delete(row.object_key);
        return { row, ok: true };
      } catch (error) {
        console.error("R2 delete failed", row.lead_id, row.object_key, error);
        return { row, ok: false, error };
      }
    }),
  );
  const updates = outcomes.map(({ row, ok, error }) => {
    if (ok)
      return env.LEADS.prepare(
        `UPDATE object_deletions
         SET completed_at=?,attempts=attempts+1,last_error=''
         WHERE id=? AND completed_at IS NULL AND attempts=?`,
      ).bind(new Date().toISOString(), row.id, Number(row.attempts || 0));
    const attempts = Number(row.attempts || 0) + 1;
    const delaySeconds = Math.min(24 * 60 * 60, 60 * 2 ** Math.min(10, attempts));
    const nextAttempt = new Date(Date.now() + delaySeconds * 1000).toISOString();
    return env.LEADS.prepare(
      `UPDATE object_deletions
       SET attempts=attempts+1,last_error=?,next_attempt_at=?
       WHERE id=? AND completed_at IS NULL AND attempts=?`,
    ).bind(
      String(error).slice(0, 1000),
      nextAttempt,
      row.id,
      Number(row.attempts || 0),
    );
  });
  if (updates.length) await env.LEADS.batch(updates);
  await finalizeTombstones(env, [
    ...ids,
    ...results.map((row) => row.lead_id),
  ]);
}

async function retryPendingDeletions(env) {
  const now = new Date().toISOString();
  const { results = [] } = await env.LEADS.prepare(
    `SELECT DISTINCT d.lead_id
     FROM object_deletions d
     INNER JOIN leads l ON l.id=d.lead_id
     WHERE d.completed_at IS NULL AND d.next_attempt_at<=?
       AND (
         l.deleted_at IS NOT NULL OR NOT EXISTS (
           SELECT 1 FROM photos p
           WHERE p.lead_id=d.lead_id AND
             (p.object_key=d.object_key OR p.thumbnail_key=d.object_key)
         )
       )
     ORDER BY d.next_attempt_at
     LIMIT 10`,
  )
    .bind(now)
    .all();
  if (results.length)
    await processDeletionQueue(
      env,
      results.map((row) => row.lead_id),
      50,
    );
}

async function recoverStaleTombstoneUploads(env) {
  const cutoff = new Date(Date.now() - STALE_UPLOAD_MS).toISOString();
  const { results = [] } = await env.LEADS.prepare(
    `SELECT p.id,p.lead_id,p.object_key,p.thumbnail_key,p.storage_status
     FROM photos p
     INNER JOIN leads l ON l.id=p.lead_id AND l.deleted_at IS NOT NULL
     WHERE
       (p.storage_status='pending' AND p.created_at<=?) OR
       (p.storage_status='thumbnail_pending' AND p.storage_error<=?)
     ORDER BY p.created_at,p.id
     LIMIT 100`,
  )
    .bind(cutoff, cutoff)
    .all();
  if (!results.length) return;
  await queueObjectDeletionRows(
    env,
    results.flatMap((row) =>
      [row.object_key, row.thumbnail_key]
        .filter(Boolean)
        .map((objectKey) => ({ objectKey, leadId: row.lead_id })),
    ),
  );
  await env.LEADS.batch(
    results.map((row) =>
      env.LEADS.prepare(
        `UPDATE photos SET storage_status='failed',storage_error='stale_deleted_upload'
         WHERE id=? AND lead_id=? AND storage_status=?`,
      ).bind(row.id, row.lead_id, row.storage_status),
    ),
  );
  await processDeletionQueue(
    env,
    results.map((row) => row.lead_id),
    100,
  );
}

async function cleanupJournals(env) {
  const cutoff = new Date(Date.now() - JOURNAL_RETENTION_MS).toISOString();
  const funnelCutoff = new Date(
    Date.now() - FUNNEL_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);
  const uniqueCutoff = new Date(
    Date.now() - ANALYTICS_UNIQUE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  await env.LEADS.batch([
    env.LEADS.prepare(
      `DELETE FROM lead_continuations
       WHERE status IN ('complete','failed') AND updated_at<?`,
    ).bind(cutoff),
    env.LEADS.prepare(
      `DELETE FROM object_deletions
       WHERE completed_at IS NOT NULL AND completed_at<?`,
    ).bind(cutoff),
    env.LEADS.prepare(
      `DELETE FROM funnel_daily WHERE event_date<?`,
    ).bind(funnelCutoff),
    env.LEADS.prepare(
      `DELETE FROM funnel_breakdowns_daily WHERE event_date<?`,
    ).bind(funnelCutoff),
    env.LEADS.prepare(
      `DELETE FROM site_pageviews_daily WHERE event_date<?`,
    ).bind(funnelCutoff),
    env.LEADS.prepare(
      `DELETE FROM site_visitors_daily WHERE event_date<?`,
    ).bind(funnelCutoff),
    env.LEADS.prepare(
      `DELETE FROM site_visitor_uniques WHERE created_at<?`,
    ).bind(uniqueCutoff),
  ]);
}

async function runScheduledMaintenance(env) {
  await recoverStaleTombstoneUploads(env);
  await retryPendingDeletions(env);
  await cleanupJournals(env);
}

async function deleteLeadsByIds(env, leadIds) {
  const placeholders = leadIds.map(() => "?").join(",");
  const created = new Date().toISOString();
  // Tombstone first. Every photo reservation checks the same row, so after
  // this write commits no continuation can create a new untracked R2 key.
  await env.LEADS.prepare(
    `UPDATE leads SET
      deleted_at=?,deletion_status='pending',status='archived',
      name='',email='',phone='',city='',story='',maker='',summary='',ai_json='{}',
      processing_error='',make_error=''
     WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
  )
    .bind(created, ...leadIds)
    .run();
  const { results: photos } = await env.LEADS.prepare(
    `SELECT lead_id,object_key,thumbnail_key FROM photos WHERE lead_id IN (${placeholders})`,
  )
    .bind(...leadIds)
    .all();
  const objects = photos.flatMap((photo) =>
    [photo.object_key, photo.thumbnail_key]
      .filter(Boolean)
      .map((objectKey) => ({ objectKey, leadId: photo.lead_id })),
  );
  await queueObjectDeletionRows(env, objects, created);
  await processDeletionQueue(env, leadIds, 50);
  const row = await env.LEADS.prepare(
    `SELECT COUNT(*) AS pending FROM leads
     WHERE id IN (${placeholders}) AND deleted_at IS NOT NULL`,
  )
    .bind(...leadIds)
    .first();
  return { pending: Number(row?.pending || 0) };
}

async function deleteLead(request, leadId, env) {
  if (!authorized(request, env))
    return reviewAuthError(request, env);
  const result = await deleteLeadsByIds(env, [leadId]);
  return json(
    {
      ok: true,
      accepted: true,
      deletion_pending: result.pending > 0,
    },
    result.pending > 0 ? 202 : 200,
    request,
    env,
  );
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
    const result = existingIds.length
      ? await deleteLeadsByIds(env, existingIds)
      : { pending: 0 };
    return json(
      {
        ok: true,
        accepted: true,
        action: "delete",
        count: existingIds.length,
        deletion_pending: result.pending > 0,
      },
      result.pending > 0 ? 202 : 200,
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
  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (
    !ALLOWED_IMAGE_TYPES.has(contentType) ||
    contentLength > MAX_THUMBNAIL_BYTES
  )
    return json({ error: "invalid_thumbnail" }, 400, request, env);
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_THUMBNAIL_BYTES)
    return json({ error: "invalid_thumbnail" }, 400, request, env);
  if (!imageSignatureMatches(new Uint8Array(bytes.slice(0, 12)), contentType))
    return json({ error: "invalid_thumbnail" }, 400, request, env);
  const row = await env.LEADS.prepare(
    `SELECT p.object_key,p.thumbnail_key,p.lead_id
     FROM photos p
     INNER JOIN leads l ON l.id=p.lead_id AND l.deleted_at IS NULL
     WHERE p.id=?`,
  )
    .bind(photoId)
    .first();
  if (!row) return json({ error: "not_found" }, 404, request, env);
  const claimedAt = new Date().toISOString();
  const claimed = await env.LEADS.prepare(
    `UPDATE photos SET storage_status='thumbnail_pending',storage_error=?
     WHERE id=? AND lead_id=? AND storage_status='ready' AND EXISTS (
       SELECT 1 FROM leads WHERE id=? AND deleted_at IS NULL
     )`,
  )
    .bind(claimedAt, photoId, row.lead_id, row.lead_id)
    .run();
  if (!Number(claimed.meta?.changes || 0))
    return json({ error: "photo_busy" }, 409, request, env);
  const slash = row.object_key.lastIndexOf("/");
  const prefix = slash >= 0 ? row.object_key.slice(0, slash + 1) : "";
  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : "jpg";
  const thumbnailKey = `${prefix}${photoId}-thumb.${extension}`;
  try {
    await env.PHOTOS.put(thumbnailKey, bytes, {
      httpMetadata: { contentType },
    });
  } catch (error) {
    const active = await activeLeadExists(env, row.lead_id);
    await env.LEADS.prepare(
      `UPDATE photos SET storage_status=?,storage_error=?
       WHERE id=? AND lead_id=? AND storage_status='thumbnail_pending'`,
    )
      .bind(
        active ? "ready" : "failed",
        active ? String(error).slice(0, 1000) : "lead_deleted",
        photoId,
        row.lead_id,
      )
      .run();
    if (!active) {
      await queueObjectDeletions(env, row.lead_id, [
        row.object_key,
        row.thumbnail_key,
        thumbnailKey,
      ]);
      await processDeletionQueue(env, [row.lead_id], 10);
      return json({ error: "lead_deleted" }, 410, request, env);
    }
    throw error;
  }
  const switchedAt = new Date().toISOString();
  const switchStatements = [
    env.LEADS.prepare(
      `UPDATE photos
       SET thumbnail_key=?,storage_status='ready',storage_error=''
       WHERE id=? AND lead_id=? AND storage_status='thumbnail_pending' AND EXISTS (
         SELECT 1 FROM leads WHERE id=? AND deleted_at IS NULL
       )`,
    ).bind(thumbnailKey, photoId, row.lead_id, row.lead_id),
  ];
  if (row.thumbnail_key && row.thumbnail_key !== thumbnailKey)
    switchStatements.push(
      objectDeletionStatement(
        env,
        { objectKey: row.thumbnail_key, leadId: row.lead_id },
        switchedAt,
      ),
    );
  let switchResults;
  try {
    switchResults = await env.LEADS.batch(switchStatements);
  } catch (error) {
    const active = await activeLeadExists(env, row.lead_id);
    await env.LEADS.prepare(
      `UPDATE photos SET storage_status=?,storage_error=?
       WHERE id=? AND lead_id=? AND storage_status='thumbnail_pending'`,
    )
      .bind(
        active ? "ready" : "failed",
        active ? "thumbnail_switch_failed" : "lead_deleted",
        photoId,
        row.lead_id,
      )
      .run();
    await queueObjectDeletions(env, row.lead_id, [thumbnailKey]);
    await processDeletionQueue(env, [row.lead_id], 10);
    throw error;
  }
  const updated = switchResults[0];
  if (!Number(updated.meta?.changes || 0)) {
    await env.LEADS.prepare(
      `UPDATE photos SET storage_status='failed',storage_error='lead_deleted'
       WHERE id=? AND lead_id=? AND storage_status='thumbnail_pending'`,
    )
      .bind(photoId, row.lead_id)
      .run();
    await queueObjectDeletions(env, row.lead_id, [
      row.object_key,
      row.thumbnail_key,
      thumbnailKey,
    ]);
    await processDeletionQueue(env, [row.lead_id], 10);
    return json({ error: "lead_deleted" }, 410, request, env);
  }
  if (row.thumbnail_key && row.thumbnail_key !== thumbnailKey)
    await processDeletionQueue(env, [row.lead_id], 10);
  return json({ ok: true, id: photoId }, 200, request, env);
}

export default {
  async scheduled(_controller, env, ctx) {
    const maintenance = runScheduledMaintenance(env).catch((error) => {
      console.error("Scheduled maintenance failed", error);
      throw error;
    });
    if (ctx?.waitUntil) ctx.waitUntil(maintenance);
    else await maintenance;
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(request, env))
        return json({ error: "origin_not_allowed" }, 403, request, env);
      return new Response(null, { headers: cors(request, env) });
    }
    try {
      if (url.pathname === "/api/health")
        return json({ ok: true }, 200, request, env);
      if (url.pathname === "/api/photo-check" && request.method === "POST")
        return await photoCheck(request, env);
      if (url.pathname === "/api/funnel" && request.method === "POST")
        return await recordFunnelEvent(request, env);
      if (
        url.pathname === "/api/analytics/pageview" &&
        request.method === "POST"
      )
        return await recordSitePageview(request, env);
      if (url.pathname === "/api/leads" && request.method === "POST")
        return await createLead(request, env, ctx);
      const continuation = url.pathname.match(/^\/api\/leads\/([^/]+)\/continue$/);
      if (continuation && request.method === "POST")
        return await continueLead(
          request,
          decodeURIComponent(continuation[1]),
          env,
        );
      if (url.pathname === "/api/review" && request.method === "GET")
        return await reviewList(request, env);
      if (url.pathname === "/api/review/funnel" && request.method === "GET")
        return await reviewFunnel(request, env);
      if (
        url.pathname === "/api/review/analytics" &&
        request.method === "GET"
      )
        return await reviewSiteAnalytics(request, env);
      if (url.pathname === "/api/review/bulk" && request.method === "POST")
        return await bulkReviewAction(request, env);
      const thumbnail = url.pathname.match(
        /^\/api\/review\/photo\/([^/]+)\/thumbnail$/,
      );
      if (thumbnail && request.method === "PUT")
        return await savePhotoThumbnail(
          request,
          decodeURIComponent(thumbnail[1]),
          env,
        );
      const detail = url.pathname.match(/^\/api\/review\/([^/]+)$/);
      if (detail && request.method === "GET")
        return await reviewDetail(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "PATCH")
        return await updateLead(request, decodeURIComponent(detail[1]), env);
      if (detail && request.method === "DELETE")
        return await deleteLead(request, decodeURIComponent(detail[1]), env);
      if (url.pathname.startsWith("/api/photo/") && request.method === "GET")
        return await servePhoto(request, url.pathname.split("/").pop(), env);
      return json({ error: "not found" }, 404, request, env);
    } catch (e) {
      if (e instanceof ApiError)
        return json(
          { error: e.code },
          e.status,
          request,
          env,
          e.headers,
        );
      console.error(e);
      return json({ error: "server_error" }, 500, request, env);
    }
  },
};
