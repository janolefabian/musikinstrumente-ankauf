(() => {
  const root = document.querySelector("[data-review]");
  if (!root) return;

  const authGateEl = root.querySelector("[data-review-auth-gate]");
  const dashboardEl = root.querySelector("[data-review-dashboard]");
  const loginFormEl = root.querySelector("[data-review-login]");
  const loginInputEl = root.querySelector("[data-review-token]");
  const loginSubmitEl = root.querySelector("[data-review-login-submit]");
  const authErrorEl = root.querySelector("[data-auth-error]");
  const listEl = root.querySelector("[data-review-grid]");
  const detailEl = root.querySelector("[data-review-detail]");
  const searchEl = root.querySelector("[data-review-search]");
  const resultCountEl = root.querySelector("[data-result-count]");
  const loadMoreEl = root.querySelector("[data-load-more]");
  const bulkBarEl = root.querySelector("[data-bulk-bar]");
  const selectPageEl = root.querySelector("[data-select-page]");
  const selectionCountEl = root.querySelector("[data-selection-count]");
  const bulkArchiveEl = root.querySelector("[data-bulk-archive]");
  const bulkDeleteEl = root.querySelector("[data-bulk-delete]");
  const lightbox = root.querySelector("[data-lightbox]");
  const actionDialogEl = root.querySelector("[data-action-dialog]");
  const actionDialogEyebrowEl = root.querySelector(
    "[data-action-dialog-eyebrow]",
  );
  const actionDialogTitleEl = root.querySelector("[data-action-dialog-title]");
  const actionDialogMessageEl = root.querySelector(
    "[data-action-dialog-message]",
  );
  const actionDialogCancelButton = root.querySelector(
    "[data-action-dialog-cancel-button]",
  );
  const actionDialogConfirmButton = root.querySelector(
    "[data-action-dialog-confirm]",
  );
  const api = root.dataset.apiBase || "";
  const fallbackImage = "/images/header_instrumente-640.webp";

  const demo = [
    {
      id: "DEMO-184",
      class: "A",
      notable: true,
      title: "2 Kontrabässe + 3 Bögen",
      city: "Hamburg",
      summary:
        "Nachlass eines Berufsmusikers · mehrere Bögen · Stempel auf einem Bogen sichtbar",
      score: 96,
      confidence: 63,
      thumbnail: "/images/header_instrumente-640.webp",
      name: "Anna Beispiel",
      maker: "unbekannt",
      status: "archived",
      created_at: new Date().toISOString(),
      photo_count: 7,
    },
    {
      id: "DEMO-185",
      class: "C",
      notable: false,
      title: "Gitarre",
      city: "Berlin",
      summary: "Serieninstrument · wenige Auffälligkeiten",
      score: 9,
      confidence: 95,
      thumbnail: "/images/violine-960.webp",
      name: "Max Beispiel",
      maker: "Yamaha",
      status: "new",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      photo_count: 3,
    },
    {
      id: "DEMO-186",
      class: "B",
      notable: true,
      title: "Unbekannter Bogen",
      city: "Bremen",
      summary:
        "Bogenart unsicher · eingeprägter Stempel sichtbar · manuell prüfen",
      score: 67,
      confidence: 31,
      thumbnail: "/images/testimonials/rol-180.webp",
      name: "Lisa Beispiel",
      maker: "unbekannt",
      status: "new",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      photo_count: 4,
    },
  ];

  // Keep the privileged review credential only for the current tab session.
  // Remove the former persistent copy once so an old token is not left behind.
  localStorage.removeItem("review-token");
  let leads = [];
  let token = sessionStorage.getItem("review-token") || "";
  let currentFilter = "all";
  let currentQuery = "";
  let selectedId = null;
  let currentImages = [];
  let lightboxIndex = 0;
  let lightboxRequest = 0;
  let nextCursor = null;
  let hasMore = false;
  let filteredTotal = 0;
  let loadingPage = false;
  let requestSequence = 0;
  let detailSequence = 0;
  let searchTimer = 0;
  let actionDialogResolver = null;
  let actionDialogPreviousFocus = null;
  let dashboardUnlocked = false;
  const imageCache = new Map();
  const objectUrls = new Set();
  const imageQueue = [];
  const selectedLeadIds = new Set();
  let activeImageLoads = 0;
  const statusFilters = new Set([
    "new",
    "interesting",
    "contacted",
    "purchased",
    "declined",
    "archived",
  ]);

  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c],
    );
  const norm = (s) =>
    String(s ?? "")
      .toLocaleLowerCase("de-DE")
      .trim();
  const fmtDate = (value) =>
    value
      ? new Date(value).toLocaleString("de-DE", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "";
  const statusLabel = (status) =>
    ({
      new: "Neu",
      contacted: "Kontaktiert",
      interesting: "Interessant",
      purchased: "Angekauft",
      declined: "Nicht interessant",
      archived: "Archiviert",
    })[status] ||
    status ||
    "Neu";

  function bucket(lead) {
    if (lead.status === "archived") return "archived";
    if (lead.class === "A") return "urgent";
    if (lead.notable) return "notable";
    if (lead.class === "B") return "week";
    if (lead.class === "C") return "c";
    return "all";
  }

  function searchable(lead) {
    return norm(
      [
        lead.id,
        lead.title,
        lead.city,
        lead.summary,
        lead.name,
        lead.maker,
        lead.email,
        lead.phone,
        lead.type,
        lead.classified_type,
      ].join(" "),
    );
  }

  function matchesFilter(lead, filter = currentFilter) {
    const status = lead.status || "new";
    if (statusFilters.has(filter)) return status === filter;
    if (status === "archived") return false;
    return filter === "all" || bucket(lead) === filter;
  }

  function demoLeads() {
    return demo.filter(
      (lead) =>
        matchesFilter(lead) &&
        (!currentQuery || searchable(lead).includes(norm(currentQuery))),
    );
  }

  function countsFor(items) {
    const counts = {
      urgent: 0,
      notable: 0,
      week: 0,
      c: 0,
      all: 0,
      new: 0,
      interesting: 0,
      contacted: 0,
      purchased: 0,
      declined: 0,
      archived: 0,
    };
    for (const lead of items) {
      const name = bucket(lead);
      if (name === "archived") counts.archived += 1;
      else {
        counts.all += 1;
        if (counts[name] !== undefined) counts[name] += 1;
        const status = lead.status || "new";
        if (counts[status] !== undefined) counts[status] += 1;
      }
    }
    return counts;
  }

  function updateCounts(counts) {
    root.querySelectorAll("[data-count]").forEach((element) => {
      const count = Number(counts?.[element.dataset.count] || 0);
      element.textContent = count ? `(${count})` : "";
    });
  }

  function syncSelectionUI() {
    const loadedIds = leads.map((lead) => lead.id);
    const selectedLoaded = loadedIds.filter((id) => selectedLeadIds.has(id));
    const count = selectedLeadIds.size;
    selectionCountEl.textContent = count
      ? `${count} ausgewählt`
      : "Auswählen";
    selectPageEl.checked =
      loadedIds.length > 0 && selectedLoaded.length === loadedIds.length;
    selectPageEl.indeterminate =
      selectedLoaded.length > 0 && selectedLoaded.length < loadedIds.length;
    bulkArchiveEl.disabled = count === 0 || currentFilter === "archived";
    bulkArchiveEl.hidden = currentFilter === "archived";
    bulkDeleteEl.disabled = count === 0;
    listEl.querySelectorAll("[data-lead-row]").forEach((row) => {
      const selected = selectedLeadIds.has(row.dataset.leadRow);
      row.classList.toggle("bulk-selected", selected);
      const checkbox = row.querySelector("[data-select-lead]");
      if (checkbox) checkbox.checked = selected;
    });
  }

  function clearSelection() {
    selectedLeadIds.clear();
    syncSelectionUI();
  }

  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  }

  function closeActionDialog(result = false) {
    if (actionDialogEl.hidden) return;
    actionDialogEl.hidden = true;
    actionDialogEl.setAttribute("aria-hidden", "true");
    document.body.classList.remove("review-dialog-open");
    const resolver = actionDialogResolver;
    actionDialogResolver = null;
    if (actionDialogPreviousFocus?.focus) actionDialogPreviousFocus.focus();
    actionDialogPreviousFocus = null;
    if (resolver) resolver(result);
  }

  function showActionDialog({
    eyebrow = "Bestätigung",
    title = "Aktion bestätigen",
    message,
    confirmLabel = "Bestätigen",
    cancelLabel = "Abbrechen",
    danger = false,
  }) {
    if (actionDialogResolver) closeActionDialog(false);
    actionDialogPreviousFocus = document.activeElement;
    actionDialogEyebrowEl.textContent = eyebrow;
    actionDialogTitleEl.textContent = title;
    actionDialogMessageEl.textContent = message;
    actionDialogConfirmButton.textContent = confirmLabel;
    actionDialogConfirmButton.classList.toggle("danger-action", danger);
    actionDialogCancelButton.textContent = cancelLabel;
    actionDialogCancelButton.hidden = !cancelLabel;
    actionDialogEl.hidden = false;
    actionDialogEl.setAttribute("aria-hidden", "false");
    document.body.classList.add("review-dialog-open");
    window.requestAnimationFrame(() => actionDialogConfirmButton.focus());
    return new Promise((resolve) => {
      actionDialogResolver = resolve;
    });
  }

  function showActionNotice(message, title = "Aktion fehlgeschlagen") {
    return showActionDialog({
      eyebrow: "Hinweis",
      title,
      message,
      confirmLabel: "Schließen",
      cancelLabel: "",
    });
  }

  function setLoginBusy(busy) {
    loginInputEl.disabled = busy;
    loginSubmitEl.disabled = busy;
    loginSubmitEl.textContent = busy ? "Wird geprüft …" : "Dashboard öffnen";
  }

  function unlockDashboard() {
    dashboardUnlocked = true;
    authGateEl.hidden = true;
    dashboardEl.hidden = false;
    authErrorEl.textContent = "";
    setLoginBusy(false);
  }

  function renderAuthGate(invalid = false, message = "") {
    dashboardUnlocked = false;
    dashboardEl.hidden = true;
    authGateEl.hidden = false;
    unobserveImages(listEl);
    leads = [];
    filteredTotal = 0;
    hasMore = false;
    selectedLeadIds.clear();
    resultCountEl.textContent = "";
    bulkBarEl.hidden = true;
    loadMoreEl.hidden = true;
    listEl.innerHTML = "";
    detailEl.innerHTML = "";
    authErrorEl.textContent = message || (invalid
      ? "Der Zugangsschlüssel ist nicht korrekt. Bitte versuchen Sie es erneut."
      : "");
    loginInputEl.value = "";
    setLoginBusy(false);
    syncSelectionUI();
    loginInputEl.focus();
  }

  function runImageQueue() {
    while (activeImageLoads < 4 && imageQueue.length) {
      const job = imageQueue.shift();
      activeImageLoads += 1;
      job
        .task()
        .then(job.resolve, job.reject)
        .finally(() => {
          activeImageLoads -= 1;
          runImageQueue();
        });
    }
  }

  function queuedImage(task) {
    return new Promise((resolve, reject) => {
      imageQueue.push({ task, resolve, reject });
      runImageQueue();
    });
  }

  function protectedImage(url) {
    if (!url) return Promise.resolve(fallbackImage);
    if (!api) return Promise.resolve(url);
    if (imageCache.has(url)) return imageCache.get(url);
    const promise = apiFetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Bild ${response.status}`);
        const objectUrl = URL.createObjectURL(await response.blob());
        objectUrls.add(objectUrl);
        return objectUrl;
      })
      .catch((error) => {
        imageCache.delete(url);
        console.error(error);
        return fallbackImage;
      });
    imageCache.set(url, promise);
    return promise;
  }

  async function loadImage(element) {
    if (element.dataset.loading === "true" || element.dataset.loaded === "true")
      return;
    element.dataset.loading = "true";
    const source = await queuedImage(() =>
      element.isConnected
        ? protectedImage(element.dataset.protectedImage)
        : Promise.resolve(null),
    );
    if (!element.isConnected || !source) return;
    element.onload = () => {
      element.dataset.loaded = "true";
      element.closest(".protected-image-shell")?.classList.remove("is-loading");
    };
    element.src = source;
  }

  const imageObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            imageObserver.unobserve(entry.target);
            loadImage(entry.target);
          }
        },
        { rootMargin: "180px" },
      )
    : null;

  function observeImages(scope) {
    scope.querySelectorAll("img[data-protected-image]").forEach((image) => {
      if (imageObserver) imageObserver.observe(image);
      else loadImage(image);
    });
  }

  function unobserveImages(scope) {
    if (!imageObserver) return;
    scope.querySelectorAll("img[data-protected-image]").forEach((image) => {
      imageObserver.unobserve(image);
    });
  }

  function setUrlLead(id, replace = false) {
    const url = new URL(location.href);
    if (id) url.searchParams.set("lead", id);
    else url.searchParams.delete("lead");
    history[replace ? "replaceState" : "pushState"]({}, "", url);
  }

  function confidenceBadge(confidence) {
    const number = Number(confidence);
    return Number.isFinite(number) && number < 50
      ? '<span class="badge uncertain">KI unsicher</span>'
      : "";
  }

  function renderSkeletons() {
    bulkBarEl.hidden = false;
    unobserveImages(listEl);
    listEl.innerHTML = Array.from(
      { length: 6 },
      () => `
        <div class="lead-row lead-row-skeleton" aria-hidden="true">
          <span class="lead-select-placeholder"></span>
          <div class="lead-row-open">
            <span class="lead-thumb protected-image-shell is-loading"></span>
            <div class="lead-row-body">
              <span class="skeleton-line short"></span>
              <span class="skeleton-line title"></span>
              <span class="skeleton-line"></span>
              <span class="skeleton-line medium"></span>
            </div>
          </div>
        </div>`,
    ).join("");
    resultCountEl.textContent = "Wird geladen …";
    loadMoreEl.hidden = true;
  }

  function renderList() {
    bulkBarEl.hidden = false;
    resultCountEl.textContent = `${filteredTotal} ${filteredTotal === 1 ? "Anfrage" : "Anfragen"}`;
    unobserveImages(listEl);
    listEl.innerHTML =
      leads
        .map((lead) => {
          const thumbnail = lead.thumbnail || lead.image || fallbackImage;
          return `
            <div class="lead-row${lead.id === selectedId ? " selected" : ""}${selectedLeadIds.has(lead.id) ? " bulk-selected" : ""}" data-lead-row="${esc(lead.id)}">
              <label class="lead-select" title="Anfrage auswählen">
                <input type="checkbox" data-select-lead value="${esc(lead.id)}" aria-label="${esc(lead.title || "Anfrage")} auswählen" ${selectedLeadIds.has(lead.id) ? "checked" : ""}>
              </label>
              <button class="lead-row-open" data-open="${esc(lead.id)}" type="button">
                <span class="lead-thumb protected-image-shell is-loading">
                  <img data-protected-image="${esc(thumbnail)}" alt="Vorschaubild der Anfrage" width="92" height="92">
                </span>
                <div class="lead-row-body">
                  <div class="lead-row-top">
                    <div class="lead-badges">
                      <span class="badge ${lead.class === "A" ? "hot" : ""}">${esc(lead.class || "?")}</span>
                      ${lead.notable ? '<span class="badge notable">Auffällig</span>' : ""}
                      ${confidenceBadge(lead.confidence)}
                    </div>
                    <time>${esc(fmtDate(lead.created_at))}</time>
                  </div>
                  <h3>${esc(lead.title || "Anfrage")}</h3>
                  <p class="lead-meta">${esc(lead.city || "Ort unbekannt")}${lead.name ? ` · ${esc(lead.name)}` : ""}</p>
                  <p class="lead-row-summary">${esc(lead.summary || "")}</p>
                  <div class="lead-row-footer"><span>${esc(statusLabel(lead.status))}</span><span>${esc(lead.photo_count ?? "")}${lead.photo_count != null ? " Fotos" : ""}</span><span>Interesse ${esc(lead.score ?? "?")}</span></div>
                </div>
              </button>
            </div>`;
        })
        .join("") ||
      '<div class="review-no-results"><p>Keine Anfragen in dieser Ansicht.</p></div>';
    listEl.querySelectorAll("[data-open]").forEach((button) => {
      button.onclick = () => openLead(button.dataset.open);
    });
    listEl.querySelectorAll("[data-select-lead]").forEach((checkbox) => {
      checkbox.onchange = () => {
        if (checkbox.checked) selectedLeadIds.add(checkbox.value);
        else selectedLeadIds.delete(checkbox.value);
        syncSelectionUI();
      };
    });
    observeImages(listEl);
    syncSelectionUI();
    loadMoreEl.hidden = !hasMore;
    loadMoreEl.disabled = loadingPage;
    loadMoreEl.textContent = loadingPage
      ? "Wird geladen …"
      : "Weitere Anfragen laden";
  }

  async function loadLeads({ reset = false } = {}) {
    if (!api) {
      unlockDashboard();
      if (reset) selectedLeadIds.clear();
      leads = demoLeads();
      filteredTotal = leads.length;
      hasMore = false;
      updateCounts(countsFor(demo));
      renderList();
      return;
    }
    if (loadingPage && !reset) return;
    const sequence = ++requestSequence;
    loadingPage = true;
    if (reset) {
      selectedLeadIds.clear();
      leads = [];
      nextCursor = null;
      hasMore = false;
      renderSkeletons();
    } else {
      renderList();
    }
    const params = new URLSearchParams({
      limit: "30",
      filter: currentFilter,
    });
    if (currentQuery) params.set("q", currentQuery);
    if (!reset && nextCursor) params.set("cursor", nextCursor);
    try {
      const response = await apiFetch(`${api}/api/review?${params}`);
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      const payload = await response.json();
      if (sequence !== requestSequence) return;
      const items = Array.isArray(payload) ? payload : payload.items || [];
      leads = reset ? items : [...leads, ...items];
      filteredTotal = Array.isArray(payload)
        ? leads.length
        : Number(payload.filtered_total || 0);
      hasMore = Array.isArray(payload) ? false : Boolean(payload.has_more);
      nextCursor = Array.isArray(payload) ? null : payload.next_cursor || null;
      updateCounts(
        Array.isArray(payload) ? countsFor(leads) : payload.counts || {},
      );
      unlockDashboard();
      renderList();
    } catch (error) {
      if (sequence !== requestSequence) return;
      // A missing or expired review key is an expected login state, not a
      // dashboard failure worth reporting in the browser console.
      if (error.status !== 401) console.error(error);
      if (reset) {
        if (error.status === 401) {
          const invalid = Boolean(token);
          token = "";
          sessionStorage.removeItem("review-token");
          localStorage.removeItem("review-token");
          renderAuthGate(invalid);
          return;
        }
        const message =
          error.status === 503
              ? "Der Review-Zugang ist im Worker noch nicht eingerichtet."
              : "Die Dashboard-API ist gerade nicht erreichbar. Bitte prüfen, ob der lokale Worker läuft.";
        if (!dashboardUnlocked) {
          renderAuthGate(false, message);
          return;
        }
        listEl.innerHTML =
          `<div class="review-no-results"><p>${message}</p><button class="ghost-button" type="button" data-retry-dashboard>Erneut versuchen</button></div>`;
        listEl.querySelector("[data-retry-dashboard]").onclick = () =>
          loadLeads({ reset: true });
      } else renderList();
    } finally {
      if (sequence === requestSequence) {
        loadingPage = false;
        loadMoreEl.disabled = false;
        loadMoreEl.textContent = "Weitere Anfragen laden";
      }
    }
  }

  function renderDemoDetail(id) {
    const lead = leads.find((item) => item.id === id) || demo[0];
    if (!lead) return;
    detailEl.innerHTML = `<div class="review-empty-state"><p class="eyebrow">Demo</p><h2>${esc(lead.title)}</h2><p>Mit verbundenem Worker erscheinen hier alle Bilder, Angaben und KI-Signale.</p></div>`;
  }

  function markSelectedRow() {
    listEl.querySelectorAll("[data-lead-row]").forEach((row) => {
      row.classList.toggle("selected", row.dataset.leadRow === selectedId);
    });
  }

  async function openLead(id, options = {}) {
    const sequence = ++detailSequence;
    selectedId = id;
    markSelectedRow();
    if (!options.keepUrl) setUrlLead(id);
    root.classList.add("has-selection");
    unobserveImages(detailEl);
    detailEl.innerHTML =
      '<div class="detail-loading"><span class="detail-loading-mark"></span>Anfrage wird geladen …</div>';

    if (!api) {
      renderDemoDetail(id);
      return;
    }

    try {
      const response = await apiFetch(
        `${api}/api/review/${encodeURIComponent(id)}`,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const lead = await response.json();
      if (sequence !== detailSequence) return;
      currentImages = (lead.photos || []).map((photo) => ({
        ...photo,
        thumbnail: photo.thumbnail_url || photo.url,
      }));
      const signals = lead.ai?.signals || [];
      const title = lead.ai?.title || lead.type || "Anfrage";
      const confidence = Number(lead.confidence);

      detailEl.innerHTML = `
        <div class="detail-top">
          <button class="ghost-button detail-mobile-back" data-close type="button">← Anfragen</button>
          <div class="lead-badges">
            <span class="badge ${lead.lead_class === "A" ? "hot" : ""}">${esc(lead.lead_class || "?")}</span>
            ${lead.notable ? '<span class="badge notable">Auffällig</span>' : ""}
            ${confidenceBadge(confidence)}
            <span class="badge">Interesse ${esc(lead.interest_score ?? "?")}</span>
            <span class="badge">Sicherheit ${esc(lead.confidence ?? "?")}</span>
            <span class="badge status-badge">${esc(statusLabel(lead.status))}</span>
          </div>
        </div>
        <h2>${esc(title)}</h2>
        <p class="lead-meta">${esc(lead.city || "Ort unbekannt")} · ${esc(lead.id)} · ${esc(fmtDate(lead.created_at))}</p>
        ${lead.summary ? `<p class="detail-summary">${esc(lead.summary)}</p>` : ""}
        ${Number.isFinite(confidence) && confidence < 50 ? '<div class="uncertainty-note"><strong>Manuell prüfen.</strong> Die automatische Einordnung ist hier unsicher.</div>' : ""}

        <div class="detail-gallery-header"><h3>Fotos</h3><span>${currentImages.length}</span></div>
        <div class="detail-grid">
          ${currentImages.length ? currentImages.map((photo, index) => `<button class="detail-photo" type="button" data-image-index="${index}"><span class="detail-image protected-image-shell is-loading"><img data-protected-image="${esc(photo.thumbnail)}" alt="${esc(photo.label || "Foto")}" width="480" height="360"></span><span>${esc(photo.label || photo.kind || `Foto ${index + 1}`)}</span></button>`).join("") : "<p>Keine Fotos vorhanden.</p>"}
        </div>

        <div class="detail-columns">
          <section>
            <h3>Kontakt & Angaben</h3>
            <dl>
              <dt>Name</dt><dd>${esc(lead.name || "–")}</dd>
              <dt>E-Mail</dt><dd>${lead.email ? `<a href="mailto:${encodeURIComponent(lead.email)}">${esc(lead.email)}</a>` : "–"}</dd>
              <dt>Telefon</dt><dd>${lead.phone ? `<a href="tel:${esc(lead.phone.replace(/[^+0-9]/g, ""))}">${esc(lead.phone)}</a>` : "–"}</dd>
              <dt>Ort</dt><dd>${esc(lead.city || "–")}</dd>
              <dt>Hersteller / Name</dt><dd>${esc(lead.maker || "–")}</dd>
              <dt>Geschichte / Herkunft</dt><dd>${esc(lead.story || "–")}</dd>
            </dl>
          </section>
          <section>
            <h3>Auffälligkeiten</h3>
            <ul>${signals.length ? signals.map((signal) => `<li>${esc(signal)}</li>`).join("") : "<li>Keine zusätzlichen Signale.</li>"}</ul>
            <p class="mini-note">Make: ${esc(lead.make_status || "–")}</p>
          </section>
        </div>

        <div class="status-panel">
          <div><p class="eyebrow">Bearbeitung</p><h3>Status setzen</h3></div>
          <div class="status-actions">
            <button data-status="interesting" type="button">Interessant</button>
            <button data-status="contacted" type="button">Kontaktiert</button>
            <button data-status="purchased" type="button">Angekauft</button>
            <button data-status="declined" type="button">Nicht interessant</button>
            <button data-status="archived" type="button">Archivieren</button>
            <button class="danger-action" data-delete type="button">Löschen</button>
          </div>
          <div class="status-note" data-status-note></div>
          <p class="keyboard-hint">Tastatur: <kbd>J</kbd>/<kbd>K</kbd> nächster/vorheriger Lead · <kbd>I</kbd> interessant · <kbd>C</kbd> kontaktiert · <kbd>P</kbd> angekauft</p>
        </div>`;

      detailEl.querySelector("[data-close]").onclick = closeMobileDetail;
      detailEl.querySelectorAll("[data-image-index]").forEach((button) => {
        button.onclick = () => openLightbox(Number(button.dataset.imageIndex));
      });
      detailEl.querySelectorAll("[data-status]").forEach((button) => {
        button.onclick = () => setStatus(id, button.dataset.status);
      });
      detailEl.querySelector("[data-delete]").onclick = () => deleteLead(id);
      observeImages(detailEl);
    } catch (error) {
      if (sequence !== detailSequence) return;
      console.error(error);
      detailEl.innerHTML =
        '<div class="review-empty-state"><h2>Anfrage konnte nicht geladen werden.</h2><p>Bitte API-Verbindung und Review-Zugang prüfen.</p></div>';
    }
  }

  async function deleteLead(id) {
    const confirmed = await showActionDialog({
      title: "Anfrage endgültig löschen?",
      message: "Diese Aktion kann nicht rückgängig gemacht werden.",
      confirmLabel: "Endgültig löschen",
      danger: true,
    });
    if (!confirmed) return;
    if (!api) {
      const index = demo.findIndex((lead) => lead.id === id);
      if (index >= 0) demo.splice(index, 1);
      closeMobileDetail();
      loadLeads({ reset: true });
      return;
    }
    const response = await apiFetch(
      `${api}/api/review/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      await showActionNotice(
        "Die Anfrage konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
      );
      return;
    }
    closeMobileDetail();
    await loadLeads({ reset: true });
  }

  async function setStatus(id, status) {
    if (!api) return;
    const note = detailEl.querySelector("[data-status-note]");
    if (note) note.textContent = "Wird gespeichert …";
    const response = await apiFetch(
      `${api}/api/review/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (response.ok) {
      const lead = leads.find((item) => item.id === id);
      if (lead) lead.status = status;
      const rowStatus = listEl.querySelector(
        `[data-open="${CSS.escape(id)}"] .lead-row-footer span`,
      );
      if (rowStatus) rowStatus.textContent = statusLabel(status);
      if (note) note.textContent = `Status: ${statusLabel(status)}`;
      const badge = detailEl.querySelector(".status-badge");
      if (badge) badge.textContent = statusLabel(status);
      if (lead && !matchesFilter(lead)) {
        closeMobileDetail();
        await loadLeads({ reset: true });
      }
    } else if (note) {
      note.textContent = "Status konnte nicht gespeichert werden.";
    }
  }

  async function runBulkAction(action) {
    const ids = [...selectedLeadIds];
    if (!ids.length) return;
    if (action === "delete") {
      const confirmed = await showActionDialog({
        title: `${ids.length} ${ids.length === 1 ? "Anfrage" : "Anfragen"} endgültig löschen?`,
        message: "Diese Aktion kann nicht rückgängig gemacht werden.",
        confirmLabel: "Endgültig löschen",
        danger: true,
      });
      if (!confirmed) return;
    }

    bulkArchiveEl.disabled = true;
    bulkDeleteEl.disabled = true;
    const actionButton = action === "archive" ? bulkArchiveEl : bulkDeleteEl;
    const originalLabel = actionButton.textContent;
    actionButton.textContent = "Wird ausgeführt …";
    try {
      if (!api) {
        if (action === "archive") {
          for (const lead of demo) {
            if (selectedLeadIds.has(lead.id)) lead.status = "archived";
          }
        } else {
          for (let index = demo.length - 1; index >= 0; index--) {
            if (selectedLeadIds.has(demo[index].id)) demo.splice(index, 1);
          }
        }
      } else {
        const response = await apiFetch(`${api}/api/review/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, action }),
        });
        if (response.status === 404 || response.status === 405) {
          // Older Worker versions do not expose the bulk endpoint yet. Keep the
          // dashboard usable by applying the same action through the established
          // per-lead endpoints until every edge serves the current Worker.
          for (const id of ids) {
            const fallbackResponse = await apiFetch(
              `${api}/api/review/${encodeURIComponent(id)}`,
              action === "archive"
                ? {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "archived" }),
                  }
                : { method: "DELETE" },
            );
            if (!fallbackResponse.ok)
              throw new Error(
                `Fallback HTTP ${fallbackResponse.status} (${id})`,
              );
          }
        } else if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
          );
        }
      }
      if (selectedId && selectedLeadIds.has(selectedId)) closeMobileDetail();
      await loadLeads({ reset: true });
    } catch (error) {
      console.error(error);
      await showActionNotice(
        action === "archive"
          ? "Die ausgewählten Anfragen konnten nicht archiviert werden."
          : "Die ausgewählten Anfragen konnten nicht gelöscht werden.",
      );
      syncSelectionUI();
    } finally {
      actionButton.textContent = originalLabel;
    }
  }

  function closeMobileDetail(options = {}) {
    detailSequence += 1;
    root.classList.remove("has-selection");
    selectedId = null;
    markSelectedRow();
    if (!options.keepUrl) setUrlLead(null);
    unobserveImages(detailEl);
    detailEl.innerHTML =
      '<div class="review-empty-state"><p class="eyebrow">Auswahl</p><h2>Anfrage auswählen</h2><p>Links eine Anfrage öffnen. Mit <kbd>J</kbd> und <kbd>K</kbd> können Sie schnell durch die Liste gehen.</p></div>';
  }

  async function openLightbox(index) {
    if (!currentImages.length) return;
    lightboxIndex = Math.max(0, Math.min(index, currentImages.length - 1));
    const requestId = ++lightboxRequest;
    const item = currentImages[lightboxIndex];
    const image = root.querySelector("[data-lightbox-image]");
    image.removeAttribute("src");
    lightbox.classList.add("is-loading");
    root.querySelector("[data-lightbox-caption]").textContent =
      `${item.label || item.kind || `Foto ${lightboxIndex + 1}`} · Original wird geladen …`;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    const source = await protectedImage(item.url);
    if (requestId !== lightboxRequest || lightbox.hidden) return;
    image.onload = () => lightbox.classList.remove("is-loading");
    image.src = source;
    root.querySelector("[data-lightbox-caption]").textContent =
      item.label || item.kind || `Foto ${lightboxIndex + 1}`;
  }

  function closeLightbox() {
    lightboxRequest += 1;
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.classList.remove("is-loading");
    document.body.classList.remove("lightbox-open");
  }

  function stepLightbox(delta) {
    if (lightbox.hidden || !currentImages.length) return;
    const index =
      (lightboxIndex + delta + currentImages.length) % currentImages.length;
    openLightbox(index);
  }

  function stepLead(delta) {
    if (!leads.length) return;
    let index = leads.findIndex((lead) => lead.id === selectedId);
    if (index < 0) index = delta > 0 ? -1 : 0;
    index = Math.max(0, Math.min(leads.length - 1, index + delta));
    if (leads[index]) openLead(leads[index].id);
  }

  root.querySelector("[data-lightbox-close]").onclick = closeLightbox;
  root.querySelector("[data-lightbox-prev]").onclick = () => stepLightbox(-1);
  root.querySelector("[data-lightbox-next]").onclick = () => stepLightbox(1);
  lightbox.onclick = (event) => {
    if (event.target === lightbox) closeLightbox();
  };
  loadMoreEl.onclick = () => loadLeads();
  selectPageEl.onchange = () => {
    if (selectPageEl.checked) {
      for (const lead of leads) selectedLeadIds.add(lead.id);
    } else {
      clearSelection();
      return;
    }
    syncSelectionUI();
  };
  bulkArchiveEl.onclick = () => runBulkAction("archive");
  bulkDeleteEl.onclick = () => runBulkAction("delete");
  root.querySelectorAll("[data-action-dialog-cancel]").forEach((element) => {
    element.onclick = () => closeActionDialog(false);
  });
  actionDialogCancelButton.onclick = () => closeActionDialog(false);
  actionDialogConfirmButton.onclick = () => closeActionDialog(true);

  loginFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const entered = loginInputEl.value.trim();
    if (!entered) return;
    token = entered;
    sessionStorage.setItem("review-token", token);
    authErrorEl.textContent = "";
    setLoginBusy(true);
    await loadLeads({ reset: true });
  });

  root.querySelectorAll("[data-filter]").forEach((button) => {
    button.onclick = () => {
      currentFilter = button.dataset.filter;
      root.querySelectorAll("[data-filter]").forEach((item) => {
        item.classList.toggle("active", item === button);
      });
      loadLeads({ reset: true });
    };
  });

  searchEl.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      currentQuery = searchEl.value.trim();
      loadLeads({ reset: true });
    }, 280);
  });

  window.addEventListener("popstate", () => {
    const id = new URLSearchParams(location.search).get("lead");
    if (id) openLead(id, { keepUrl: true });
    else closeMobileDetail({ keepUrl: true });
  });

  window.addEventListener("beforeunload", () => {
    for (const url of objectUrls) URL.revokeObjectURL(url);
  });

  window.addEventListener("keydown", (event) => {
    if (!actionDialogEl.hidden) {
      if (event.key === "Escape") closeActionDialog(false);
      return;
    }
    const tag = document.activeElement?.tagName;
    if (
      ["INPUT", "TEXTAREA", "SELECT"].includes(tag) ||
      document.activeElement?.isContentEditable
    )
      return;
    if (!lightbox.hidden) {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
      return;
    }
    if (event.key.toLowerCase() === "j") stepLead(1);
    if (event.key.toLowerCase() === "k") stepLead(-1);
    if (!selectedId) return;
    if (event.key.toLowerCase() === "i")
      setStatus(selectedId, "interesting");
    if (event.key.toLowerCase() === "c") setStatus(selectedId, "contacted");
    if (event.key.toLowerCase() === "p") setStatus(selectedId, "purchased");
  });

  (async () => {
    const id = new URLSearchParams(location.search).get("lead");
    if (api && !token) {
      renderAuthGate(false);
      return;
    }
    await loadLeads({ reset: true });
    if (id && dashboardUnlocked) await openLead(id, { keepUrl: true });
  })();
})();
