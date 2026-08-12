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
    front: "/images/photo-help/doublebass/kontrabass-gesamt.jpg",
    back: "/images/photo-help/doublebass/kontrabass-back.jpg",
    scroll: "/images/photo-help/doublebass/kontrabass-schnecke.jpg",
    label: "/images/photo-help/doublebass/kontrabass-zettel.jpg",
  };

  const state = {
    type: params.get("type") || null,
    city: params.get("city") || "",
    step: "type",
    photoIndex: 0,
    photos: [],
    history: [],
    data: {
      story: "",
      name: "",
      email: "",
      phone: "",
      city: params.get("city") || "",
    },
    classifiedType: null,
    leadId: null,
    continuationToken: null,
    leadSaved: false,
    uploadedPhotoCount: 0,
    demoStorageKey: null,
  };

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
  function finish() {
    state.history = [];
    state.step = "done";
    render();
  }
  function setProgress(value) {
    progress.style.width = `${Math.max(5, Math.min(100, value))}%`;
  }
  function renderStage(html) {
    stage.style.transition = "none";
    stage.style.opacity = "0";
    stage.innerHTML = html;
    void stage.offsetWidth;
    stage.style.transition = "opacity .22s ease";
    stage.style.opacity = "1";
  }
  function push(next) {
    state.history.push({ step: state.step, photoIndex: state.photoIndex });
    state.step = next;
    render();
  }
  function goBack() {
    const last = state.history.pop();
    if (!last) return;
    state.step = last.step;
    state.photoIndex = last.photoIndex;
    render();
  }
  back.addEventListener("click", goBack);

  function chooseType(type) {
    state.type = type;
    state.classifiedType = null;
    state.photoIndex = 0;
    state.photos = [];
    if (isAIType(type)) push("photos");
    else push("simple");
  }

  function typeScreen() {
    setProgress(8);
    back.hidden = true;
    renderStage(
      `<h2 class="wizard-title">Was möchten Sie anbieten?</h2><p class="wizard-copy">Wählen Sie einfach die passendste Kategorie. „Ich weiß es nicht“ ist völlig in Ordnung.</p><div class="choice-grid">${TYPES.map(([id, title, copy]) => `<button class="choice" data-type="${id}"><strong>${title}</strong><small>${copy}</small></button>`).join("")}</div>`,
    );
    stage
      .querySelectorAll("[data-type]")
      .forEach((b) => (b.onclick = () => chooseType(b.dataset.type)));
  }

  function helpMarkup(item) {
    const exampleSrc = HELP_EXAMPLES[item[0]];
    const exampleImg = exampleSrc
      ? `<img src="${exampleSrc}" alt="Foto-Beispiel für ${item[1]}" style="width:100%;height:auto;border-radius:6px;object-fit:cover;">`
      : '';

    if (item[0] === "accessories") {
      return `<div class="help-box"><strong>Weitere Fotos</strong><p>Sie können hier zusätzliche, aussagekräftige Aufnahmen hochladen, z. B. Details, Ergänzungen oder Zubehör.</p></div>`;
    }
    if (!item[3]) return "";
    return `<button type="button" class="help-button" data-help>Beispiel ansehen</button><div class="help-box" data-help-box hidden><strong>Beispiel / Erklärung</strong><p>${item[3]}</p>${exampleImg}</div>`;
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
    setProgress(pct);
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
    const accessoryPreview =
      item[0] === "accessories"
        ? accessoryCount > 0
          ? `<div class="preview-thumbs">${state.photos
              .filter((p) => p.kind === "accessories")
              .map(
                (p) =>
                  `<img src="${URL.createObjectURL(p.file)}" alt="Ausgewähltes Foto" style="width:64px;height:64px;object-fit:cover;border-radius:6px;margin-right:8px;"/>`,
              )
              .join("")}</div><p class="photo-note">Insgesamt ausgewählt: ${accessoryCount}. Es sind noch ${remaining} Fotos möglich.</p>`
          : `<p>Noch kein Foto aufgenommen.</p><p class="photo-note">Insgesamt ausgewählt: 0. Es sind noch ${remaining} Fotos möglich.</p>`
        : `<p>Noch kein Foto aufgenommen.</p>`;
    renderStage(
      `<div class="photo-step">${savedNotice}<div class="photo-step-header"><p class="eyebrow">${state.leadSaved ? "Ergänzendes Foto" : "Erstes Foto"} ${state.leadSaved ? `${state.photoIndex + 1} von ${items.length}` : ""}</p><div class="photo-progress-dots">${dots}</div></div><h2 class="wizard-title">${item[1]}</h2><p class="wizard-copy">${item[2]}</p>${saveNote}<div class="photo-step-grid"><div class="photo-instructions">${helpMarkup(item)}<div class="photo-frame"><input type="file" accept="image/*" capture="environment" data-camera-file hidden><input type="file" accept="image/*" ${allowMultiple ? "multiple" : ""} data-library-file hidden><div data-preview>${accessoryPreview}</div><div class="photo-actions"><button type="button" class="photo-button" data-camera>Foto aufnehmen</button><button type="button" class="ghost-button" data-library>Aus Mediathek wählen</button>${skipAction}</div><div data-quality role="status" aria-live="polite"></div></div></div></div>${early}</div>`,
    );
    const help = stage.querySelector("[data-help]");
    if (help) {
      const helpBox = stage.querySelector("[data-help-box]");
      help.onclick = () => {
        helpBox.hidden = !helpBox.hidden;
      };
    }
    const cameraFile = stage.querySelector("[data-camera-file]");
    const libraryFile = stage.querySelector("[data-library-file]");
    stage.querySelector("[data-camera]").onclick = () => {
      cameraFile.click();
    };
    stage.querySelector("[data-library]").onclick = () => {
      libraryFile.click();
    };
    const earlyButton = stage.querySelector("[data-early]");
    if (earlyButton)
      earlyButton.onclick = () => {
        if (state.photos.length > state.uploadedPhotoCount) push("details");
        else finish();
      };
    const skipButton = stage.querySelector("[data-skip]");
    if (skipButton)
      skipButton.onclick = () => {
        state.photoIndex++;
        render();
      };

    const fileHandler = async (files) => {
      const selectedFiles = Array.from(files || []);
      if (!selectedFiles.length) return;

      const maxPhotos = 5;
      const accessoryCount = state.photos.filter((p) => p.kind === "accessories").length;
      const allowedRemaining = maxPhotos - accessoryCount;
      if (allowedRemaining <= 0) {
        const quality = stage.querySelector("[data-quality]");
        quality.innerHTML =
          '<div class="quality retry">Sie haben bereits 5 zusätzliche Fotos ausgewählt. Bitte fahren Sie mit dem aktuellen Upload fort.</div>';
        return;
      }

      const toProcess = selectedFiles.slice(0, allowMultiple ? allowedRemaining : 1);
      if (toProcess.length < selectedFiles.length) {
        const quality = stage.querySelector("[data-quality]");
        quality.innerHTML =
          '<div class="quality retry">Es werden nur maximal 5 Fotos insgesamt akzeptiert. Zusätzliche Dateien wurden entfernt.</div>';
      }

      const preview = stage.querySelector("[data-preview]");
      const renderAccessoryPreview = () => {
        const accessoryPhotos = state.photos.filter((p) => p.kind === "accessories");
        const accessoryCount = accessoryPhotos.length;
        preview.innerHTML = `<div class="preview-thumbs">${accessoryPhotos
          .map(
            (p) =>
              `<img src="${URL.createObjectURL(p.file)}" alt="Ausgewähltes Foto" style="width:64px;height:64px;object-fit:cover;border-radius:6px;margin-right:8px;"/>`,
          )
          .join("")}</div><p class="photo-note">Insgesamt ausgewählt: ${accessoryCount}. Noch ${Math.max(0, 5 - accessoryCount)} möglich.</p>`;
      };

      for (const selected of toProcess) {
        if (selected.size > 20 * 1024 * 1024) {
          const quality = stage.querySelector("[data-quality]");
          quality.innerHTML =
            '<div class="quality retry">Mindestens ein Bild ist zu groß. Bitte wählen Sie normale Fotoaufnahmen.</div>';
          return;
        }
      }

      const skipPreview = item[0] === "accessories";
      for (const selected of toProcess) {
        await handlePhoto(selected, item, skipPreview);
        if (item[0] === "accessories") {
          renderAccessoryPreview();
        }
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

  async function imageForCheck(file, max = 768) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.72));
  }

  async function imageForStorage(file, max = 3000) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  }
  async function localQuality(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
          "Das Foto ist sehr dunkel. Bitte mit mehr Licht noch einmal aufnehmen.",
      };
    if (variance < 80)
      return {
        ok: false,
        message:
          "Auf dem Foto sind kaum Details erkennbar. Bitte näher oder mit besserem Licht fotografieren.",
      };
    return { ok: true };
  }
  async function aiCheck(blob, item) {
    if (!apiBase)
      return { ok: true, message: "Foto ist brauchbar (lokaler Demo-Modus)." };
    const body = new FormData();
    body.append("image", blob, "check.jpg");
    body.append("expected", item[1]);
    body.append("instruction", item[2]);
    body.append(
      "mode",
      state.type === "unknown" && state.photoIndex === 0
        ? "identify"
        : "quality",
    );
    const res = await fetch(`${apiBase}/api/photo-check`, {
      method: "POST",
      body,
    });
    if (!res.ok) throw new Error("quality");
    return await res.json();
  }
  function advanceAfterAcceptedPhoto() {
    if (!state.leadSaved && isAIType(state.type)) {
      push("contact");
      return;
    }
    state.photoIndex++;
    render();
  }
  async function handlePhoto(selected, item, skipPreview = false) {
    const preview = stage.querySelector("[data-preview]"),
      quality = stage.querySelector("[data-quality]");
    if (!skipPreview && item[0] !== "accessories") {
      const url = URL.createObjectURL(selected);
      preview.innerHTML = `<img src="${url}" alt="Vorschau des aufgenommenen Fotos">`;
    }

    const bitmap = await createImageBitmap(selected);
    const isSmallImage = Math.max(bitmap.width, bitmap.height) < 800;

    quality.innerHTML = isSmallImage
      ? '<div class="quality retry">Dieses Bild ist recht klein. Wenn möglich, fotografieren Sie das Instrument bitte noch einmal. Sie können das Bild aber trotzdem verwenden.</div>'
      : '<div class="quality checking">Foto wird kurz geprüft …</div>';
    try {
      const small = await imageForCheck(selected);
      const local = await localQuality(small);
      if (!local.ok) {
        quality.innerHTML = `<div class="quality retry">${local.message}</div>`;
        return;
      }
      let result = { ok: true };
      const disableAi = item[0] === "accessories" || state.photoIndex === flow().length - 1;
      if (!disableAi && isAIType(state.type)) result = await aiCheck(small, item);
      if (!result.ok) {
        quality.innerHTML = `<div class="quality retry">${result.message || "Bitte noch einmal fotografieren."}</div>`;
        return;
      }
      if (result.detected_type && state.type === "unknown") {
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
      state.photos.push({ file: selected, kind: item[0], label: item[1] });
      quality.innerHTML = `<div class="quality ok">✓ ${result.message || "Das Foto ist gut brauchbar."}</div><div class="photo-actions"><button class="continue-button" data-next>Weiter</button></div>`;
      stage.querySelector("[data-next]").onclick = advanceAfterAcceptedPhoto;
    } catch (e) {
      quality.innerHTML =
        '<div class="quality ok">Foto gespeichert. Die automatische Prüfung ist gerade nicht erreichbar – Sie können trotzdem fortfahren.</div><div class="photo-actions"><button class="continue-button" data-next>Weiter</button></div>';
      state.photos.push({ file: selected, kind: item[0], label: item[1] });
      stage.querySelector("[data-next]").onclick = advanceAfterAcceptedPhoto;
    }
  }

  function simpleScreen() {
    setProgress(35);
    back.hidden = false;
    stage.innerHTML = `<h2 class="wizard-title">Fotos und kurze Angaben</h2><p class="wizard-copy">Laden Sie einfach ein oder mehrere aussagekräftige Bilder hoch.</p><div class="field"><label>Fotos</label><input type="file" accept="image/*" multiple data-simple-photos></div><div class="field"><label>Hersteller / Marke <span class="optional">optional</span></label><input data-maker></div><div class="field"><label>Was wissen Sie über das Instrument? <span class="optional">optional</span></label><textarea data-story placeholder="Zum Beispiel Alter, Herkunft, Nachlass, Modell oder Zustand."></textarea></div><button class="continue-button" data-next>Weiter</button>`;
    stage.querySelector("[data-next]").onclick = () => {
      const fs = stage.querySelector("[data-simple-photos]").files;
      state.photos = [...fs].map((file, i) => ({
        file,
        kind: `photo_${i + 1}`,
        label: "Foto",
      }));
      state.data.maker = stage.querySelector("[data-maker]").value;
      state.data.story = stage.querySelector("[data-story]").value;
      push("contact");
    };
  }

  function detailsScreen() {
    setProgress(state.leadSaved ? 90 : 72);
    back.hidden = false;
    const pendingPhotoCount = Math.max(
      0,
      state.photos.length - state.uploadedPhotoCount,
    );
    const savedCopy = state.leadSaved
      ? `<div class="saved-confirmation compact"><strong>Ihre Anfrage ist bereits gespeichert.</strong><span>${pendingPhotoCount ? `${pendingPhotoCount} ergänzende Foto(s) werden jetzt hinzugefügt.` : "Diese Angaben sind freiwillig."}</span></div>`
      : "";
    stage.innerHTML = `${savedCopy}<h2 class="wizard-title">Was wissen Sie darüber?</h2><p class="wizard-copy">Ein paar Sätze helfen. Wenn Sie nichts wissen, lassen Sie die Felder einfach leer.</p><div class="field"><label>Geschichte / Herkunft <span class="optional">optional</span></label><textarea data-story placeholder="Zum Beispiel: aus dem Nachlass meines Onkels, der Berufsmusiker war …">${state.data.story || ""}</textarea></div><div class="field"><label>Hersteller oder Name <span class="optional">optional</span></label><input data-maker value="${state.data.maker || ""}" placeholder="Unbekannt ist völlig in Ordnung"></div><button class="continue-button" data-next>${state.leadSaved ? "Ergänzungen senden" : "Weiter"}</button><div data-submit-status role="status" aria-live="polite"></div>`;
    stage.querySelector("[data-next]").onclick = async () => {
      state.data.story = stage.querySelector("[data-story]").value;
      state.data.maker = stage.querySelector("[data-maker]").value;
      if (state.leadSaved) await submitContinuation();
      else push("contact");
    };
  }

  function contactScreen() {
    const initialGuided = isInitialGuidedRequest();
    setProgress(initialGuided ? 44 : 88);
    back.hidden = initialGuided;
    const copy = initialGuided
      ? "Ein Foto reicht für den Anfang. Speichern Sie die Anfrage jetzt zwischen. Anschließend führen wir Sie direkt durch die weiteren, freiwilligen Fotoaufnahmen."
      : "Ihre Fotos und Angaben werden anschließend persönlich angesehen.";
    stage.innerHTML = `<h2 class="wizard-title">Wie dürfen wir Sie erreichen?</h2><p class="wizard-copy">${copy}</p><div class="field"><label>Name</label><input data-name value="${state.data.name || ""}"></div><div class="field"><label>E-Mail</label><input type="email" data-email value="${state.data.email || ""}" required></div><div class="field"><label>Telefon <span class="optional">optional</span></label><input type="tel" data-phone value="${state.data.phone || ""}"></div><div class="field"><label>Ort / Region <span class="optional">optional</span></label><input data-city value="${state.data.city || ""}" placeholder="z. B. Hamburg"></div><label class="mini-note"><input type="checkbox" data-consent> Ich stimme zu, dass meine Angaben und Fotos zur Bearbeitung der Anfrage verarbeitet werden.</label><div class="wizard-summary"><strong>${state.photos.length} Foto(s) ausgewählt</strong><span>${TYPES.find((t) => t[0] === state.type)?.[1] || "Instrument"}</span></div><button class="submit-button" data-submit>${initialGuided ? "Zwischenspeichern und weiter" : "Anfrage senden"}</button><div data-submit-status role="status" aria-live="polite"></div>`;
    stage.querySelector("[data-submit]").onclick = submit;
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
    state.leadId = result.id;
    state.continuationToken = result.continuation_token || null;
    state.leadSaved = true;
    state.uploadedPhotoCount = state.photos.length;
    state.photoIndex = 1;
    state.history = [];
    if (state.continuationToken)
      state.step = state.photoIndex < flow().length ? "photos" : "details";
    else state.step = "saved";
    render();
  }

  async function submit() {
    const status = stage.querySelector("[data-submit-status]");
    const email = stage.querySelector("[data-email]").value.trim();
    if (!email || !stage.querySelector("[data-consent]").checked) {
      status.innerHTML =
        '<div class="quality retry">Bitte E-Mail und Zustimmung ergänzen.</div>';
      return;
    }
    state.data = {
      ...state.data,
      name: stage.querySelector("[data-name]").value.trim(),
      email,
      phone: stage.querySelector("[data-phone]").value.trim(),
      city: stage.querySelector("[data-city]").value.trim(),
    };
    status.innerHTML =
      '<div class="quality checking">Anfrage wird übermittelt …</div>';
    const initialGuided = isInitialGuidedRequest();
    if (!apiBase) {
      state.demoStorageKey = `demo-lead-${Date.now()}`;
      localStorage.setItem(
        state.demoStorageKey,
        JSON.stringify({
          type: state.type,
          classifiedType: state.classifiedType,
          data: state.data,
          photoCount: state.photos.length,
          createdAt: new Date().toISOString(),
        }),
      );
      if (initialGuided)
        markInitialLeadSaved({
          id: state.demoStorageKey,
          continuation_token: "demo",
        });
      else finish();
      return;
    }
    try {
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
        }),
      );
      await appendPhotos(fd, state.photos);
      const res = await fetch(`${apiBase}/api/leads`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      if (initialGuided) markInitialLeadSaved(result);
      else finish();
    } catch (e) {
      status.innerHTML =
        '<div class="quality retry">Die Übermittlung hat nicht geklappt. Bitte versuchen Sie es noch einmal.</div>';
    }
  }

  async function submitContinuation() {
    const status = stage.querySelector("[data-submit-status]");
    const pendingPhotos = state.photos.slice(state.uploadedPhotoCount);
    status.innerHTML =
      '<div class="quality checking">Ergänzungen werden übermittelt …</div>';

    if (!apiBase || state.continuationToken === "demo") {
      if (state.demoStorageKey) {
        const existing = JSON.parse(
          localStorage.getItem(state.demoStorageKey) || "{}",
        );
        localStorage.setItem(
          state.demoStorageKey,
          JSON.stringify({
            ...existing,
            classifiedType: state.classifiedType,
            data: state.data,
            photoCount: state.photos.length,
          }),
        );
      }
      state.uploadedPhotoCount = state.photos.length;
      finish();
      return;
    }

    if (!state.leadId || !state.continuationToken) {
      status.innerHTML =
        '<div class="quality retry">Ihre Anfrage ist gespeichert. Zusätzliche Angaben können gerade nicht ergänzt werden.</div><div class="photo-actions"><button class="ghost-button" type="button" data-finish>Für jetzt fertig</button></div>';
      stage.querySelector("[data-finish]").onclick = finish;
      return;
    }

    try {
      const fd = new FormData();
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
          headers: { Authorization: `Bearer ${state.continuationToken}` },
          body: fd,
        },
      );
      if (!res.ok) throw new Error();
      state.uploadedPhotoCount = state.photos.length;
      finish();
    } catch (e) {
      status.innerHTML =
        '<div class="quality retry">Ihre ursprüngliche Anfrage ist bereits gespeichert. Die Ergänzungen konnten noch nicht übertragen werden. Bitte versuchen Sie es erneut oder schließen Sie für jetzt ab.</div><div class="photo-actions"><button class="ghost-button" type="button" data-finish>Für jetzt fertig</button></div>';
      stage.querySelector("[data-finish]").onclick = finish;
    }
  }

  function savedScreen() {
    setProgress(54);
    back.hidden = true;
    const hasMorePhotoSteps = state.photoIndex < flow().length;
    const canContinue = Boolean(state.continuationToken);
    const primaryLabel = hasMorePhotoSteps
      ? "Weitere Fotos jetzt hochladen"
      : "Weitere Angaben ergänzen";
    const unavailable = canContinue
      ? ""
      : '<div class="quality retry continuation-unavailable">Der ergänzende Upload ist in dieser Vorschau noch nicht verbunden. Die Anfrage selbst wurde gespeichert.</div>';
    renderStage(
      `<div class="saved-confirmation"><span class="saved-check" aria-hidden="true">✓</span><div><p class="eyebrow">Zwischengespeichert</p><h2 class="wizard-title">Der erste Schritt ist geschafft.</h2><p class="wizard-copy">Ihr erstes Foto und Ihre Kontaktdaten sind sicher gespeichert. Laden Sie jetzt nach Möglichkeit weitere Ansichten hoch – sie helfen uns bei der persönlichen Prüfung.</p></div></div><div class="saved-actions"><button class="continue-button" type="button" data-continue ${canContinue ? "" : "disabled aria-disabled=\"true\""}>${primaryLabel}</button>${unavailable}<button class="ghost-button" type="button" data-finish>Ohne weitere Fotos abschließen</button></div>`,
    );
    const continueButton = stage.querySelector("[data-continue]");
    if (continueButton)
      continueButton.onclick = () => {
        state.history.push({ step: "saved", photoIndex: state.photoIndex });
        state.step = hasMorePhotoSteps ? "photos" : "details";
        render();
      };
    stage.querySelector("[data-finish]").onclick = finish;
  }

  function doneScreen() {
    setProgress(100);
    back.hidden = true;
    stage.innerHTML =
      '<p class="eyebrow">Fertig</p><h2 class="wizard-title">Vielen Dank.</h2><p class="wizard-copy">Ihre Anfrage ist angekommen. Die Fotos und Angaben werden persönlich angesehen. Wir melden uns anschließend bei Ihnen.</p><a class="button secondary" href="/">Zur Startseite</a>';
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
  if (state.type && TYPES.some((t) => t[0] === state.type)) {
    state.step = isAIType(state.type) ? "photos" : "simple";
    state.history = [{ step: "type", photoIndex: 0 }];
  }
  render();
})();
