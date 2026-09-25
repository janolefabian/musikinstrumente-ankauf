// Dedicated mail delivery: the existing Make/Ninox integration is unchanged.
// Make claims each notification BEFORE sending. A lost webhook response can be
// retried safely; an ambiguous mail send is never blindly repeated.
const ACTIVE = "'pending','dispatching','awaiting','retry'";
const MAX_ATTEMPTS = 8;
const MAX_BODY = 2048;
const mailAddress = value => typeof value === "string" && value.length <= 254 &&
  /^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/.test(value);
const cleanText = (value, max = 1000) => String(value || "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, max);
const iso = ms => new Date(ms).toISOString();

export function emailTransportReady(env) {
  try {
    const url = new URL(env.EMAIL_WEBHOOK_URL);
    return url.protocol === "https:" && !url.username && !url.password &&
      typeof env.EMAIL_WEBHOOK_SECRET === "string" && env.EMAIL_WEBHOOK_SECRET.length >= 32 &&
      mailAddress(env.EMAIL_NOTIFICATION_TO);
  } catch { return false; }
}

// Commit with the final initial-lead update, not with the browser's response.
export function emailEnqueueStatement(env, leadId, now = new Date().toISOString()) {
  return env.LEADS.prepare(`INSERT INTO email_notification_outbox
    (id,lead_id,priority,status,next_attempt_at,created_at,updated_at)
    SELECT 'lead-email:' || l.id,l.id,
      CASE WHEN l.lead_class IN ('A','B','C') THEN l.lead_class ELSE 'B' END,
      CASE WHEN (CASE l.lead_class WHEN 'A' THEN s.notify_a WHEN 'C' THEN s.notify_c ELSE s.notify_b END)=1
        THEN 'pending' ELSE 'skipped' END,?,?,?
    FROM leads l CROSS JOIN email_notification_settings s
    WHERE l.id=? AND l.deleted_at IS NULL AND l.processing_status='ready' AND s.id=1
    ON CONFLICT(lead_id) DO NOTHING`).bind(now, now, now, leadId);
}

async function settingsRow(env) {
  const row = await env.LEADS.prepare("SELECT * FROM email_notification_settings WHERE id=1").first();
  if (!row) throw new Error("email_settings_missing");
  return row;
}

export async function emailSettings(env) {
  const row = await settingsRow(env);
  const { results = [] } = await env.LEADS.prepare(
    "SELECT status,COUNT(*) AS count FROM email_notification_outbox GROUP BY status",
  ).all();
  return {
    priorities: { A: Boolean(row.notify_a), B: Boolean(row.notify_b), C: Boolean(row.notify_c) },
    revision: row.revision,
    recipient: mailAddress(env.EMAIL_NOTIFICATION_TO) ? env.EMAIL_NOTIFICATION_TO : "",
    configured: emailTransportReady(env),
    counts: Object.fromEntries(results.map(item => [item.status, Number(item.count)])),
  };
}

export async function saveEmailSettings(env, input) {
  if (!input || !Number.isSafeInteger(input.revision) || input.revision < 0 ||
    !input.priorities || Array.isArray(input.priorities) ||
    Object.keys(input.priorities).sort().join("") !== "ABC" ||
    Object.values(input.priorities).some(value => typeof value !== "boolean") ||
    Object.keys(input).some(key => !["revision", "priorities"].includes(key)))
    return { status: 400, body: { error: "invalid_notification_settings" } };
  const { A, B, C } = input.priorities;
  const result = await env.LEADS.prepare(`UPDATE email_notification_settings
    SET notify_a=?,notify_b=?,notify_c=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=?`)
    .bind(Number(A), Number(B), Number(C), new Date().toISOString(), input.revision).run();
  if (!result.meta?.changes) return { status: 409, body: { error: "settings_changed" } };
  return { status: 200, body: await emailSettings(env) };
}

export async function readEmailJson(request) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
    return { error: "json_required", status: 415 };
  if (Number(request.headers.get("Content-Length")) > MAX_BODY)
    return { error: "request_too_large", status: 413 };
  const reader = request.body?.getReader();
  if (!reader) return { error: "invalid_json", status: 400 };
  const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return { error: "request_too_large", status: 413 }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch { return { error: "invalid_json", status: 400 }; }
}

