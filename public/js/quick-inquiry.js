export function parseQuickContact(value) {
  const contact = String(value || "").trim();
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact);
  const digits = contact.replace(/\D/g, "");
  const phone = /^\+?[\d\s()./-]+$/u.test(contact) && digits.length >= 7 && digits.length <= 18;
  return contact.length <= 254 && (email || phone) ? contact : null;
}

async function jpegCopy(file, max, quality) {
  const bitmap = await createImageBitmap(file);
  try {
    if (!bitmap.width || !bitmap.height) throw new Error("image_decode");
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("image_decode")), "image/jpeg", quality,
    ));
  } finally { bitmap.close(); }
}

export async function photoBundle(files) {
  const form = new FormData();
  form.set("meta", JSON.stringify({ photoMeta: files.map(() => ({ kind: "overview", label: "Ergänzendes Foto zur Kurzanfrage" })) }));
  for (const [index, file] of files.entries()) {
    form.append(`photo_${index}`, await jpegCopy(file, 3000, .88), `foto-${index}.jpg`);
    form.append(`thumb_${index}`, await jpegCopy(file, 480, .72), `vorschau-${index}.jpg`);
    form.append(`ai_${index}`, await jpegCopy(file, 1024, .72), `analyse-${index}.jpg`);
  }
  return form;
}

