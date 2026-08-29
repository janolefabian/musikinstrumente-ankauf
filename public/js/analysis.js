(() => {
  const root = document.querySelector("[data-analysis]");
  if (!root) return;

  const api = root.dataset.apiBase || "";
  const authGate = root.querySelector("[data-analysis-auth-gate]");
  const dashboard = root.querySelector("[data-analysis-dashboard]");
  const loginForm = root.querySelector("[data-analysis-login]");
  const loginInput = root.querySelector("[data-analysis-token]");
  const loginSubmit = root.querySelector("[data-analysis-login-submit]");
  const authError = root.querySelector("[data-analysis-auth-error]");
  const pageError = root.querySelector("[data-analysis-error]");
  const periodEl = root.querySelector("[data-analysis-period]");
  const kpisEl = root.querySelector("[data-analysis-kpis]");
  const timelineEl = root.querySelector("[data-analysis-timeline]");
  const granularityEl = root.querySelector("[data-analysis-granularity]");
  const pagesEl = root.querySelector("[data-analysis-pages]");
  const entriesEl = root.querySelector("[data-analysis-entries]");
  const sourcesEl = root.querySelector("[data-analysis-sources]");
  const devicesEl = root.querySelector("[data-analysis-devices]");
  const countriesEl = root.querySelector("[data-analysis-countries]");
  const groupsEl = root.querySelector("[data-analysis-groups]");
  const hoursEl = root.querySelector("[data-analysis-hours]");
  const funnelPeriodEl = root.querySelector("[data-funnel-period]");
  const funnelSummaryEl = root.querySelector("[data-funnel-summary]");
  const funnelStepsEl = root.querySelector("[data-funnel-steps]");
  const funnelPhotosEl = root.querySelector("[data-funnel-photos]");
  const funnelErrorsEl = root.querySelector("[data-funnel-errors]");
  const funnelDevicesEl = root.querySelector("[data-funnel-devices]");
  const funnelEntryEl = root.querySelector("[data-funnel-entry]");
  const funnelSourcesEl = root.querySelector("[data-funnel-sources]");
  const funnelFrictionEl = root.querySelector("[data-funnel-friction]");
  const funnelTypeEl = root.querySelector("[data-funnel-type]");

  localStorage.removeItem("review-token");
  let token = sessionStorage.getItem("review-token") || "";
  let days = 30;
  let requestSequence = 0;
  let funnelPayload = null;

  const number = new Intl.NumberFormat("de-DE");
  const decimal = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const countries = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["de"], { type: "region" })
    : null;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[character],
    );
  const count = (value) => Math.max(0, Number(value || 0));
  const percent = (numerator, denominator) =>
    denominator ? Math.round((count(numerator) / count(denominator)) * 100) : 0;
  const dateLabel = (value, options = { day: "2-digit", month: "2-digit" }) =>
    value
      ? new Date(`${value}T12:00:00Z`).toLocaleDateString("de-DE", options)
      : "";

  const sourceLabels = {
    direct: "Direkter Aufruf",
    internal: "Eigene Website",
    google: "Google",
    bing: "Bing",
    duckduckgo: "DuckDuckGo",
    external: "Andere Website",
    unknown: "Unbekannt",
  };
  const deviceLabels = {
    mobile: "Smartphone",
    tablet: "Tablet",
    desktop: "Computer",
    unknown: "Unbekannt",
  };
  const groupLabels = {
    home: "Startseite",
    form: "Anfrageformular",
    city: "Stadtseiten",
    instrument: "Instrumenten-Fachseiten",
    story: "Instrumentengeschichten",
    unknown: "Unbekannt",
  };
  const funnelLabels = {
    wizard_opened: "Funnel geöffnet",
    type_selected: "Instrument gewählt",
    contact_reached: "Kontaktformular erreicht",
    lead_saved: "Anfrage gespeichert",
    flow_completed: "Vorgang abgeschlossen",
    first_photo_added: "Erstes Foto hinzugefügt",
    additional_photos_started: "Weitere Fotos begonnen",
    additional_photo_uploaded: "Weitere Fotos übertragen",
    lead_submit_error: "Fehler beim Speichern",
    continuation_submit_error: "Fehler bei weiteren Fotos",
    photo_skipped: "Fotostufe übersprungen",
    photo_warning_shown: "Fotohinweis angezeigt",
    photo_warning_overridden: "Foto trotz Hinweis verwendet",
    photo_check_unavailable: "Automatische Fotoprüfung nicht erreichbar",
    back_used: "Zurück verwendet",
    early_finish: "Frühzeitig abgeschlossen",
    contact_validation_failed: "Kontaktformular unvollständig",
  };
  const funnelTypeLabels = {
    double_bass: "Kontrabass",
    bow: "Bogen",
    strings: "Geige / Bratsche / Cello",
    guitar: "Gitarre",
    estate: "Mehrere Instrumente / Nachlass",
    unknown: "Nicht eingeordnet",
    other: "Anderes Instrument / Zubehör",
  };
  const entryLabels = {
    direct: "Direkt zum Formular",
    home: "Startseite",
    city: "Stadtseite",
    instrument: "Instrumenten-Fachseite",
    story: "Instrumentengeschichte",
    other_internal: "Andere eigene Seite",
    external: "Externe Seite",
    unknown: "Unbekannt",
  };

  function pathLabel(path) {
    const fixed = {
      "/": "Startseite",
      "/instrument-verkaufen/": "Instrument anbieten",
      "/instrumentengeschichten/": "Instrumentengeschichten",
      "/instrument-geerbt/": "Instrument geerbt",
    };
    if (fixed[path]) return fixed[path];
    return String(path || "/")
      .replace(/^\//, "")
      .replace(/\/$/, "")
      .split("/")
      .at(-1)
      .split("-")
      .map((word) => word ? word[0].toLocaleUpperCase("de-DE") + word.slice(1) : "")
      .join(" ");
  }

  function countryLabel(code) {
    if (!code || code === "XX") return "Unbekannt";
    try {
      return countries?.of(code) || code;
    } catch (_) {
      return code;
    }
  }

  function setLoginBusy(busy) {
    loginSubmit.disabled = busy;
    loginSubmit.textContent = busy ? "Wird geprüft …" : "Analyse öffnen";
  }

  function lockDashboard(invalid = false, message = "") {
    dashboard.hidden = true;
    authGate.hidden = false;
    authError.textContent = message || (invalid
      ? "Der Zugangsschlüssel ist nicht korrekt. Bitte versuchen Sie es erneut."
      : "");
    loginInput.value = "";
    setLoginBusy(false);
    loginInput.focus();
  }

  function unlockDashboard() {
    authGate.hidden = true;
    dashboard.hidden = false;
    authError.textContent = "";
    setLoginBusy(false);
  }

  async function apiFetch(path) {
    return fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  }

  function renderKpis(payload) {
    const totals = payload.totals || {};
    const visitors = count(totals.visitors);
    const views = count(totals.views);
    const leads = count(totals.leads);
    const items = [
      ["Besucher", number.format(visitors), "pro Tag eindeutig"],
      ["Seitenaufrufe", number.format(views), "insgesamt"],
      ["Seiten je Besucher", visitors ? decimal.format(views / visitors) : "–", "im Mittel"],
      ["Anfragen", number.format(leads), "gespeichert"],
      ["Besucher → Anfrage", visitors ? `${percent(leads, visitors)} %` : "–", "Conversion"],
      ["Besucher pro Tag", decimal.format(visitors / Math.max(1, payload.range?.days || days)), "im Mittel"],
    ];
    kpisEl.innerHTML = items
      .map(([label, value, note]) => `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`)
      .join("");
  }

  function aggregateTimeline(timeline) {
    if (days <= 30) {
      granularityEl.textContent = "Tagesansicht";
      return timeline.map((row) => ({ ...row, label: dateLabel(row.date) }));
    }
    const mode = days <= 90 ? "week" : "month";
    granularityEl.textContent = mode === "week" ? "Wochenansicht" : "Monatsansicht";
    const groups = new Map();
    timeline.forEach((row, index) => {
      const key = mode === "week" ? String(Math.floor(index / 7)) : row.date.slice(0, 7);
      const current = groups.get(key) || {
        date: row.date,
        end: row.date,
        views: 0,
        visitors: 0,
        leads: 0,
      };
      current.end = row.date;
      current.views += count(row.views);
      current.visitors += count(row.visitors);
      current.leads += count(row.leads);
      groups.set(key, current);
    });
    return [...groups.values()].map((row) => ({
      ...row,
      label: mode === "week"
        ? `${dateLabel(row.date)}–${dateLabel(row.end)}`
        : dateLabel(row.date, { month: "short", year: "2-digit" }),
    }));
  }

  function renderTimeline(payload) {
    const rows = aggregateTimeline(payload.timeline || []);
    const maximum = Math.max(1, ...rows.flatMap((row) => [row.views, row.visitors, row.leads]));
    timelineEl.innerHTML = rows.length
      ? `<div class="analysis-chart" style="--chart-columns:${rows.length}">${rows
          .map((row) => {
            const title = `${row.label}: ${number.format(row.views)} Aufrufe, ${number.format(row.visitors)} Besucher, ${number.format(row.leads)} Anfragen`;
            const height = (value) => value ? Math.max(3, Math.round((value / maximum) * 100)) : 0;
            return `<div class="analysis-chart-column" title="${esc(title)}">
              <div class="analysis-chart-bars">
                <i class="views" style="height:${height(row.views)}%"><span>${number.format(row.views)}</span></i>
                <i class="visitors" style="height:${height(row.visitors)}%"><span>${number.format(row.visitors)}</span></i>
                <i class="leads" style="height:${height(row.leads)}%"><span>${number.format(row.leads)}</span></i>
              </div>
              <small>${esc(row.label)}</small>
            </div>`;
          })
          .join("")}</div>`
      : '<p class="analysis-empty">Noch keine Daten.</p>';
  }

  function renderList(container, rows, options) {
    const primary = options.primary || "views";
    const maximum = Math.max(1, ...rows.map((row) => count(row[primary])));
    container.innerHTML = rows.length
      ? rows
          .map((row) => {
            const value = count(row[primary]);
            const label = options.label(row);
            const detail = options.detail
              ? options.detail(row)
              : `${number.format(value)} ${primary === "visitors" ? "Besucher" : "Aufrufe"}`;
            return `<div class="analysis-list-row">
              <div><strong title="${esc(label)}">${esc(label)}</strong><span>${esc(detail)}</span></div>
              <em>${number.format(value)}</em>
              <span class="analysis-list-bar" aria-hidden="true"><i style="width:${Math.round((value / maximum) * 100)}%"></i></span>
            </div>`;
          })
          .join("")
      : '<p class="analysis-empty">Noch keine Daten in diesem Zeitraum.</p>';
  }

  function renderAudience(payload) {
    const range = payload.range || {};
    periodEl.textContent = `${dateLabel(range.from, { day: "2-digit", month: "2-digit", year: "numeric" })} bis ${dateLabel(range.to, { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    renderKpis(payload);
    renderTimeline(payload);
    renderList(pagesEl, payload.pages || [], {
      label: (row) => pathLabel(row.path),
      detail: (row) => `${number.format(row.views)} Aufrufe · ${row.path}`,
    });
    renderList(entriesEl, payload.entries || [], {
      primary: "visitors",
      label: (row) => pathLabel(row.path),
      detail: (row) => `${number.format(row.visitors)} Besucher · ${row.path}`,
    });
    renderList(sourcesEl, payload.sources || [], {
      primary: "visitors",
      label: (row) => sourceLabels[row.key] || row.key,
      detail: (row) => `${number.format(row.visitors)} Besucher · ${number.format(row.views)} Aufrufe`,
    });
    renderList(devicesEl, payload.devices || [], {
      primary: "visitors",
      label: (row) => deviceLabels[row.key] || row.key,
      detail: (row) => `${number.format(row.visitors)} Besucher · ${number.format(row.views)} Aufrufe`,
    });
    renderList(countriesEl, payload.countries || [], {
      primary: "visitors",
      label: (row) => countryLabel(row.key),
      detail: (row) => `${number.format(row.visitors)} Besucher · ${number.format(row.views)} Aufrufe`,
    });
    renderList(groupsEl, payload.page_groups || [], {
      label: (row) => groupLabels[row.key] || row.key,
      detail: (row) => `${number.format(row.views)} Aufrufe`,
    });

    const byHour = new Map((payload.hours || []).map((row) => [Number(row.hour), count(row.views)]));
    const hourMaximum = Math.max(1, ...byHour.values());
    hoursEl.innerHTML = Array.from({ length: 24 }, (_, hour) => {
      const views = byHour.get(hour) || 0;
      const height = views ? Math.max(3, Math.round((views / hourMaximum) * 100)) : 0;
      return `<div title="${hour}:00 Uhr: ${number.format(views)} Aufrufe"><i style="height:${height}%"><span>${number.format(views)}</span></i><small>${hour}</small></div>`;
    }).join("");
  }

  function funnelCount(counts, event) {
    return count(counts?.[event]);
  }

  function renderConversionBreakdown(container, groups, labels, startEvent) {
    const rows = Object.entries(groups)
      .map(([key, eventCounts]) => ({
        key,
        starts: funnelCount(eventCounts, startEvent),
        saved: funnelCount(eventCounts, "lead_saved"),
      }))
      .filter((row) => row.starts || row.saved)
      .sort((a, b) => b.starts - a.starts || b.saved - a.saved);
    container.innerHTML = rows.length
      ? rows.map((row) => `<div class="review-funnel-breakdown-row">
          <strong>${esc(labels[row.key] || row.key)}</strong>
          <span>${number.format(row.starts)} Starts · ${number.format(row.saved)} gespeichert</span>
          <em>${percent(row.saved, row.starts)} %</em>
        </div>`).join("")
      : '<p class="review-funnel-empty">Noch keine Daten.</p>';
  }

  function populateFunnelTypes() {
    const selected = funnelTypeEl.value;
    const available = Object.keys(funnelTypeLabels).filter((type) =>
      Object.values(funnelPayload?.by_type?.[type] || {}).some((value) => count(value) > 0),
    );
    funnelTypeEl.innerHTML = [
      '<option value="all">Alle Instrumente</option>',
      ...available.map((type) => `<option value="${esc(type)}">${esc(funnelTypeLabels[type])}</option>`),
    ].join("");
    funnelTypeEl.value = available.includes(selected) ? selected : "all";
  }

  function renderFunnel() {
    if (!funnelPayload) return;
    const selectedType = funnelTypeEl.value;
    const counts = selectedType === "all"
      ? funnelPayload.totals || {}
      : funnelPayload.by_type?.[selectedType] || {};
    const stepEvents = (funnelPayload.events?.steps || []).filter(
      (event) => selectedType === "all" || event !== "wizard_opened",
    );
    const startCount = funnelCount(counts, stepEvents[0]);
    const savedCount = funnelCount(counts, "lead_saved");
    const range = funnelPayload.range || {};
    funnelPeriodEl.textContent = `${dateLabel(range.from)} bis ${dateLabel(range.to)}`;
    funnelSummaryEl.innerHTML = startCount
      ? `<strong>${percent(savedCount, startCount)} %</strong><span>vom Start bis zur gespeicherten Anfrage</span>`
      : "<span>Noch keine Funnel-Daten in diesem Zeitraum.</span>";
    const scale = Math.max(1, ...stepEvents.map((event) => funnelCount(counts, event)));
    funnelStepsEl.innerHTML = stepEvents.map((event, index) => {
      const value = funnelCount(counts, event);
      const previous = index ? funnelCount(counts, stepEvents[index - 1]) : value;
      const difference = previous - value;
      const comparison = index === 0
        ? "Ausgangspunkt"
        : difference >= 0
          ? `${number.format(difference)} weniger als davor`
          : `${number.format(Math.abs(difference))} mehr als davor`;
      const width = value ? Math.max(3, Math.round((value / scale) * 100)) : 0;
      return `<div class="review-funnel-step">
        <div class="review-funnel-step-head"><strong>${esc(funnelLabels[event] || event)}</strong><span>${number.format(value)}</span></div>
        <div class="review-funnel-track" aria-hidden="true"><span style="width:${width}%"></span></div>
        <small>${percent(value, startCount)} % vom Start · ${esc(comparison)}</small>
      </div>`;
    }).join("");
    const metrics = (events) => (events || []).map((event) => `<div><strong>${number.format(funnelCount(counts, event))}</strong><span>${esc(funnelLabels[event] || event)}</span></div>`).join("");
    funnelPhotosEl.innerHTML = metrics(funnelPayload.events?.photos);
    funnelErrorsEl.innerHTML = metrics(funnelPayload.events?.diagnostics);
    funnelFrictionEl.innerHTML = metrics(funnelPayload.events?.friction);
    const startEvent = selectedType === "all" ? "wizard_opened" : "type_selected";
    const deviceData = selectedType === "all"
      ? funnelPayload.by_device || {}
      : funnelPayload.by_device_type?.[selectedType] || {};
    const breakdownData = selectedType === "all"
      ? funnelPayload.breakdowns || {}
      : funnelPayload.breakdowns_by_type?.[selectedType] || {};
    renderConversionBreakdown(funnelDevicesEl, deviceData, deviceLabels, startEvent);
    renderConversionBreakdown(funnelEntryEl, breakdownData.entry_page || {}, entryLabels, startEvent);
    renderConversionBreakdown(funnelSourcesEl, breakdownData.source_group || {}, sourceLabels, startEvent);
  }

  async function loadData() {
    if (!api || !token) {
      lockDashboard(false, api ? "" : "Die API-Konfiguration fehlt.");
      return;
    }
    const sequence = ++requestSequence;
    pageError.hidden = true;
    root.classList.add("is-loading");
    try {
      const [analyticsResponse, funnelResponse] = await Promise.all([
        apiFetch(`${api}/api/review/analytics?days=${days}`),
        apiFetch(`${api}/api/review/funnel?days=${days}`),
      ]);
      if (sequence !== requestSequence) return;
      if (analyticsResponse.status === 401 || funnelResponse.status === 401) {
        token = "";
        sessionStorage.removeItem("review-token");
        lockDashboard(true);
        return;
      }
      if (!analyticsResponse.ok || !funnelResponse.ok)
        throw new Error(`HTTP ${analyticsResponse.status}/${funnelResponse.status}`);
      const [analytics, funnel] = await Promise.all([
        analyticsResponse.json(),
        funnelResponse.json(),
      ]);
      if (sequence !== requestSequence) return;
      funnelPayload = funnel;
      renderAudience(analytics);
      populateFunnelTypes();
      renderFunnel();
      unlockDashboard();
    } catch (error) {
      console.error(error);
      if (dashboard.hidden) {
        lockDashboard(false, "Die Analyse konnte nicht geladen werden. Bitte Zugangsschlüssel und API-Konfiguration prüfen.");
      } else {
        pageError.textContent = "Die aktuellen Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.";
        pageError.hidden = false;
      }
    } finally {
      if (sequence === requestSequence) root.classList.remove("is-loading");
      setLoginBusy(false);
    }
  }

  funnelTypeEl.addEventListener("change", renderFunnel);
  root.querySelectorAll("[data-analysis-days]").forEach((button) => {
    button.addEventListener("click", () => {
      days = Number(button.dataset.analysisDays);
      root.querySelectorAll("[data-analysis-days]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      void loadData();
    });
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const entered = loginInput.value.trim();
    if (!entered) return;
    token = entered;
    sessionStorage.setItem("review-token", token);
    authError.textContent = "";
    setLoginBusy(true);
    void loadData();
  });

  if (token) {
    setLoginBusy(true);
    void loadData();
  } else {
    lockDashboard();
  }
})();