export function emailCallbackAuthorized(request, env) {
  return emailTransportReady(env) && request.headers.get("Authorization") === `Bearer ${env.EMAIL_WEBHOOK_SECRET}`;
}

function selected(settings, priority) {
  return Boolean(settings[`notify_${priority.toLowerCase()}`]);
}

function messageFor(env, lead, priority) {
  const names = { double_bass: "Kontrabass", strings: "Streichinstrument", bow: "Bogen", guitar: "Gitarre", estate: "Nachlass / Sammlung", other: "Anderes Instrument", unknown: "Instrument noch unbekannt" };
  const type = names[lead.classified_type] || names[lead.type] || "Instrument";
  const kind = lead.inquiry_kind === "quick" ? "Kurzanfrage" : "Neue Anfrage";
  // Fixed production destination, not a user-supplied URL or privileged token.
  const reviewUrl = `https://musikinstrument-ankauf.de/review/?lead=${encodeURIComponent(lead.id)}`;
  return {
    to: env.EMAIL_NOTIFICATION_TO,
    subject: `[Musikinstrument Ankauf · ${priority}] ${kind}: ${type}`,
    text: [
      `${kind}: ${type}`, `Priorität bei Eingang: ${priority}`,
      `Ort: ${cleanText(lead.city, 200) || "nicht angegeben"}`,
      `Fotos: ${Number(lead.photo_count || 0)}`, "",
      cleanText(lead.summary || lead.story), "",
      "Anfrage im geschützten Dashboard öffnen:", reviewUrl,
    ].join("\n"),
    review_url: reviewUrl,
  };
}

export async function claimEmail(env, input, nowMs = Date.now()) {
  if (!input || typeof input.notification_id !== "string" || input.notification_id.length > 160)
    return { status: 400, body: { error: "invalid_notification_id" } };
  const row = await env.LEADS.prepare("SELECT * FROM email_notification_outbox WHERE id=?")
    .bind(input.notification_id).first();
  if (!row || !["pending", "dispatching", "awaiting", "retry"].includes(row.status))
    return { status: 200, body: { send: false } };
  const lead = await env.LEADS.prepare("SELECT * FROM leads WHERE id=? AND deleted_at IS NULL")
    .bind(row.lead_id).first();
  const settings = await settingsRow(env);
  if (!lead || !selected(settings, row.priority)) {
    await env.LEADS.prepare(`UPDATE email_notification_outbox SET status='skipped',updated_at=?
      WHERE id=? AND status IN (${ACTIVE})`).bind(iso(nowMs), row.id).run();
    return { status: 200, body: { send: false } };
  }
  const receipt = crypto.randomUUID();
  const claimed = await env.LEADS.prepare(`UPDATE email_notification_outbox
    SET status='sending',claim_token=?,claimed_at=?,updated_at=?,last_error=''
    WHERE id=? AND status IN (${ACTIVE}) AND claim_token IS NULL
      AND EXISTS (SELECT 1 FROM leads WHERE id=email_notification_outbox.lead_id AND deleted_at IS NULL)`)
    .bind(receipt, iso(nowMs), iso(nowMs), row.id).run();
  if (!claimed.meta?.changes) return { status: 200, body: { send: false } };
  return { status: 200, body: { send: true, notification_id: row.id, receipt_token: receipt, message: messageFor(env, lead, row.priority) } };
}