export function initQuickInquiry(root, dependencies = {}) {
  const send = dependencies.fetch || fetch;
  const bundle = dependencies.photoBundle || photoBundle;
  const api = root.dataset.apiBase;
  if (!api) return; // Never simulate a successful save when the API is missing.
  const find = (selector) => root.querySelector(selector);
  const open = find("[data-quick-open]");
  const form = find("[data-quick-form]");
  const submit = find("[data-quick-submit]");
  const status = find("[data-quick-status]");
  const success = find("[data-quick-success]");
  const photoInput = find("[data-quick-photos]");
  const upload = find("[data-quick-upload]");
  const photoStatus = find("[data-quick-photo-status]");
  const contactInput = form.elements.namedItem("contact");
  const storageKey = `quick-inquiry-v1:${root.dataset.entryPath}`;
  const maxAge = 24 * 60 * 60 * 1000;
  let storage;
  try { storage = dependencies.storage || sessionStorage; } catch { /* Optional resume only. */ }
  let lead = null;
  let sending = false;
  let opened = false;
  let pending = null;
  let pendingUpload = null;
  const key = () => crypto.randomUUID();
  const message = (element, text, error = false) => {
    element.textContent = text;
    element.dataset.error = String(error);
  };
  const persist = () => {
    try {
      if (lead) storage?.setItem(storageKey, JSON.stringify(lead));
      else storage?.removeItem(storageKey);
    } catch { /* Saving the actual enquiry does not depend on browser storage. */ }
  };
  const showSaved = (focus = true) => {
    form.hidden = true;
    find("[data-quick-intro]").hidden = true;
    success.hidden = false;
    find("[data-quick-upload-area]").hidden = !lead.token || lead.photoCount >= 5;
    if (!lead.token) message(photoStatus, "Ihre Anfrage ist gespeichert. Fotos können Sie uns bei der Rückmeldung nachreichen.");
    else if (lead.photoCount) message(photoStatus, `${lead.photoCount} Foto${lead.photoCount === 1 ? "" : "s"} zur Anfrage gespeichert.`);
    if (focus) success.focus();
  };
  try {
    const saved = JSON.parse(storage?.getItem(storageKey) || "null");
    if (saved && typeof saved.id === "string" && saved.id.length <= 160 && saved.id &&
        (saved.token === null || (typeof saved.token === "string" && saved.token.length <= 512)) &&
        Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < maxAge &&
        Number.isInteger(saved.photoCount) && saved.photoCount >= 0 && saved.photoCount <= 5) {
      lead = saved; showSaved(false);
    } else storage?.removeItem(storageKey);
  } catch { /* A malformed or expired draft must not prevent contact. */ }

  open.hidden = false;
  open.onclick = () => {
    form.hidden = !form.hidden;
    open.setAttribute("aria-expanded", String(!form.hidden));
    if (form.hidden) return;
    form.elements.namedItem("story").focus();
    if (!opened && navigator.doNotTrack !== "1" && navigator.globalPrivacyControl !== true) {
      opened = true;
      void send(`${api}/api/analytics/quick-inquiry`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_path: root.dataset.entryPath }), keepalive: true,
      }).catch(() => {});
    }
  };
  contactInput.oninput = () => contactInput.setCustomValidity("");
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (sending || lead) return;
    const contact = parseQuickContact(contactInput.value);
    contactInput.setCustomValidity(contact ? "" : "Bitte geben Sie eine gültige E-Mail-Adresse oder Telefonnummer mit Vorwahl an.");
    if (!form.reportValidity()) return;
    if (!pending) {
      const data = Object.fromEntries(["story", "name", "website"].map((name) => [name, form.elements.namedItem(name).value.trim()]));
      if (!data.story) { message(status, "Bitte beschreiben Sie kurz Ihr Instrument oder Anliegen.", true); return; }
      pending = { key: key(), meta: JSON.stringify({ entry_path: root.dataset.entryPath, data: { ...data, contact } }) };
    }
    sending = true; submit.disabled = true;
    for (const name of ["story", "name", "contact"]) form.elements.namedItem(name).readOnly = true;
    submit.textContent = "Wird gesendet …";
    message(status, "Ihre Nachricht wird übermittelt …");
    try {
      const body = new FormData(); body.set("meta", pending.meta);
      const response = await send(`${api}/api/quick-inquiries`, {
        method: "POST", headers: { "Idempotency-Key": pending.key }, body,
        signal: AbortSignal.timeout(25000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if ([400, 410, 413, 415].includes(response.status)) {
          pending = null;
          for (const name of ["story", "name", "contact"]) form.elements.namedItem(name).readOnly = false;
        }
        throw new Error(response.status === 429 ? "Bitte warten Sie etwas, bevor Sie erneut senden." :
          response.status === 413 ? "Die Nachricht ist zu lang. Bitte beschränken Sie sich auf höchstens 1.500 Zeichen." :
          response.status === 400 ? "Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut." :
          "Ihre Nachricht konnte noch nicht bestätigt werden. Bitte klicken Sie erneut auf Senden; dieselbe Anfrage wird dabei nicht doppelt angelegt.");
      }
      if (!result.id || result.processing_status !== "ready") throw new Error("Die Speicherung ist noch nicht bestätigt. Bitte versuchen Sie es erneut.");
      lead = { id: result.id, token: result.continuation_token || null, at: Date.now(), photoCount: 0 };
      persist(); pending = null;
      message(status, ""); showSaved();
    } catch (error) {
      message(status, error.name === "TimeoutError" || error.name === "TypeError" ?
        "Die Verbindung wurde unterbrochen. Bitte senden Sie erneut; doppelte Anfragen werden dabei verhindert." : error.message, true);
    } finally {
      sending = false; submit.disabled = false; submit.textContent = "Kontaktanfrage senden";
    }
  };

  photoInput.onchange = () => {
    if (sending || pendingUpload) return;
    const files = Array.from(photoInput.files || []);
    const remaining = 5 - (lead?.photoCount || 0);
    const invalid = files.length > remaining || files.some((file) => !file.type.startsWith("image/") || file.size > 20 * 1024 * 1024);
    upload.hidden = !files.length || invalid;
    message(photoStatus, invalid ? `Bitte wählen Sie höchstens ${remaining} Bilder bis jeweils 20 MB aus.` :
      files.length ? `${files.length} Foto${files.length === 1 ? "" : "s"} ausgewählt – zum Hochladen bitte bestätigen.` : "", invalid);
  };
  upload.onclick = async () => {
    if (sending || !lead?.token) return;
    const files = Array.from(photoInput.files || []);
    if (!pendingUpload && (!files.length || files.length > 5 - lead.photoCount ||
        files.some((file) => !file.type.startsWith("image/") || file.size > 20 * 1024 * 1024))) return;
    sending = true; upload.disabled = true; photoInput.disabled = true;
    find("[data-quick-new]").disabled = true;
    message(photoStatus, "Fotos werden vorbereitet und hochgeladen …");
    try {
      if (!pendingUpload) pendingUpload = { key: key(), body: await bundle(files) };
      const response = await send(`${api}/api/leads/${encodeURIComponent(lead.id)}/continue`, {
        method: "POST", headers: { Authorization: `Bearer ${lead.token}`, "Idempotency-Key": pendingUpload.key },
        body: pendingUpload.body, signal: AbortSignal.timeout(90000),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 410 || response.status === 404) {
        lead.token = null; persist(); upload.hidden = true;
        throw new Error("Der Foto-Zugang ist abgelaufen oder nicht mehr verfügbar. Ihre Kontaktanfrage wurde bereits gespeichert. Bitte reichen Sie Fotos bei der Rückmeldung nach.");
      }
      if (!response.ok || result.processing_status !== "ready") throw new Error("Die Fotos konnten noch nicht vollständig bestätigt werden. Bitte versuchen Sie es erneut. Ihre Kontaktanfrage ist bereits gespeichert.");
      lead.photoCount = Number(result.photo_count) || lead.photoCount + files.length;
      persist(); pendingUpload = null; photoInput.value = ""; upload.hidden = true;
      showSaved(false);
    } catch (error) {
      message(photoStatus, !pendingUpload ? "Dieses Bildformat konnte nicht vorbereitet werden. Bitte wählen Sie JPG- oder PNG-Fotos." :
        ["TypeError", "TimeoutError"].includes(error.name) ? "Die Verbindung wurde unterbrochen. Bitte senden Sie die Fotos erneut; doppelte Fotos werden dabei verhindert. Ihre Kontaktanfrage ist gespeichert." : error.message, true);
    } finally {
      sending = false; upload.disabled = false;
      photoInput.disabled = Boolean(pendingUpload);
      find("[data-quick-new]").disabled = false;
    }
  };
  find("[data-quick-new]").onclick = () => {
    if (sending) return;
    lead = null; pending = null; pendingUpload = null; persist(); form.reset();
    photoInput.value = ""; photoInput.disabled = false; upload.hidden = true;
    for (const name of ["story", "name", "contact"]) form.elements.namedItem(name).readOnly = false;
    contactInput.setCustomValidity("");
    message(status, ""); message(photoStatus, ""); success.hidden = true;
    find("[data-quick-intro]").hidden = false; form.hidden = true;
    open.setAttribute("aria-expanded", "false"); open.focus();
  };
}

if (typeof document !== "undefined") {
  document.querySelectorAll("[data-quick-inquiry]").forEach((root) => initQuickInquiry(root));
}
