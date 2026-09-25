export function initEmailSettings(root, dependencies = {}) {
  const find = selector => root.querySelector(selector);
  const api = (root.dataset.apiBase || "").replace(/\/$/, "");
  const fetcher = dependencies.fetch || globalThis.fetch.bind(globalThis);
  let storage;
  try { storage = dependencies.storage || globalThis.sessionStorage; } catch { /* memory-only login */ }
  const stored = () => { try { return storage?.getItem("review-token") || ""; } catch { return ""; } };
  const remember = value => { try { value ? storage?.setItem("review-token", value) : storage?.removeItem("review-token"); } catch { /* memory-only login */ } };
  let token = stored(), revision = 0, busy = false, sequence = 0;
  const auth = find("[data-email-auth]"), dashboard = find("[data-email-dashboard]");
  const login = find("[data-email-login]"), loginInput = find("[data-email-token]");
  const loginButton = find("[data-email-login-submit]"), authError = find("[data-email-auth-error]");
  const preferences = find("[data-email-preferences]"), saveButton = find("[data-email-save]");
  const status = find("[data-email-save-status]"), refresh = find("[data-email-refresh]");
  const fields = ["A", "B", "C"].map(key => preferences.elements.namedItem(key));
  const setBusy = value => {
    busy = value; loginButton.disabled = value; saveButton.disabled = value; refresh.disabled = value;
    fields.forEach(field => { field.disabled = value; });
  };
  const showStatus = (text, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  const lock = message => {
    token = ""; remember(""); dashboard.hidden = true; auth.hidden = false;
    find("[data-email-recipient]").textContent = "";
    authError.textContent = message; loginInput.value = "";
  };
  const render = payload => {
    revision = payload.revision;
    fields.forEach(field => { field.checked = payload.priorities[field.name] === true; });
    find("[data-email-recipient]").textContent = payload.recipient || "Noch nicht eingerichtet";
    find("[data-email-connection]").textContent = payload.configured
      ? "Versand-Anbindung konfiguriert. Die ausgewählten Prioritäten werden an Make übergeben."
      : "Noch kein E-Mail-Versand: Die Mail-Anbindung muss eingerichtet werden. Ihre Auswahl kann bereits gespeichert werden.";
    const counts = payload.counts || {}, number = key => Math.max(0, Number(counts[key]) || 0);
    const waiting = ["pending", "dispatching", "awaiting", "retry", "sending"].reduce((sum, key) => sum + number(key), 0);
    find("[data-email-counts]").textContent = `${number("sent")} gesendet · ${waiting} wartend · ${number("skipped")} ausgelassen`;
    const warning = find("[data-email-warning]");
    warning.hidden = !number("failed") && !number("uncertain");
    warning.textContent = `${number("failed")} fehlgeschlagene Übergaben · ${number("uncertain")} unklare Versandresultate. Bitte den Versand prüfen. Die Anfragen selbst sind gespeichert.`;
    auth.hidden = true; dashboard.hidden = false; authError.textContent = ""; loginInput.value = "";
    remember(token);
  };
  async function request(method = "GET", body) {
    const response = await fetcher(`${api}/api/review/email-settings`, {
      method, cache: "no-store", credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 401) { lock("Der Zugangsschlüssel ist nicht korrekt oder nicht mehr gültig."); return null; }
    if (response.status === 409) throw new Error("conflict");
    if (!response.ok) throw new Error("unavailable");
    return response.json();
  }
  async function load() {
    if (busy) return;
    if (!api) { lock("Die API-Konfiguration fehlt."); return; }
    if (!token) { dashboard.hidden = true; auth.hidden = false; return; }
    const current = ++sequence; setBusy(true); showStatus("");
    try {
      const payload = await request();
      if (current === sequence && payload) render(payload);
    } catch {
      if (dashboard.hidden) authError.textContent = "Die Einstellungen konnten nicht geladen werden. Bitte später erneut versuchen.";
      else showStatus("Die Einstellungen konnten nicht neu geladen werden.", true);
    } finally { setBusy(false); }
  }
  login.onsubmit = async event => {
    event.preventDefault(); if (busy || !loginInput.value.trim()) return;
    token = loginInput.value.trim(); await load();
  };
  preferences.onsubmit = async event => {
    event.preventDefault(); if (busy || dashboard.hidden || !token || !api) return;
    const priorities = Object.fromEntries(fields.map(field => [field.name, field.checked]));
    setBusy(true); showStatus("Wird gespeichert …");
    try {
      const payload = await request("PUT", { revision, priorities });
      if (payload) { render(payload); showStatus("Gespeichert. " + (Object.values(priorities).some(Boolean)
        ? "Die Auswahl gilt für neue Anfragen." : "Alle Prioritäten sind abgewählt; neue Anfragen lösen keine E-Mail aus.")); }
    } catch (error) {
      showStatus(error.message === "conflict"
        ? "Die Einstellungen wurden zwischenzeitlich geändert. Bitte Anzeige neu laden und Ihre Auswahl erneut prüfen."
        : "Speichern konnte nicht bestätigt werden. Bitte Anzeige neu laden, bevor Sie erneut speichern.", true);
    } finally { setBusy(false); }
  };
  refresh.onclick = load;
  const ready = load();
  return { ready };
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-email-settings]");
  if (root) initEmailSettings(root);
}