export async function completeEmail(env, input, nowMs = Date.now()) {
  if (!input || typeof input.notification_id !== "string" || input.notification_id.length > 160 ||
    typeof input.receipt_token !== "string" || input.receipt_token.length > 80)
    return { status: 400, body: { error: "invalid_receipt" } };
  const result = await env.LEADS.prepare(`UPDATE email_notification_outbox
    SET status='sent',sent_at=COALESCE(sent_at,?),updated_at=?,last_error=''
    WHERE id=? AND claim_token=? AND status IN ('sending','uncertain','sent')`)
    .bind(iso(nowMs), iso(nowMs), input.notification_id, input.receipt_token).run();
  return result.meta?.changes
    ? { status: 200, body: { ok: true } }
    : { status: 409, body: { error: "receipt_not_claimed" } };
}

export async function dispatchEmails(env, { leadId, nowMs = Date.now(), fetcher = fetch } = {}) {
  const now = iso(nowMs);
  // A missing acknowledgement after the send reservation is ambiguous. Stop and
  // show it to the administrator, rather than risk sending the mail twice.
  await env.LEADS.prepare(`UPDATE email_notification_outbox SET status='uncertain',last_error='receipt_missing',updated_at=?
    WHERE status='sending' AND claimed_at<=?`).bind(now, iso(nowMs - 30 * 60_000)).run();
  await env.LEADS.prepare(`UPDATE email_notification_outbox SET status='skipped',updated_at=?
    WHERE status IN (${ACTIVE}) AND EXISTS
      (SELECT 1 FROM leads WHERE id=email_notification_outbox.lead_id AND deleted_at IS NOT NULL)`)
    .bind(now).run();
  if (!emailTransportReady(env)) return;
  const settings = await settingsRow(env);
  const { results = [] } = await env.LEADS.prepare(`SELECT * FROM email_notification_outbox
    WHERE status IN (${ACTIVE}) AND next_attempt_at<=? ${leadId ? "AND lead_id=?" : ""}
    ORDER BY created_at LIMIT 5`).bind(now, ...(leadId ? [leadId] : [])).all();
  for (const row of results) {
    if (!selected(settings, row.priority)) {
      await env.LEADS.prepare(`UPDATE email_notification_outbox SET status='skipped',updated_at=?
        WHERE id=? AND status IN (${ACTIVE})`).bind(now, row.id).run();
      continue;
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await env.LEADS.prepare(`UPDATE email_notification_outbox SET status='failed',last_error='handoff_exhausted',updated_at=?
        WHERE id=? AND status IN (${ACTIVE})`).bind(now, row.id).run();
      continue;
    }
    const dispatchToken = crypto.randomUUID();
    const lease = await env.LEADS.prepare(`UPDATE email_notification_outbox
      SET status='dispatching',attempts=attempts+1,dispatch_token=?,next_attempt_at=?,updated_at=?
      WHERE id=? AND status IN (${ACTIVE}) AND next_attempt_at<=?`)
      .bind(dispatchToken, iso(nowMs + 2 * 60_000), now, row.id, now).run();
    if (!lease.meta?.changes) continue;
    let status = "retry", error = "handoff_network_error";
    try {
      const response = await fetcher(env.EMAIL_WEBHOOK_URL, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json", "X-Webhook-Secret": env.EMAIL_WEBHOOK_SECRET, "Idempotency-Key": row.id },
        body: JSON.stringify({ event: "lead.email.requested", notification_id: row.id }),
      });
      status = response.ok ? "awaiting" : "retry";
      error = response.ok ? "" : `handoff_http_${response.status}`;
      await response.body?.cancel();
    } catch { /* Never log webhook URLs, secrets, mail text or provider response bodies. */ }
    const delay = Math.min(15 * 60_000 * 2 ** row.attempts, 6 * 60 * 60_000);
    // The receiver may have claimed/completed while the webhook was in flight.
    await env.LEADS.prepare(`UPDATE email_notification_outbox SET status=?,last_error=?,next_attempt_at=?,updated_at=?
      WHERE id=? AND status='dispatching' AND dispatch_token=?`)
      .bind(status, error, iso(nowMs + delay), now, row.id, dispatchToken).run();
  }
}
