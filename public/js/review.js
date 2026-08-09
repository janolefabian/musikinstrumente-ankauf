(() => {
  const root = document.querySelector('[data-review]');
  if (!root) return;

  const listEl = root.querySelector('[data-review-grid]');
  const detailEl = root.querySelector('[data-review-detail]');
  const searchEl = root.querySelector('[data-review-search]');
  const resultCountEl = root.querySelector('[data-result-count]');
  const lightbox = root.querySelector('[data-lightbox]');
  const api = root.dataset.apiBase || '';

  const demo = [
    {id:'DEMO-184',class:'A',notable:true,title:'2 Kontrabässe + 3 Bögen',city:'Hamburg',summary:'Nachlass eines Berufsmusikers · mehrere Bögen · Stempel auf einem Bogen sichtbar',score:96,confidence:63,image:'/images/header_instrumente.jpg',name:'Anna Beispiel',maker:'unbekannt',status:'new',created_at:new Date().toISOString(),photo_count:7},
    {id:'DEMO-185',class:'C',notable:false,title:'Gitarre',city:'Berlin',summary:'Serieninstrument · wenige Auffälligkeiten',score:9,confidence:95,image:'/images/violine.jpg',name:'Max Beispiel',maker:'Yamaha',status:'new',created_at:new Date(Date.now()-86400000).toISOString(),photo_count:3},
    {id:'DEMO-186',class:'B',notable:true,title:'Unbekannter Bogen',city:'Bremen',summary:'Bogenart unsicher · eingeprägter Stempel sichtbar · manuell prüfen',score:67,confidence:31,image:'/images/testimonials/rol.jpg',name:'Lisa Beispiel',maker:'unbekannt',status:'new',created_at:new Date(Date.now()-7200000).toISOString(),photo_count:4}
  ];

  let leads = [];
  let token = localStorage.getItem('review-token') || '';
  let currentFilter = 'all';
  let currentQuery = '';
  let selectedId = null;
  let currentImages = [];
  let lightboxIndex = 0;
  const imageCache = new Map();

  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const norm = (s) => String(s ?? '').toLocaleLowerCase('de-DE').trim();
  const fmtDate = (value) => value ? new Date(value).toLocaleString('de-DE', {dateStyle:'short', timeStyle:'short'}) : '';
  const statusLabel = (status) => ({new:'Neu',contacted:'Kontaktiert',interesting:'Interessant',purchased:'Angekauft',declined:'Nicht interessant',archived:'Archiv'}[status] || status || 'Neu');

  function bucket(l) {
    if (l.class === 'A') return 'urgent';
    if (l.notable) return 'notable';
    if (l.class === 'B') return 'week';
    if (l.class === 'C') return 'c';
    return 'all';
  }

  function searchable(l) {
    return norm([l.id,l.title,l.city,l.summary,l.name,l.maker,l.email,l.phone,l.type,l.classified_type].join(' '));
  }

  function filteredLeads() {
    return leads.filter(l => {
      const filterOk = currentFilter === 'all' || bucket(l) === currentFilter;
      const queryOk = !currentQuery || searchable(l).includes(currentQuery);
      return filterOk && queryOk;
    });
  }

  function updateCounts() {
    const counts = {urgent:0, notable:0, week:0, c:0, all:leads.length};
    for (const l of leads) {
      const b = bucket(l);
      if (counts[b] !== undefined) counts[b]++;
    }
    root.querySelectorAll('[data-count]').forEach(el => {
      const n = counts[el.dataset.count] ?? 0;
      el.textContent = n ? `(${n})` : '';
    });
  }

  async function apiFetch(url, options = {}, allowPrompt = true) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let r = await fetch(url, {...options, headers});
    if (r.status === 401 && allowPrompt) {
      const entered = prompt('Review-Zugangsschlüssel:') || '';
      if (!entered) return r;
      token = entered;
      localStorage.setItem('review-token', token);
      headers.set('Authorization', `Bearer ${token}`);
      r = await fetch(url, {...options, headers});
    }
    return r;
  }

  async function protectedImage(url) {
    if (!api || !url) return url || '/images/header_instrumente.jpg';
    if (imageCache.has(url)) return imageCache.get(url);
    const r = await apiFetch(url);
    if (!r.ok) return '/images/header_instrumente.jpg';
    const objectUrl = URL.createObjectURL(await r.blob());
    imageCache.set(url, objectUrl);
    return objectUrl;
  }

  function setUrlLead(id, replace = false) {
    const u = new URL(location.href);
    if (id) u.searchParams.set('lead', id); else u.searchParams.delete('lead');
    history[replace ? 'replaceState' : 'pushState']({}, '', u);
  }

  function confidenceBadge(confidence) {
    const n = Number(confidence);
    return Number.isFinite(n) && n < 50 ? '<span class="badge uncertain">KI unsicher</span>' : '';
  }

  async function renderList() {
    const show = filteredLeads();
    resultCountEl.textContent = `${show.length} ${show.length === 1 ? 'Anfrage' : 'Anfragen'}`;
    const cards = [];
    for (const l of show) {
      const img = await protectedImage(l.image);
      cards.push(`
        <button class="lead-row${l.id === selectedId ? ' selected' : ''}" data-open="${esc(l.id)}" type="button">
          <img src="${esc(img || '/images/header_instrumente.jpg')}" alt="Vorschaubild der Anfrage">
          <div class="lead-row-body">
            <div class="lead-row-top">
              <div class="lead-badges">
                <span class="badge ${l.class === 'A' ? 'hot' : ''}">${esc(l.class || '?')}</span>
                ${l.notable ? '<span class="badge notable">Auffällig</span>' : ''}
                ${confidenceBadge(l.confidence)}
              </div>
              <time>${esc(fmtDate(l.created_at))}</time>
            </div>
            <h3>${esc(l.title || 'Anfrage')}</h3>
            <p class="lead-meta">${esc(l.city || 'Ort unbekannt')}${l.name ? ` · ${esc(l.name)}` : ''}</p>
            <p class="lead-row-summary">${esc(l.summary || '')}</p>
            <div class="lead-row-footer"><span>${esc(statusLabel(l.status))}</span><span>${esc(l.photo_count ?? '')}${l.photo_count != null ? ' Fotos' : ''}</span><span>Interesse ${esc(l.score ?? '?')}</span></div>
          </div>
        </button>`);
    }
    listEl.innerHTML = cards.join('') || '<div class="review-no-results"><p>Keine Anfragen in dieser Ansicht.</p></div>';
    listEl.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openLead(b.dataset.open));
  }

  async function renderDemoDetail(id) {
    const l = leads.find(x => x.id === id) || leads[0];
    if (!l) return;
    detailEl.innerHTML = `<div class="review-empty-state"><p class="eyebrow">Demo</p><h2>${esc(l.title)}</h2><p>Mit verbundenem Worker erscheinen hier alle Bilder, Angaben und KI-Signale.</p></div>`;
  }

  async function openLead(id, options = {}) {
    selectedId = id;
    if (!options.keepUrl) setUrlLead(id);
    await renderList();
    root.classList.add('has-selection');
    detailEl.innerHTML = '<div class="detail-loading">Anfrage wird geladen …</div>';

    if (!api) {
      await renderDemoDetail(id);
      return;
    }

    try {
      const r = await apiFetch(`${api}/api/review/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const l = await r.json();
      currentImages = [];
      for (const p of l.photos || []) currentImages.push({...p, src: await protectedImage(p.url)});
      const signals = l.ai?.signals || [];
      const title = l.ai?.title || l.type || 'Anfrage';
      const confidence = Number(l.confidence);

      detailEl.innerHTML = `
        <div class="detail-top">
          <button class="ghost-button detail-mobile-back" data-close type="button">← Anfragen</button>
          <div class="lead-badges">
            <span class="badge ${l.lead_class === 'A' ? 'hot' : ''}">${esc(l.lead_class || '?')}</span>
            ${l.notable ? '<span class="badge notable">Auffällig</span>' : ''}
            ${confidenceBadge(confidence)}
            <span class="badge">Interesse ${esc(l.interest_score ?? '?')}</span>
            <span class="badge">Sicherheit ${esc(l.confidence ?? '?')}</span>
            <span class="badge status-badge">${esc(statusLabel(l.status))}</span>
          </div>
        </div>
        <h2>${esc(title)}</h2>
        <p class="lead-meta">${esc(l.city || 'Ort unbekannt')} · ${esc(l.id)} · ${esc(fmtDate(l.created_at))}</p>
        ${l.summary ? `<p class="detail-summary">${esc(l.summary)}</p>` : ''}
        ${Number.isFinite(confidence) && confidence < 50 ? '<div class="uncertainty-note"><strong>Manuell prüfen.</strong> Die automatische Einordnung ist hier unsicher.</div>' : ''}

        <div class="detail-gallery-header"><h3>Fotos</h3><span>${currentImages.length}</span></div>
        <div class="detail-grid">
          ${currentImages.length ? currentImages.map((x, i) => `<button class="detail-photo" type="button" data-image-index="${i}"><img src="${esc(x.src)}" alt="${esc(x.label || 'Foto')}"><span>${esc(x.label || x.kind || `Foto ${i+1}`)}</span></button>`).join('') : '<p>Keine Fotos vorhanden.</p>'}
        </div>

        <div class="detail-columns">
          <section>
            <h3>Kontakt & Angaben</h3>
            <dl>
              <dt>Name</dt><dd>${esc(l.name || '–')}</dd>
              <dt>E-Mail</dt><dd>${l.email ? `<a href="mailto:${encodeURIComponent(l.email)}">${esc(l.email)}</a>` : '–'}</dd>
              <dt>Telefon</dt><dd>${l.phone ? `<a href="tel:${esc(l.phone.replace(/[^+0-9]/g,''))}">${esc(l.phone)}</a>` : '–'}</dd>
              <dt>Ort</dt><dd>${esc(l.city || '–')}</dd>
              <dt>Hersteller / Name</dt><dd>${esc(l.maker || '–')}</dd>
              <dt>Geschichte / Herkunft</dt><dd>${esc(l.story || '–')}</dd>
            </dl>
          </section>
          <section>
            <h3>Auffälligkeiten</h3>
            <ul>${signals.length ? signals.map(s => `<li>${esc(s)}</li>`).join('') : '<li>Keine zusätzlichen Signale.</li>'}</ul>
            <p class="mini-note">Make: ${esc(l.make_status || '–')}</p>
          </section>
        </div>

        <div class="status-panel">
          <div><p class="eyebrow">Bearbeitung</p><h3>Status setzen</h3></div>
          <div class="status-actions">
            <button data-status="interesting" type="button">Interessant</button>
            <button data-status="contacted" type="button">Kontaktiert</button>
            <button data-status="purchased" type="button">Angekauft</button>
            <button data-status="declined" type="button">Nicht interessant</button>
            <button data-status="archived" type="button">Archiv</button>
          </div>
          <div class="status-note" data-status-note></div>
          <div style="margin-top:12px">
            <button class="ghost-button" data-delete type="button">Lead löschen</button>
          </div>
          <p class="keyboard-hint">Tastatur: <kbd>J</kbd>/<kbd>K</kbd> nächster/vorheriger Lead · <kbd>I</kbd> interessant · <kbd>C</kbd> kontaktiert · <kbd>P</kbd> angekauft</p>
        </div>`;

      detailEl.querySelector('[data-close]').onclick = closeMobileDetail;
      detailEl.querySelectorAll('[data-image-index]').forEach(b => b.onclick = () => openLightbox(Number(b.dataset.imageIndex)));
      detailEl.querySelectorAll('[data-status]').forEach(b => b.onclick = () => setStatus(id, b.dataset.status));
      const delBtn = detailEl.querySelector('[data-delete]');
      if (delBtn) {
        delBtn.onclick = async () => {
          if (!confirm('Lead endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
          if (!api) {
            leads = leads.filter(x => x.id !== id);
            updateCounts();
            closeMobileDetail();
            return;
          }
          const rr = await apiFetch(`${api}/api/review/${encodeURIComponent(id)}`, { method: 'DELETE' });
          if (rr.ok) {
            leads = leads.filter(x => x.id !== id);
            updateCounts();
            closeMobileDetail();
            await renderList();
          } else {
            alert('Löschen fehlgeschlagen.');
          }
        };
      }
    } catch (e) {
      console.error(e);
      detailEl.innerHTML = '<div class="review-empty-state"><h2>Anfrage konnte nicht geladen werden.</h2><p>Bitte API-Verbindung und Review-Zugang prüfen.</p></div>';
    }
  }

  async function setStatus(id, status) {
    if (!api) return;
    const note = detailEl.querySelector('[data-status-note]');
    if (note) note.textContent = 'Wird gespeichert …';
    const rr = await apiFetch(`${api}/api/review/${encodeURIComponent(id)}`, {
      method:'PATCH',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({status})
    });
    if (rr.ok) {
      const l = leads.find(x => x.id === id);
      if (l) l.status = status;
      if (note) note.textContent = `Status: ${statusLabel(status)}`;
      await renderList();
      const badge = detailEl.querySelector('.status-badge');
      if (badge) badge.textContent = statusLabel(status);
    } else if (note) note.textContent = 'Status konnte nicht gespeichert werden.';
  }

  function closeMobileDetail() {
    root.classList.remove('has-selection');
    selectedId = null;
    setUrlLead(null);
    renderList();
  }

  function openLightbox(index) {
    if (!currentImages.length) return;
    lightboxIndex = Math.max(0, Math.min(index, currentImages.length - 1));
    const item = currentImages[lightboxIndex];
    root.querySelector('[data-lightbox-image]').src = item.src;
    root.querySelector('[data-lightbox-caption]').textContent = item.label || item.kind || `Foto ${lightboxIndex + 1}`;
    lightbox.hidden = false;
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
  }

  function stepLightbox(delta) {
    if (lightbox.hidden || !currentImages.length) return;
    lightboxIndex = (lightboxIndex + delta + currentImages.length) % currentImages.length;
    openLightbox(lightboxIndex);
  }

  function stepLead(delta) {
    const visible = filteredLeads();
    if (!visible.length) return;
    let i = visible.findIndex(l => l.id === selectedId);
    if (i < 0) i = delta > 0 ? -1 : 0;
    i = Math.max(0, Math.min(visible.length - 1, i + delta));
    if (visible[i]) openLead(visible[i].id);
  }

  root.querySelector('[data-lightbox-close]').onclick = closeLightbox;
  root.querySelector('[data-lightbox-prev]').onclick = () => stepLightbox(-1);
  root.querySelector('[data-lightbox-next]').onclick = () => stepLightbox(1);
  lightbox.onclick = (e) => { if (e.target === lightbox) closeLightbox(); };

  root.querySelectorAll('[data-filter]').forEach(b => b.onclick = async () => {
    currentFilter = b.dataset.filter;
    root.querySelectorAll('[data-filter]').forEach(x => x.classList.toggle('active', x === b));
    await renderList();
  });

  searchEl.addEventListener('input', async () => {
    currentQuery = norm(searchEl.value);
    await renderList();
  });

  window.addEventListener('popstate', () => {
    const id = new URLSearchParams(location.search).get('lead');
    if (id) openLead(id, {keepUrl:true}); else closeMobileDetail();
  });

  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (['INPUT','TEXTAREA','SELECT'].includes(tag) || document.activeElement?.isContentEditable) return;
    if (!lightbox.hidden) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
      return;
    }
    if (e.key.toLowerCase() === 'j') stepLead(1);
    if (e.key.toLowerCase() === 'k') stepLead(-1);
    if (!selectedId) return;
    if (e.key.toLowerCase() === 'i') setStatus(selectedId, 'interesting');
    if (e.key.toLowerCase() === 'c') setStatus(selectedId, 'contacted');
    if (e.key.toLowerCase() === 'p') setStatus(selectedId, 'purchased');
  });

  (async () => {
    try {
      if (!api) leads = demo;
      else {
        const r = await apiFetch(`${api}/api/review`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        leads = await r.json();
      }
      updateCounts();
      const id = new URLSearchParams(location.search).get('lead');
      await renderList();
      if (id && leads.some(l => l.id === id)) await openLead(id, {keepUrl:true});
    } catch (e) {
      console.error(e);
      listEl.innerHTML = '<div class="review-no-results"><p>Dashboard konnte nicht geladen werden. Bitte Review-Zugangsschlüssel und API-Konfiguration prüfen.</p></div>';
    }
  })();
})();
