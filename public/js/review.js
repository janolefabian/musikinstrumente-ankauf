(() => {
 const root=document.querySelector('[data-review]'); if(!root)return;
 const grid=root.querySelector('[data-review-grid]'); const detail=root.querySelector('[data-review-detail]'); const api=root.dataset.apiBase||''; let leads=[];
 const demo=[
  {id:'DEMO-184',class:'A',notable:true,title:'2 Kontrabässe + 3 Bögen',city:'Hamburg',summary:'Nachlass eines Berufsmusikers · mehrere Bögen · Stempel auf einem Bogen sichtbar',score:96,confidence:63,image:'/images/header_instrumente.jpg'},
  {id:'DEMO-185',class:'C',notable:false,title:'Gitarre',city:'Berlin',summary:'Serieninstrument · wenige Auffälligkeiten',score:9,confidence:95,image:'/images/violine.jpg'},
  {id:'DEMO-186',class:'B',notable:true,title:'Unbekannter Bogen',city:'Bremen',summary:'Bogenart unsicher · eingeprägter Stempel sichtbar · manuell prüfen',score:67,confidence:31,image:'/images/testimonials/rol.jpg'}
 ];
 let token=localStorage.getItem('review-token')||'';
 const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
 function bucket(l){if(l.class==='A')return'urgent';if(l.notable)return'notable';if(l.class==='B'||l.class==='C')return'week';return'all'}
 async function protectedImage(url){if(!api||!url)return url;const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)return '/images/header_instrumente.jpg';return URL.createObjectURL(await r.blob())}
 function ensureToken(){if(token)return true;token=prompt('Review-Zugangsschlüssel:')||'';if(token)localStorage.setItem('review-token',token);return Boolean(token)}
 function setUrlLead(id){const u=new URL(location.href);if(id)u.searchParams.set('lead',id);else u.searchParams.delete('lead');history.pushState({},'',u)}
 async function render(filter='all'){
  detail.hidden=true;grid.hidden=false;
  const show=filter==='all'?leads:leads.filter(l=>bucket(l)===filter);const cards=[];
  for(const l of show){const img=await protectedImage(l.image);cards.push(`<button class="lead-card" data-open="${esc(l.id)}"><img src="${esc(img||'/images/header_instrumente.jpg')}" alt="Vorschaubild der Anfrage"><div class="lead-card-body"><div class="lead-badges"><span class="badge ${l.class==='A'?'hot':''}">${esc(l.class||'?')}</span>${l.notable?'<span class="badge notable">Auffällig</span>':''}<span class="badge">Interesse ${esc(l.score??'?')}</span><span class="badge">Sicherheit ${esc(l.confidence??'?')}</span></div><h3>${esc(l.title||'Anfrage')}</h3><p class="lead-meta">${esc(l.city||'Ort unbekannt')} · ${esc(l.id)}</p><p>${esc(l.summary||'')}</p></div></button>`)}
  grid.innerHTML=cards.join('')||'<p>Keine Anfragen in dieser Ansicht.</p>';grid.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openLead(b.dataset.open));
 }
 async function openLead(id){
  if(!api){detail.hidden=false;grid.hidden=true;detail.innerHTML='<button class="ghost-button" data-close>← Zurück</button><h2>Demo-Detailansicht</h2><p>Mit verbundenem Worker erscheinen hier alle Bilder, Angaben und KI-Signale.</p>';detail.querySelector('[data-close]').onclick=()=>{setUrlLead(null);render()};return;}
  if(!ensureToken())return;
  detail.hidden=false;grid.hidden=true;detail.innerHTML='<p>Anfrage wird geladen …</p>';
  try{
   const r=await fetch(`${api}/api/review/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error();const l=await r.json();
   const imgs=[];for(const p of l.photos||[])imgs.push({...(p),src:await protectedImage(p.url)});
   const signals=l.ai?.signals||[];
   detail.innerHTML=`<div class="detail-top"><button class="ghost-button" data-close>← Alle Anfragen</button><div class="lead-badges"><span class="badge ${l.lead_class==='A'?'hot':''}">${esc(l.lead_class)}</span>${l.notable?'<span class="badge notable">Auffällig</span>':''}<span class="badge">Interesse ${esc(l.interest_score)}</span><span class="badge">Sicherheit ${esc(l.confidence)}</span></div></div><h2>${esc(l.ai?.title||l.type||'Anfrage')}</h2><p class="lead-meta">${esc(l.city||'Ort unbekannt')} · ${esc(l.id)} · ${esc(new Date(l.created_at).toLocaleString('de-DE'))}</p><p class="detail-summary">${esc(l.summary||'')}</p><div class="detail-grid">${imgs.map(x=>`<figure><img src="${esc(x.src)}" alt="${esc(x.label||'Foto')}"><figcaption>${esc(x.label||x.kind||'Foto')}</figcaption></figure>`).join('')}</div><div class="detail-columns"><section><h3>Angaben</h3><dl><dt>Name</dt><dd>${esc(l.name||'–')}</dd><dt>E-Mail</dt><dd>${esc(l.email||'–')}</dd><dt>Telefon</dt><dd>${esc(l.phone||'–')}</dd><dt>Hersteller / Name</dt><dd>${esc(l.maker||'–')}</dd><dt>Geschichte / Herkunft</dt><dd>${esc(l.story||'–')}</dd></dl></section><section><h3>Auffälligkeiten</h3><ul>${signals.length?signals.map(s=>`<li>${esc(s)}</li>`).join(''):'<li>Keine zusätzlichen Signale.</li>'}</ul><p class="mini-note">Make: ${esc(l.make_status||'–')}</p></section></div><div class="status-actions"><button data-status="interesting">Interessant</button><button data-status="contacted">Kontaktiert</button><button data-status="purchased">Angekauft</button><button data-status="declined">Nicht interessant</button><button data-status="archived">Archiv</button></div><div data-status-note></div>`;
   detail.querySelector('[data-close]').onclick=()=>{setUrlLead(null);render()};detail.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{const rr=await fetch(`${api}/api/review/${encodeURIComponent(id)}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({status:b.dataset.status})});detail.querySelector('[data-status-note]').textContent=rr.ok?'Status gespeichert.':'Status konnte nicht gespeichert werden.'});
   setUrlLead(id);
  }catch{detail.innerHTML='<button class="ghost-button" data-close>← Zurück</button><p>Anfrage konnte nicht geladen werden.</p>';detail.querySelector('[data-close]').onclick=()=>render();}
 }
 root.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{root.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.filter)});
 window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('lead');id?openLead(id):render()});
 (async()=>{if(!api){leads=demo;const id=new URLSearchParams(location.search).get('lead');id?openLead(id):render();return;}if(!ensureToken()){grid.innerHTML='<p>Review-Zugangsschlüssel erforderlich.</p>';return;}try{const r=await fetch(`${api}/api/review`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error();leads=await r.json();const id=new URLSearchParams(location.search).get('lead');id?openLead(id):render();}catch{grid.innerHTML='<p>Dashboard konnte nicht geladen werden. Bitte Review-Zugangsschlüssel und API-Konfiguration prüfen.</p>';}})();
})();
