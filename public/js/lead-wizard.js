(() => {
  const root = document.querySelector("[data-lead-wizard]");
  if (!root) return;
  const stage = root.querySelector("[data-wizard-stage]");
  const back = root.querySelector("[data-back]");
  const progress = root.querySelector("[data-progress-fill]");
  const apiBase = root.dataset.apiBase || "";
  const params = new URLSearchParams(location.search);

  const TYPES = [
    [
      "double_bass",
      "Kontrabass",
      "Einzelinstrumente, Sammlungen und Instrumente aus Nachlässen",
    ],
    ["bow", "Bogen", "Für Geige, Bratsche, Cello oder Kontrabass"],
    [
      "strings",
      "Geige / Bratsche / Cello",
      "Einzelinstrumente jeder Herkunft und Bauart",
    ],
    ["guitar", "Gitarre", "Akustische Gitarren, E-Gitarren und Zubehör"],
    [
      "estate",
      "Mehrere Instrumente / Nachlass",
      "Wenn Sie mehrere Instrumente oder einen gesamten Nachlass anbieten möchten",
    ],
    [
      "unknown",
      "Ich weiß es nicht",
      "Kein Problem – wir helfen bei der Einordnung",
    ],
    [
      "other",
      "Anderes Instrument oder Zubehör",
      "Weitere Instrumente oder musikalisches Zubehör",
    ],
  ];

  const FLOWS = {
    double_bass: [
      [
        "front",
        "Ganzes Instrument von vorne",
        "Stellen Sie den Bass möglichst frei hin und fotografieren Sie ihn vollständig von vorne.",
        "Gemeint ist eine Aufnahme, auf der das ganze Instrument vom Boden bis zur Schnecke sichtbar ist.",
      ],
      [
        "back",
        "Ganzes Instrument von hinten",
        "Bitte fotografieren Sie den gesamten Bass von hinten.",
        "Die Rückseite hilft, Bauweise, Holz und Reparaturen zu erkennen.",
      ],
      [
        "scroll",
        "Oberer Teil mit Wirbeln",
        "Fotografieren Sie den oberen Teil des Instruments möglichst nah und scharf.",
        "Gemeint sind Wirbelkasten und Schnecke – dort, wo die Saiten oben befestigt und gestimmt werden.",
      ],
      [
        "label",
        "Zettel oder Beschriftung im Inneren",
        "Falls Sie innen einen Zettel, Brandstempel oder eine Beschriftung sehen, fotografieren Sie diese bitte.",
        "Leuchten Sie durch ein F-Loch ins Instrument. Wenn nichts zu finden ist, einfach überspringen.",
      ],
      [
        "accessories",
        "Weitere Fotos",
        "Wenn Sie möchten, können Sie hier zusätzliche, aussagekräftige Fotos hochladen. Insgesamt maximal 5 Fotos.",
        "",
      ],
    ],
    strings: [
      [
        "front",
        "Ganzes Instrument von vorne",
        "Fotografieren Sie das gesamte Instrument von vorne.",
        "Das ganze Instrument sollte einschließlich Kopf sichtbar sein.",
      ],
      [
        "back",
        "Ganzes Instrument von hinten",
        "Bitte einmal die vollständige Rückseite.",
        "Die Rückseite zeigt wichtige Merkmale von Holz, Form und Zustand.",
      ],
      [
        "scroll",
        "Oberer Teil mit Wirbeln",
        "Fotografieren Sie Kopf, Wirbel und Schnecke aus der Nähe.",
        "Gemeint ist das obere Ende des Instruments, an dem die Saiten gestimmt werden.",
      ],
      [
        "label",
        "Zettel im Instrument",
        "Wenn im Inneren ein Zettel oder eine Beschriftung sichtbar ist, fotografieren Sie diese.",
        "Schauen Sie durch die F-Löcher. Wenn Sie nichts finden, einfach weiter.",
      ],
      [
        "accessories",
        "Bogen und Koffer",
        "Bitte fotografieren Sie auch vorhandene Bögen, Koffer und Unterlagen.",
        "Gerade Bögen können unabhängig vom Instrument interessant sein.",
      ],
    ],
    bow: [
      [
        "whole",
        "Ganzer Bogen",
        "Legen Sie den Bogen auf einen ruhigen Hintergrund und fotografieren Sie ihn vollständig.",
        "Der gesamte Bogen von Frosch bis Spitze sollte sichtbar sein.",
      ],
      [
        "frog",
        "Unteres Ende mit Griffstück",
        "Fotografieren Sie das untere Ende des Bogens nah und scharf.",
        "Dieses Teil heißt Frosch. Gemeint ist das bewegliche Griffstück direkt neben der Schraube.",
      ],
      [
        "head",
        "Spitze des Bogens",
        "Fotografieren Sie die Spitze am anderen Ende des Bogens von der Seite.",
        "Dieses Ende wird Bogenkopf genannt.",
      ],
      [
        "stamp",
        "Stempel oder eingeprägter Name",
        "Schauen Sie am Holz nahe dem Griffstück nach einem Namen oder Stempel und fotografieren Sie ihn möglichst scharf.",
        "Der Stempel befindet sich häufig auf der Stange unmittelbar oberhalb des Frosches. Seitliches Licht hilft beim Lesen.",
      ],
    ],
    estate: [
      [
        "overview",
        "Alles zusammen",
        "Fotografieren Sie zunächst den gesamten Bestand oder mehrere Übersichtsaufnahmen.",
        "Es geht noch nicht um perfekte Detailfotos. Wichtig ist zunächst zu sehen, welche Instrumente, Bögen und Koffer vorhanden sind.",
      ],
      [
        "bows",
        "Bögen und kleine Gegenstände",
        "Falls Bögen vorhanden sind, fotografieren Sie diese bitte separat.",
        "Bögen können leicht übersehen werden. Legen Sie mehrere Bögen ruhig nebeneinander.",
      ],
      [
        "papers",
        "Unterlagen und Beschriftungen",
        "Fotografieren Sie vorhandene Expertisen, Rechnungen, Etiketten oder andere Unterlagen.",
        "Sie müssen nicht entscheiden, was davon wichtig ist.",
      ],
    ],
    unknown: [
      [
        "overview",
        "Ein Foto von dem Gegenstand",
        "Fotografieren Sie den Gegenstand vollständig.",
        "Ein einziges brauchbares Übersichtsbild reicht zunächst. Danach kann der Ablauf passend weitergeführt werden.",
      ],
    ],
  };

  const HELP_EXAMPLES = {
    front: "/images/photo-help/doublebass/kontrabass-gesamt.webp",
    back: "/images/photo-help/doublebass/kontrabass-back.webp",
    scroll: "/images/photo-help/doublebass/kontrabass-schnecke.webp",
    label: "/images/photo-help/doublebass/kontrabass-zettel.webp",
  };

  const VALID_TYPES = new Set(TYPES.map(([type]) => type));
  const CONTINUATION_KEY = "instrument-anfrage-continuation-v1";
  const CONTINUATION_MAX_AGE = 24 * 60 * 60 * 1000;
  const requestedType = params.get("type");
  const initialType = VALID_TYPES.has(requestedType) ? requestedType : null;
  const initialCity = (params.get("city") || "").trim().slice(0, 120);
  const activeObjectUrls = new Set();
  const trackedFunnelEvents = new Set();
  let shouldFocusStage = false;

  function funnelReferrer() {
    if (!document.referrer) return null;
    try {
      return new URL(document.referrer);
    } catch (_) {
      return null;
    }
  }
  function funnelEntryPage() {
    if (initialCity) return "city";
    const referrer = funnelReferrer();
    if (!referrer) return "direct";
    if (referrer.origin !== location.origin) return "external";
    const path = referrer.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return "home";
    if (path.startsWith("/instrumentengeschichten")) return "story";
    if (
      [
        "/bogen-verkaufen",
        "/cello-verkaufen",
        "/geige-verkaufen",
        "/instrument-geerbt",
        "/kontrabass-verkaufen",
        "/kontrabassbogen-verkaufen",
      ].includes(path)
    )
      return "instrument";
    if (path === "/instrument-verkaufen") return "direct";
    return "other_internal";
  }
  function funnelSourceGroup() {
    const referrer = funnelReferrer();
    if (referrer && referrer.origin !== location.origin) {
      const host = referrer.hostname.toLowerCase();
      if (/(^|\.)google\./.test(host)) return "google";
      if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
      if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com"))
        return "duckduckgo";
      return "external";
    }
    return referrer ? "internal" : "direct";
  }
  const funnelContext = {
    entry_page: funnelEntryPage(),
    source_group: funnelSourceGroup(),
  };

  const state = {
    type: initialType,
    step: "type",
    photoIndex: 0,
    photos: [],
    history: [],
    data: {
      story: "",
      name: "",
      email: "",
      phone: "",
      city: initialCity,
    },
    classifiedType: null,
    leadId: null,
    continuationToken: null,
    leadSaved: false,
    uploadedPhotoCount: 0,
    demoStorageKey: null,
    consentAccepted: false,
    consentAt: null,
    isSubmitting: false,
    requestKey: null,
    continuationRequestKey: null,
  };

  function funnelDeviceType() {
    if (window.innerWidth <= 640) return "mobile";
    if (window.innerWidth <= 1024) return "tablet";
    return "desktop";
  }
  function trackFunnel(event, instrumentType = state.type) {
    if (!apiBase || trackedFunnelEvents.has(event)) return;
    trackedFunnelEvents.add(event);
    const type = VALID_TYPES.has(instrumentType)
      ? instrumentType
      : "unselected";
    void fetch(`${apiBase}/api/funnel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        instrument_type: type,
        device_type: funnelDeviceType(),
        ...funnelContext,
      }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt or slow down the enquiry.
    });
  }

  function isAIType(type) {
    return ["double_bass", "bow", "strings", "estate", "unknown"].includes(
      type,
    );
  }
  function flow() {
    return FLOWS[state.classifiedType || state.type] || [];
  }
  function isInitialGuidedRequest() {
    return isAIType(state.type) && !state.leadSaved && state.photos.length > 0;
  }
  function releaseObjectUrls() {
    activeObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    activeObjectUrls.clear();
  }
  function makeObjectUrl(file) {
    const url = URL.createObjectURL(file);
    activeObjectUrls.add(url);
    return url;
  }
  function clearElement(element) {
    while (element?.firstChild) element.removeChild(element.firstChild);
  }
  function showQuality(container, kind, message, actions = []) {
    if (!container) return;
    clearElement(container);
    const notice = document.createElement("div");
    notice.className = `quality ${kind}`;
    notice.textContent = message;
    container.appendChild(notice);
    if (!actions.length) return;
    const actionRow = document.createElement("div");
    actionRow.className = "photo-actions quality-actions";
    actions.forEach(({ label, className = "ghost-button", onClick }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      button.addEventListener("click", onClick, { once: true });
      actionRow.appendChild(button);
    });
    container.appendChild(actionRow);
  }
  function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    if (!button.dataset.idleLabel) button.dataset.idleLabel = button.textContent;
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    button.textContent = busy ? busyLabel : button.dataset.idleLabel;
  }
  function createRequestKey() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }
  function clearContinuation() {
    try {
      sessionStorage.removeItem(CONTINUATION_KEY);
    } catch (_) {
      // The form still works when browser storage is unavailable.
    }
  }
  function persistContinuation() {
    if (!state.leadSaved || !state.leadId || !state.continuationToken) return;
    try {
      sessionStorage.setItem(
        CONTINUATION_KEY,
        JSON.stringify({
          leadId: String(state.leadId).slice(0, 160),
          continuationToken: String(state.continuationToken).slice(0, 512),
          type: state.type,
          classifiedType: VALID_TYPES.has(state.classifiedType)
            ? state.classifiedType
            : null,
          photoIndex: state.photoIndex,
          maker: String(state.data.maker || "").slice(0, 160),
          story: String(state.data.story || "").slice(0, 3000),
          savedAt: Date.now(),
        }),
      );
    } catch (_) {
      // A blocked sessionStorage must never block an enquiry.
    }
  }
  function restoreContinuation() {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem(CONTINUATION_KEY) || "null");
    } catch (_) {
      clearContinuation();
      return false;
    }
    if (
      !saved ||
      !VALID_TYPES.has(saved.type) ||
      typeof saved.leadId !== "string" ||
      !saved.leadId ||
      typeof saved.continuationToken !== "string" ||
      !saved.continuationToken ||
      !Number.isFinite(saved.savedAt) ||
      Date.now() - saved.savedAt > CONTINUATION_MAX_AGE ||
      (initialType && initialType !== saved.type)
    ) {
      if (!initialType || initialType === saved?.type) clearContinuation();
      return false;
    }
    state.type = saved.type;
    state.classifiedType = VALID_TYPES.has(saved.classifiedType)
      ? saved.classifiedType
      : null;
    state.leadId = saved.leadId.slice(0, 160);
    state.continuationToken = saved.continuationToken.slice(0, 512);
    state.leadSaved = true;
    state.consentAccepted = true;
    state.uploadedPhotoCount = 0;
    state.data.maker = typeof saved.maker === "string" ? saved.maker.slice(0, 160) : "";
    state.data.story = typeof saved.story === "string" ? saved.story.slice(0, 3000) : "";
    state.photoIndex = Math.min(
      flow().length,
      Math.max(1, Number.parseInt(saved.photoIndex, 10) || 1),
    );
    state.step = state.photoIndex < flow().length ? "photos" : "details";
    state.history = [];
    return true;
  }
  function finish() {
    trackFunnel("flow_completed");
    clearContinuation();
    state.history = [];
    state.step = "done";
    shouldFocusStage = true;
    render();
  }
  function setProgress(value, label = "Anfrage ausfüllen") {
    const normalized = Math.max(5, Math.min(100, value));
    progress.style.width = `${normalized}%`;
    const progressBar = progress.parentElement;
    progressBar?.setAttribute("aria-valuenow", String(normalized));
    const progressLabel = root.querySelector("[data-progress-label]");
    if (progressLabel) progressLabel.textContent = label;
  }
  function renderStage(html) {
    releaseObjectUrls();
    stage.style.transition = "none";
    stage.style.opacity = "0";
    stage.innerHTML = html;
    void stage.offsetWidth;
    stage.style.transition = "opacity .22s ease";
    stage.style.opacity = "1";
    if (shouldFocusStage) {
      shouldFocusStage = false;
      requestAnimationFrame(() => {
        const target = stage.querySelector("h2, [data-stage-heading]") || stage;
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
      });
    }
  }
  function push(next) {
    state.history.push({ step: state.step, photoIndex: state.photoIndex });
    state.step = next;
    shouldFocusStage = true;
    persistContinuation();
    render();
  }
  function goBack() {
    const last = state.history.pop();
    if (!last) return;
    trackFunnel("back_used");
    state.step = last.step;
    state.photoIndex = last.photoIndex;
    shouldFocusStage = true;
    persistContinuation();
    render();
  }
  back.addEventListener("click", goBack);

  function chooseType(type) {
    if (!VALID_TYPES.has(type)) return;
    clearContinuation();
    state.type = type;
    state.classifiedType = null;
    state.photoIndex = 0;
    state.photos = [];
    trackFunnel("type_selected", type);
    if (isAIType(type)) push("photos");
    else push("simple");
  }

  function typeScreen() {
    setProgress(8, "Kategorie auswählen");
    back.hidden = true;
    renderStage(
      `<p class="wizard-copy wizard-choice-intro" data-stage-heading>Wählen Sie einfach die passendste Kategorie. „Ich weiß es nicht“ ist völlig in Ordnung.</p><div class="choice-grid">${TYPES.map(([id, title, copy]) => `<button type="button" class="choice" data-type="${id}"><strong>${title}</strong><small>${copy}</small></button>`).join("")}</div>`,
    );
    stage
      .querySelectorAll("[data-type]")
      .forEach((b) => (b.onclick = () => chooseType(b.dataset.type)));
  }

  function helpMarkup(item) {
    const exampleSrc = HELP_EXAMPLES[item[0]];
    const exampleImg = exampleSrc
      ? `<div class="help-example"><img data-help-image data-src="${exampleSrc}" alt="Foto-Beispiel für ${item[1]}" width="600" height="900" decoding="async"></div>`
      : '';

    if (item[0] === "accessories") {
      return `<div class="help-box"><strong>Weitere Fotos</strong><p>Sie können hier zusätzliche, aussagekräftige Aufnahmen hochladen, z. B. Details, Ergänzungen oder Zubehör.</p></div>`;
    }
    if (!item[3]) return "";
    return `<button type="button" class="help-button" data-help aria-expanded="false">Beispiel ansehen</button><div class="help-box" data-help-box hidden><strong>Beispiel / Erklärung</strong><p>${item[3]}</p>${exampleImg}</div>`;
  }

  function photoScreen() {
    const items = flow();
    const item = items[state.photoIndex];
    if (!item) {
      if (state.leadSaved) push("details");
      else push("contact");
      return;
    }
    const pct = state.leadSaved
      ? 58 + Math.round((state.photoIndex / items.length) * 27)
      : 18;
    setProgress(
      pct,
      state.leadSaved
        ? `Zusatzfoto ${state.photoIndex + 1} von ${items.length}`
        : "Erstes Foto auswählen",
    );
    back.hidden = false;
    const maxPhotos = 5;
    const accessoryCount = state.photos.filter((p) => p.kind === "accessories").length;
    const remaining = Math.max(0, maxPhotos - accessoryCount);
    const allowMultiple = item[0] === "accessories" && remaining > 1;
    const dots = items
      .map(
        (_, idx) =>
          `<span class="photo-dot${idx === state.photoIndex ? " active" : ""}" aria-hidden="true"></span>`,
      )
      .join("");
    const pendingPhotoCount = state.photos.length - state.uploadedPhotoCount;
    const early = state.leadSaved
      ? `<div class="early-submit"><button class="finish-link" type="button" data-early>${pendingPhotoCount > 0 ? "Mit diesen Fotos abschließen" : "Ohne weitere Fotos abschließen"}</button></div>`
      : "";
    const savedNotice = state.leadSaved
      ? '<div class="saved-inline" role="status"><span aria-hidden="true">✓</span><strong>Zwischengespeichert – Ihre Anfrage geht nicht verloren.</strong></div>'
      : "";
    const saveNote = !state.leadSaved
      ? `<div class="save-note"><strong>Ein Foto reicht für den Anfang.</strong><span>Danach können Sie Ihre Anfrage bereits speichern. Weitere Fotos sind freiwillig.</span></div>`
      : "";
    const skipAction = state.leadSaved
      ? `<button type="button" class="ghost-button" data-skip>Diesen Schritt überspringen</button>`
      : "";
    const photoCheckNotice =
      item[0] !== "accessories" && isAIType(state.type)
        ? `<p class="photo-check-note">Das Foto wird automatisch auf Erkennbarkeit geprüft. Dafür wird eine verkleinerte Kopie an OpenAI übermittelt. <a href="/datenschutz/" target="_blank" rel="noopener">Datenschutz</a></p>`
        : "";
    renderStage(
      `<div class="photo-step">${savedNotice}<div class="photo-step-header"><p class="eyebrow">${state.leadSaved ? "Ergänzendes Foto" : "Erstes Foto"} ${state.leadSaved ? `${state.photoIndex + 1} von ${items.length}` : ""}</p><div class="photo-progress-dots">${dots}</div></div><h2 class="wizard-title">${item[1]}</h2><p class="wizard-copy">${item[2]}</p>${saveNote}<div class="photo-step-grid"><div class="photo-instructions">${helpMarkup(item)}<div class="photo-frame"><input type="file" accept="image/*" capture="environment" data-camera-file hidden><input type="file" accept="image/*" ${allowMultiple ? "multiple" : ""} data-library-file hidden><div data-preview><p>Noch kein Foto aufgenommen.</p></div>${photoCheckNotice}<div class="photo-actions"><button type="button" class="photo-button" data-camera>Foto aufnehmen</button><button type="button" class="ghost-button" data-library>Aus Mediathek wählen</button>${skipAction}</div><div data-quality role="status" aria-live="polite"></div></div></div></div>${early}</div>`,
    );
    const help = stage.querySelector("[data-help]");
    if (help) {
      const helpBox = stage.querySelector("[data-help-box]");
      help.onclick = () => {
        const isOpening = helpBox.hidden;
        helpBox.hidden = !isOpening;
        help.setAttribute("aria-expanded", String(isOpening));
        if (isOpening) {
          const image = helpBox.querySelector("[data-help-image]");
          if (image && !image.hasAttribute("src")) image.src = image.dataset.src;
        }
      };
    }
    const cameraFile = stage.querySelector("[data-camera-file]");
    const libraryFile = stage.querySelector("[data-library-file]");
    const cameraButton = stage.querySelector("[data-camera]");
    const libraryButton = stage.querySelector("[data-library]");
    const quality = stage.querySelector("[data-quality]");
    const preview = stage.querySelector("[data-preview]");
    const setPhotoControlsBusy = (busy) => {
      cameraButton.disabled = busy;
      libraryButton.disabled = busy;
      back.disabled = busy;
    };
    const renderAccessoryPreview = () => {
      if (item[0] !== "accessories") return;
      releaseObjectUrls();
      clearElement(preview);
      const accessoryPhotos = state.photos.filter(
        (photo) => photo.kind === "accessories",
      );
      if (accessoryPhotos.length) {
        const thumbnails = document.createElement("div");
        thumbnails.className = "preview-thumbs";
        accessoryPhotos.forEach((photo) => {
          const image = document.createElement("img");
          image.src = makeObjectUrl(photo.file);
          image.alt = "Ausgewähltes Foto";
          image.width = 64;
          image.height = 64;
          thumbnails.appendChild(image);
        });
        preview.appendChild(thumbnails);
      } else {
        const empty = document.createElement("p");
        empty.textContent = "Noch kein Foto aufgenommen.";
        preview.appendChild(empty);
      }
      const note = document.createElement("p");
      note.className = "photo-note";
      note.textContent = `Insgesamt ausgewählt: ${accessoryPhotos.length}. Noch ${Math.max(0, 5 - accessoryPhotos.length)} möglich.`;
      preview.appendChild(note);
    };
    renderAccessoryPreview();
    cameraButton.onclick = () => {
      cameraFile.click();
    };
    libraryButton.onclick = () => {
      libraryFile.click();
    };
    const earlyButton = stage.querySelector("[data-early]");
    if (earlyButton)
      earlyButton.onclick = () => {
        trackFunnel("early_finish");
        if (state.photos.length > state.uploadedPhotoCount) push("details");
        else finish();
      };
    const skipButton = stage.querySelector("[data-skip]");
    if (skipButton)
      skipButton.onclick = () => {
        trackFunnel("photo_skipped");
        state.photoIndex++;
        shouldFocusStage = true;
        persistContinuation();
        render();
      };

    const fileHandler = async (files) => {
      const selectedFiles = Array.from(files || []);
      if (!selectedFiles.length) return;

      const maxPhotos = 5;
      const accessoryCount = state.photos.filter((p) => p.kind === "accessories").length;
      const allowedRemaining = maxPhotos - accessoryCount;
      if (allowedRemaining <= 0) {
        showQuality(
          quality,
          "retry",
          "Sie haben bereits 5 zusätzliche Fotos ausgewählt. Bitte fahren Sie mit dem aktuellen Upload fort.",
        );
        return;
      }

      const toProcess = selectedFiles.slice(0, allowMultiple ? allowedRemaining : 1);
      if (toProcess.length < selectedFiles.length) {
        showQuality(
          quality,
          "retry",
          "Es werden nur maximal 5 Fotos insgesamt akzeptiert. Zusätzliche Dateien wurden entfernt.",
        );
      }

      for (const selected of toProcess) {
        if (!selected.type.startsWith("image/")) {
          showQuality(quality, "retry", "Bitte wählen Sie eine Bilddatei aus.");
          return;
        }
        if (selected.size > 20 * 1024 * 1024) {
          showQuality(
            quality,
            "retry",
            "Mindestens ein Bild ist zu groß. Bitte wählen Sie eine normale Fotoaufnahme bis 20 MB.",
          );
          return;
        }
      }

      const skipPreview = item[0] === "accessories";
      setPhotoControlsBusy(true);
      try {
        for (const selected of toProcess) {
          const accepted = await handlePhoto(selected, item, skipPreview);
          if (item[0] === "accessories") renderAccessoryPreview();
          if (!accepted) break;
        }
      } finally {
        if (quality.isConnected) setPhotoControlsBusy(false);
      }
    };

    cameraFile.onchange = async () => {
      await fileHandler(cameraFile.files);
      cameraFile.value = "";
    };
    libraryFile.onchange = async () => {
      await fileHandler(libraryFile.files);
      libraryFile.value = "";
    };
  }

  async function imageToJpeg(file, max, quality) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      if (!bitmap.width || !bitmap.height) throw new Error("decode");
      const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
          "image/jpeg",
          quality,
        );
      });
    } finally {
      bitmap?.close?.();
    }
  }

  async function imageDimensions(file) {
    const bitmap = await createImageBitmap(file);
    try {
      if (!bitmap.width || !bitmap.height) throw new Error("decode");
      return { width: bitmap.width, height: bitmap.height };
    } finally {
      bitmap.close?.();
    }
  }

  async function imageForCheck(file, max = 768) {
    return imageToJpeg(file, max, 0.72);
  }

  async function imageForStorage(file, max = 3000) {
    return imageToJpeg(file, max, 0.88);
  }
  async function localQuality(blob) {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(bitmap, 0, 0, 64, 64);
      const d = ctx.getImageData(0, 0, 64, 64).data;
      let sum = 0,
        sum2 = 0;
      for (let i = 0; i < d.length; i += 4) {
        const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += y;
        sum2 += y * y;
      }
      const n = d.length / 4,
        mean = sum / n,
        variance = sum2 / n - mean * mean;
      if (mean < 28)
        return {
          ok: false,
          message:
            "Das Foto ist sehr dunkel. Mit mehr Licht lassen sich Details besser erkennen.",
        };
      if (variance < 80)
        return {
          ok: false,
          message:
            "Auf dem Foto sind nur wenige Details erkennbar. Eine nähere oder hellere Aufnahme wäre besser.",
        };
      return { ok: true };
    } finally {
      bitmap.close?.();
    }
  }
  async function aiCheck(blob, item) {
    if (!apiBase) throw new Error("quality_unavailable");
    const body = new FormData();
    body.append("image", blob, "check.jpg");
    body.append("expected", item[1]);
    body.append("instruction", item[2]);
    const mode =
      state.type === "unknown" && state.photoIndex === 0
        ? "identify"
        : "quality";
    body.append("mode", mode);
    const res = await fetch(`${apiBase}/api/photo-check`, {
      method: "POST",
      body,
    });
    if (res.status !== 200) throw new Error("quality_unavailable");
    const result = await res.json();
    const isPending = ["pending", "partial"].includes(
      result?.processing_status,
    );
    const hasValidShape =
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      typeof result.ok === "boolean" &&
      typeof result.message === "string" &&
      Boolean(result.message.trim());
    const detectedTypes = new Set([
      "double_bass",
      "bow",
      "violin",
      "viola",
      "cello",
      "guitar",
      "other",
      "uncertain",
    ]);
    if (
      !hasValidShape ||
      isPending ||
      (mode === "identify" && !detectedTypes.has(result.detected_type))
    ) {
      throw new Error("quality_invalid_response");
    }
    return {
      ...result,
      message: result.message.trim().slice(0, 400),
    };
  }
  function advanceAfterAcceptedPhoto() {
    if (!state.leadSaved && isAIType(state.type)) {
      push("contact");
      return;
    }
    state.photoIndex++;
    shouldFocusStage = true;
    persistContinuation();
    render();
  }

  function requestPhotoDecision(quality, preview, message) {
    trackFunnel("photo_warning_shown");
    return new Promise((resolve) => {
      showQuality(quality, "retry", message, [
        {
          label: "Foto trotzdem verwenden",
          className: "continue-button",
          onClick: () => {
            trackFunnel("photo_warning_overridden");
            resolve(true);
          },
        },
        {
          label: "Neues Foto wählen",
          onClick: () => {
            releaseObjectUrls();
            clearElement(preview);
            const empty = document.createElement("p");
            empty.textContent = "Noch kein Foto aufgenommen.";
            preview.appendChild(empty);
            resolve(false);
          },
        },
      ]);
    });
  }

  function addAcceptedPhoto(selected, item, quality, message) {
    if (state.photos.length === 0) trackFunnel("first_photo_added");
    state.photos.push({ file: selected, kind: item[0], label: item[1] });
    showQuality(quality, "ok", message, [
      {
        label: "Weiter",
        className: "continue-button",
        onClick: advanceAfterAcceptedPhoto,
      },
    ]);
  }

  async function handlePhoto(selected, item, skipPreview = false) {
    const preview = stage.querySelector("[data-preview]"),
      quality = stage.querySelector("[data-quality]");
    if (!skipPreview && item[0] !== "accessories") {
      releaseObjectUrls();
      clearElement(preview);
      const image = document.createElement("img");
      image.src = makeObjectUrl(selected);
      image.alt = "Vorschau des ausgewählten Fotos";
      preview.appendChild(image);
    }

    showQuality(quality, "checking", "Foto wird kurz geprüft …");
    let dimensions;
    let small;
    let local;
    try {
      dimensions = await imageDimensions(selected);
      small = await imageForCheck(selected);
      local = await localQuality(small);
    } catch (_) {
      showQuality(
        quality,
        "retry",
        "Dieses Bild konnte nicht gelesen werden. Bitte wählen Sie eine andere Fotoaufnahme.",
      );
      return false;
    }

    const isSmallImage = Math.max(dimensions.width, dimensions.height) < 800;
    let acceptedLocalWarning = false;
    if (!local.ok || isSmallImage) {
      const warning = !local.ok
        ? local.message
        : "Dieses Bild ist recht klein. Eine größere Aufnahme wäre für die Prüfung hilfreicher.";
      const accepted = await requestPhotoDecision(quality, preview, warning);
      if (!accepted) return false;
      acceptedLocalWarning = true;
    }

    const shouldUseAi = item[0] !== "accessories" && isAIType(state.type);
    if (!shouldUseAi) {
      const localMessage =
        item[0] === "accessories"
          ? "Zusatzfoto gespeichert. Es wurde ohne automatische Inhaltsprüfung übernommen."
          : acceptedLocalWarning
            ? "Foto trotz des technischen Hinweises gespeichert. Der Bildinhalt wurde nicht automatisch geprüft."
            : "Foto gespeichert. Die lokale technische Prüfung war unauffällig. Der Bildinhalt wurde nicht automatisch geprüft.";
      addAcceptedPhoto(selected, item, quality, localMessage);
      return true;
    }

    let result;
    try {
      result = await aiCheck(small, item);
    } catch (_) {
      trackFunnel("photo_check_unavailable");
      addAcceptedPhoto(
        selected,
        item,
        quality,
        "Foto gespeichert. Die automatische Prüfung ist gerade nicht erreichbar – Sie können trotzdem fortfahren.",
      );
      return true;
    }

    const acceptedAfterWarning = result.ok === false;
    if (acceptedAfterWarning) {
      const serverMessage =
        typeof result?.message === "string" && result.message.trim()
          ? result.message.trim().slice(0, 400)
          : "Die Aufnahme könnte besser sein.";
      const accepted = await requestPhotoDecision(quality, preview, serverMessage);
      if (!accepted) return false;
    }

    if (result?.detected_type && state.type === "unknown") {
      const mapped =
        {
          double_bass: "double_bass",
          bow: "bow",
          violin: "strings",
          viola: "strings",
          cello: "strings",
          guitar: "guitar",
          other: "other",
        }[result.detected_type] || null;
      state.classifiedType = mapped;
    }
    const successMessage = acceptedAfterWarning
      ? "Foto wurde trotz des Hinweises gespeichert."
      : result.message;
    addAcceptedPhoto(selected, item, quality, successMessage);
    return true;
  }

  function simpleScreen() {
    setProgress(35, "Fotos und Angaben");
    back.hidden = false;
    renderStage(
      '<h2 class="wizard-title">Fotos und kurze Angaben</h2><p class="wizard-copy">Laden Sie einfach ein oder mehrere aussagekräftige Bilder hoch.</p><form data-simple-form><div class="field"><label for="simple-photos">Fotos <span class="optional">optional</span></label><input id="simple-photos" name="photos" type="file" accept="image/*" multiple data-simple-photos></div><div class="field"><label for="simple-maker">Hersteller / Marke <span class="optional">optional</span></label><input id="simple-maker" name="maker" maxlength="160" autocomplete="off" data-maker></div><div class="field"><label for="simple-story">Was wissen Sie über das Instrument? <span class="optional">optional</span></label><textarea id="simple-story" name="story" maxlength="3000" data-story placeholder="Zum Beispiel Alter, Herkunft, Nachlass, Modell oder Zustand."></textarea></div><button type="submit" class="continue-button">Weiter</button><div data-simple-status role="status" aria-live="polite"></div></form>',
    );
    const form = stage.querySelector("[data-simple-form]");
    const maker = stage.querySelector("[data-maker]");
    const story = stage.querySelector("[data-story]");
    maker.value = state.data.maker || "";
    story.value = state.data.story || "";
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fs = stage.querySelector("[data-simple-photos]").files;
      const files = [...fs].slice(0, 8);
      const invalidFile = files.find(
        (file) => !file.type.startsWith("image/") || file.size > 20 * 1024 * 1024,
      );
      if (invalidFile || fs.length > 8) {
        showQuality(
          stage.querySelector("[data-simple-status]"),
          "retry",
          fs.length > 8
            ? "Bitte wählen Sie höchstens 8 Fotos aus."
            : "Bitte wählen Sie Bilddateien mit höchstens 20 MB pro Foto aus.",
        );
        return;
      }
      state.photos = files.map((file, i) => ({
        file,
        kind: `photo_${i + 1}`,
        label: "Foto",
      }));
      if (files.length) trackFunnel("first_photo_added");
      state.data.maker = maker.value.trim();
      state.data.story = story.value.trim();
      push("contact");
    });
  }

  function detailsScreen() {
    setProgress(state.leadSaved ? 90 : 72, "Freiwillige Angaben");
    back.hidden = false;
    const pendingPhotoCount = Math.max(
      0,
      state.photos.length - state.uploadedPhotoCount,
    );
    const savedCopy = state.leadSaved
      ? '<div class="saved-confirmation compact"><strong>Ihre Anfrage ist bereits gespeichert.</strong><span data-pending-copy></span></div>'
      : "";
    renderStage(
      `${savedCopy}<h2 class="wizard-title">Was wissen Sie darüber?</h2><p class="wizard-copy">Ein paar Sätze helfen. Wenn Sie nichts wissen, lassen Sie die Felder einfach leer.</p><form data-details-form><div class="field"><label for="instrument-story">Geschichte / Herkunft <span class="optional">optional</span></label><textarea id="instrument-story" name="story" maxlength="3000" data-story placeholder="Zum Beispiel: aus dem Nachlass meines Onkels, der Berufsmusiker war …"></textarea></div><div class="field"><label for="instrument-maker">Hersteller oder Name <span class="optional">optional</span></label><input id="instrument-maker" name="maker" maxlength="160" autocomplete="off" data-maker placeholder="Unbekannt ist völlig in Ordnung"></div><button type="submit" class="continue-button" data-next>${state.leadSaved ? "Ergänzungen senden" : "Weiter"}</button><div data-submit-status role="status" aria-live="polite"></div></form>`,
    );
    const story = stage.querySelector("[data-story]");
    const maker = stage.querySelector("[data-maker]");
    story.value = state.data.story || "";
    maker.value = state.data.maker || "";
    const pendingCopy = stage.querySelector("[data-pending-copy]");
    if (pendingCopy)
      pendingCopy.textContent = pendingPhotoCount
        ? `${pendingPhotoCount} ergänzende Foto(s) werden jetzt hinzugefügt.`
        : "Diese Angaben sind freiwillig.";
    stage.querySelector("[data-details-form]").addEventListener("submit", async (event) => {
      event.preventDefault();
      state.data.story = story.value.trim();
      state.data.maker = maker.value.trim();
      persistContinuation();
      if (state.leadSaved)
        await submitContinuation(stage.querySelector("[data-next]"));
      else push("contact");
    });
  }

  function contactScreen() {
    trackFunnel("contact_reached");
    const initialGuided = isInitialGuidedRequest();
    setProgress(initialGuided ? 44 : 88, "Kontaktdaten und Zustimmung");
    back.hidden = initialGuided;
    const copy = initialGuided
      ? "Ein Foto reicht für den Anfang. Speichern Sie die Anfrage jetzt zwischen. Anschließend führen wir Sie direkt durch die weiteren, freiwilligen Fotoaufnahmen."
      : "Ihre Fotos und Angaben werden anschließend persönlich angesehen.";
    renderStage(
      `<h2 class="wizard-title">Wie dürfen wir Sie erreichen?</h2><p class="wizard-copy">${copy}</p><form data-contact-form><div class="field"><label for="contact-name">Name <span class="optional">optional</span></label><input id="contact-name" name="name" maxlength="160" autocomplete="name" data-name></div><div class="field"><label for="contact-email">E-Mail</label><input id="contact-email" name="email" type="email" inputmode="email" maxlength="254" autocomplete="email" spellcheck="false" data-email required></div><div class="field"><label for="contact-phone">Telefon <span class="optional">optional</span></label><input id="contact-phone" name="phone" type="tel" maxlength="80" autocomplete="tel" data-phone></div><div class="field"><label for="contact-city">Ort / Region <span class="optional">optional</span></label><input id="contact-city" name="city" maxlength="120" autocomplete="address-level2" data-city placeholder="z. B. Hamburg"></div><div class="consent-field"><input id="contact-consent" name="consent" type="checkbox" data-consent required aria-describedby="privacy-note"><label for="contact-consent">Ich stimme zu, dass meine Angaben und Fotos zur Bearbeitung der Anfrage verarbeitet werden.</label></div><p class="mini-note" id="privacy-note">Weitere Informationen stehen in der <a href="/datenschutz/" target="_blank" rel="noopener">Datenschutzerklärung</a>.</p><div class="wizard-summary"><strong data-photo-summary></strong><span data-type-summary></span></div><button type="submit" class="submit-button" data-submit>${initialGuided ? "Zwischenspeichern und weiter" : "Anfrage senden"}</button><div data-submit-status role="status" aria-live="polite"></div></form>`,
    );
    const form = stage.querySelector("[data-contact-form]");
    const values = {
      "[data-name]": state.data.name,
      "[data-email]": state.data.email,
      "[data-phone]": state.data.phone,
      "[data-city]": state.data.city,
    };
    Object.entries(values).forEach(([selector, value]) => {
      stage.querySelector(selector).value = value || "";
    });
    stage.querySelector("[data-photo-summary]").textContent =
      `${state.photos.length} Foto(s) ausgewählt`;
    stage.querySelector("[data-type-summary]").textContent =
      TYPES.find(([type]) => type === state.type)?.[1] || "Instrument";
    form.addEventListener("submit", submit);
    form.addEventListener(
      "invalid",
      () => trackFunnel("contact_validation_failed"),
      true,
    );
  }

  async function appendPhotos(formData, photos) {
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const archive = await imageForStorage(photo.file);
      const archiveName = (photo.file.name || `photo-${i + 1}.jpg`).replace(
        /\.[^.]+$/,
        ".jpg",
      );
      formData.append(`photo_${i}`, archive, archiveName);
      const thumbnail = await imageForCheck(photo.file, 480);
      if (thumbnail)
        formData.append(`thumb_${i}`, thumbnail, `thumb-${i}.jpg`);
      if (isAIType(state.classifiedType || state.type)) {
        const small = await imageForCheck(photo.file, 1024);
        if (small) formData.append(`ai_${i}`, small, `ai-${i}.jpg`);
      }
    }
  }

  function markInitialLeadSaved(result) {
    trackFunnel("lead_saved");
    state.leadId = String(result.id || "").slice(0, 160);
    state.continuationToken = result.continuation_token
      ? String(result.continuation_token).slice(0, 512)
      : null;
    state.leadSaved = true;
    state.uploadedPhotoCount = state.photos.length;
    state.photoIndex = 1;
    state.history = [];
    if (state.continuationToken)
      state.step = state.photoIndex < flow().length ? "photos" : "details";
    else state.step = "saved";
    shouldFocusStage = true;
    persistContinuation();
    render();
  }

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (state.isSubmitting) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const status = stage.querySelector("[data-submit-status]");
    const submitButton = stage.querySelector("[data-submit]");
    const email = stage.querySelector("[data-email]").value.trim();
    const consent = stage.querySelector("[data-consent]").checked;
    state.data = {
      ...state.data,
      name: stage.querySelector("[data-name]").value.trim(),
      email,
      phone: stage.querySelector("[data-phone]").value.trim(),
      city: stage.querySelector("[data-city]").value.trim(),
    };
    state.consentAccepted = consent;
    state.consentAt ||= new Date().toISOString();
    state.requestKey ||= createRequestKey();
    state.isSubmitting = true;
    form.setAttribute("aria-busy", "true");
    setButtonBusy(
      submitButton,
      true,
      isInitialGuidedRequest() ? "Wird zwischengespeichert …" : "Wird gesendet …",
    );
    back.disabled = true;
    showQuality(status, "checking", "Anfrage wird sicher übermittelt …");
    const initialGuided = isInitialGuidedRequest();
    try {
      if (!apiBase) {
        state.demoStorageKey = `demo-lead-${Date.now()}`;
        state.leadId = state.demoStorageKey;
        if (initialGuided)
          markInitialLeadSaved({
            id: state.demoStorageKey,
            continuation_token: "demo",
          });
        else finish();
        return;
      }
      const fd = new FormData();
      fd.append(
        "meta",
        JSON.stringify({
          type: state.type,
          classifiedType: state.classifiedType,
          data: state.data,
          photoMeta: state.photos.map((p) => ({
            kind: p.kind,
            label: p.label,
          })),
          consent: {
            accepted: true,
            version: "2026-08-24",
            at: state.consentAt,
          },
        }),
      );
      await appendPhotos(fd, state.photos);
      const res = await fetch(`${apiBase}/api/leads`, {
        method: "POST",
        headers: { "Idempotency-Key": state.requestKey },
        body: fd,
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      if (!result?.id) throw new Error("missing_id");
      state.leadId = String(result.id).slice(0, 160);
      if (["pending", "partial"].includes(result.processing_status)) {
        trackFunnel("lead_submit_error");
        showQuality(
          status,
          "retry",
          result.processing_status === "pending"
            ? "Ihre Anfrage ist angekommen und wird noch verarbeitet. Bitte versuchen Sie es gleich noch einmal; es wird keine doppelte Anfrage angelegt."
            : "Ihre Kontaktdaten sind gespeichert, aber mindestens ein Foto wurde noch nicht vollständig übertragen. Bitte versuchen Sie es noch einmal.",
        );
        return;
      }
      if (initialGuided) markInitialLeadSaved(result);
      else {
        trackFunnel("lead_saved");
        finish();
      }
    } catch (_) {
      trackFunnel("lead_submit_error");
      showQuality(
        status,
        "retry",
        "Die Übermittlung hat nicht geklappt. Ihre Eingaben bleiben erhalten – bitte versuchen Sie es noch einmal.",
      );
    } finally {
      state.isSubmitting = false;
      form.removeAttribute("aria-busy");
      setButtonBusy(submitButton, false, "");
      back.disabled = false;
    }
  }

  async function submitContinuation(submitButton) {
    if (state.isSubmitting) return;
    const status = stage.querySelector("[data-submit-status]");
    const pendingPhotos = state.photos.slice(state.uploadedPhotoCount);
    state.isSubmitting = true;
    setButtonBusy(submitButton, true, "Ergänzungen werden gesendet …");
    back.disabled = true;
    showQuality(status, "checking", "Ergänzungen werden übermittelt …");
    if (!state.leadId || !state.continuationToken) {
      showQuality(
        status,
        "retry",
        "Ihre Anfrage ist gespeichert. Zusätzliche Angaben können gerade nicht ergänzt werden.",
        [{ label: "Für jetzt fertig", onClick: finish }],
      );
      state.isSubmitting = false;
      setButtonBusy(submitButton, false, "");
      back.disabled = false;
      return;
    }

    try {
      if (!apiBase || state.continuationToken === "demo") {
        state.uploadedPhotoCount = state.photos.length;
        finish();
        return;
      }
      const fd = new FormData();
      state.continuationRequestKey ||= createRequestKey();
      fd.append(
        "meta",
        JSON.stringify({
          classifiedType: state.classifiedType,
          data: {
            story: state.data.story,
            maker: state.data.maker,
          },
          photoMeta: pendingPhotos.map((photo) => ({
            kind: photo.kind,
            label: photo.label,
          })),
        }),
      );
      await appendPhotos(fd, pendingPhotos);
      const res = await fetch(
        `${apiBase}/api/leads/${encodeURIComponent(state.leadId)}/continue`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${state.continuationToken}`,
            "Idempotency-Key": state.continuationRequestKey,
          },
          body: fd,
        },
      );
      if (!res.ok) throw new Error();
      const result = await res.json().catch(() => ({}));
      if (["pending", "partial"].includes(result.processing_status)) {
        trackFunnel("continuation_submit_error");
        showQuality(
          status,
          "retry",
          result.processing_status === "pending"
            ? "Die Ergänzungen werden noch verarbeitet. Bitte versuchen Sie es gleich erneut; doppelte Fotos werden dabei verhindert."
            : "Mindestens ein Foto wurde noch nicht vollständig übertragen. Bitte versuchen Sie es erneut oder schließen Sie für jetzt ab.",
          [{ label: "Für jetzt fertig", onClick: finish }],
        );
        return;
      }
      state.continuationRequestKey = null;
      state.uploadedPhotoCount = state.photos.length;
      if (pendingPhotos.length) trackFunnel("additional_photo_uploaded");
      finish();
    } catch (_) {
      trackFunnel("continuation_submit_error");
      showQuality(
        status,
        "retry",
        "Ihre ursprüngliche Anfrage ist bereits gespeichert. Die Ergänzungen konnten noch nicht übertragen werden. Sie können es erneut versuchen oder für jetzt abschließen.",
        [{ label: "Für jetzt fertig", onClick: finish }],
      );
    } finally {
      state.isSubmitting = false;
      setButtonBusy(submitButton, false, "");
      back.disabled = false;
    }
  }

  function savedScreen() {
    setProgress(54, "Anfrage zwischengespeichert");
    back.hidden = true;
    const hasMorePhotoSteps = state.photoIndex < flow().length;
    const canContinue = Boolean(state.continuationToken);
    const primaryLabel = hasMorePhotoSteps
      ? "Weitere Fotos jetzt hochladen"
      : "Weitere Angaben ergänzen";
    const unavailable = canContinue
      ? ""
      : '<div class="quality retry continuation-unavailable">Weitere Fotos können gerade nicht ergänzt werden. Ihre ursprüngliche Anfrage ist trotzdem sicher gespeichert.</div>';
    renderStage(
      `<div class="saved-confirmation"><span class="saved-check" aria-hidden="true">✓</span><div><p class="eyebrow">Zwischengespeichert</p><h2 class="wizard-title">Der erste Schritt ist geschafft.</h2><p class="wizard-copy">Ihr erstes Foto und Ihre Kontaktdaten sind sicher gespeichert. Laden Sie jetzt nach Möglichkeit weitere Ansichten hoch – sie helfen uns bei der persönlichen Prüfung.</p></div></div><div class="saved-actions"><button class="continue-button" type="button" data-continue ${canContinue ? "" : "disabled aria-disabled=\"true\""}>${primaryLabel}</button>${unavailable}<button class="ghost-button" type="button" data-finish>Ohne weitere Fotos abschließen</button></div>`,
    );
    const continueButton = stage.querySelector("[data-continue]");
    if (continueButton)
      continueButton.onclick = () => {
        trackFunnel("additional_photos_started");
        state.history.push({ step: "saved", photoIndex: state.photoIndex });
        state.step = hasMorePhotoSteps ? "photos" : "details";
        shouldFocusStage = true;
        persistContinuation();
        render();
      };
    stage.querySelector("[data-finish]").onclick = () => {
      trackFunnel("early_finish");
      finish();
    };
  }

  function doneScreen() {
    setProgress(100, "Anfrage vollständig gesendet");
    back.hidden = true;
    renderStage(
      '<div class="saved-confirmation"><span class="saved-check" aria-hidden="true">✓</span><div><p class="eyebrow">Anfrage angekommen</p><h2 class="wizard-title">Vielen Dank.</h2><p class="wizard-copy">Ihre Fotos und Angaben werden persönlich angesehen. Wir melden uns anschließend über Ihre angegebenen Kontaktdaten.</p></div></div><div class="done-details"><p data-confirm-contact hidden></p><p data-confirm-reference hidden></p><p>Sie können diese Seite jetzt schließen oder zur Startseite zurückkehren.</p></div><a class="button secondary" href="/">Zur Startseite</a>',
    );
    const contact = stage.querySelector("[data-confirm-contact]");
    if (state.data.email) {
      contact.textContent = `Kontakt für die Rückmeldung: ${state.data.email}`;
      contact.hidden = false;
    }
    const reference = stage.querySelector("[data-confirm-reference]");
    if (state.leadId && !String(state.leadId).startsWith("demo-lead-")) {
      reference.textContent = `Vorgangsnummer: ${String(state.leadId).slice(0, 160)}`;
      reference.hidden = false;
    }
  }
  function render() {
    back.hidden = state.history.length === 0;
    if (state.step === "type") return typeScreen();
    if (state.step === "photos") return photoScreen();
    if (state.step === "simple") return simpleScreen();
    if (state.step === "details") return detailsScreen();
    if (state.step === "contact") return contactScreen();
    if (state.step === "saved") return savedScreen();
    if (state.step === "done") return doneScreen();
  }
  const restored = restoreContinuation();
  if (!restored && state.type) {
    state.step = isAIType(state.type) ? "photos" : "simple";
    state.history = [{ step: "type", photoIndex: 0 }];
  }
  if (restored) trackFunnel("additional_photos_started");
  else {
    trackFunnel("wizard_opened", null);
    if (state.type) trackFunnel("type_selected", state.type);
  }
  window.addEventListener("pagehide", releaseObjectUrls);
  render();
})();
