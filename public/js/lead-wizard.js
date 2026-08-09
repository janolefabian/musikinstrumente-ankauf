(() => {
  const root = document.querySelector('[data-lead-wizard]');
  if (!root) return;
  const stage = root.querySelector('[data-wizard-stage]');
  const back = root.querySelector('[data-back]');
  const progress = root.querySelector('[data-progress-fill]');
  const apiBase = root.dataset.apiBase || '';
  const params = new URLSearchParams(location.search);

  const TYPES = [
    ['double_bass','Kontrabass','Geführte Fotos mit Qualitätscheck'],
    ['bow','Bogen','Geigen-, Bratschen-, Cello- oder Kontrabassbogen'],
    ['strings','Geige / Bratsche / Cello','Geführte Fotos mit Qualitätscheck'],
    ['guitar','Gitarre','Einfacher Upload ohne KI-Führung'],
    ['estate','Mehrere Instrumente / Nachlass','Erst Überblick, dann wichtige Details'],
    ['unknown','Ich weiß es nicht','Ein Foto reicht für die erste Einordnung'],
    ['other','Etwas anderes','Einfacher Upload ohne KI-Führung']
  ];

  const FLOWS = {
    double_bass:[
      ['front','Ganzes Instrument von vorne','Stellen Sie den Bass möglichst frei hin und fotografieren Sie ihn vollständig von vorne.','Gemeint ist eine Aufnahme, auf der das ganze Instrument vom Boden bis zur Schnecke sichtbar ist.'],
      ['back','Ganzes Instrument von hinten','Bitte fotografieren Sie den gesamten Bass von hinten.','Die Rückseite hilft, Bauweise, Holz und Reparaturen zu erkennen.'],
      ['scroll','Oberer Teil mit Wirbeln','Fotografieren Sie den oberen Teil des Instruments möglichst nah und scharf.','Gemeint sind Wirbelkasten und Schnecke – dort, wo die Saiten oben befestigt und gestimmt werden.'],
      ['label','Zettel oder Beschriftung im Inneren','Falls Sie innen einen Zettel, Brandstempel oder eine Beschriftung sehen, fotografieren Sie diese bitte.','Leuchten Sie durch ein F-Loch ins Instrument. Wenn nichts zu finden ist, einfach überspringen.'],
      ['accessories','Bögen, Koffer und Zubehör','Fotografieren Sie bitte auch alles, was zu dem Bass gehört.','Bögen können besonders wichtig sein. Fotografieren Sie sie auch dann, wenn Sie nicht wissen, um welche Art Bogen es sich handelt.']
    ],
    strings:[
      ['front','Ganzes Instrument von vorne','Fotografieren Sie das gesamte Instrument von vorne.','Das ganze Instrument sollte einschließlich Kopf sichtbar sein.'],
      ['back','Ganzes Instrument von hinten','Bitte einmal die vollständige Rückseite.','Die Rückseite zeigt wichtige Merkmale von Holz, Form und Zustand.'],
      ['scroll','Oberer Teil mit Wirbeln','Fotografieren Sie Kopf, Wirbel und Schnecke aus der Nähe.','Gemeint ist das obere Ende des Instruments, an dem die Saiten gestimmt werden.'],
      ['label','Zettel im Instrument','Wenn im Inneren ein Zettel oder eine Beschriftung sichtbar ist, fotografieren Sie diese.','Schauen Sie durch die F-Löcher. Wenn Sie nichts finden, einfach weiter.'],
      ['accessories','Bogen und Koffer','Bitte fotografieren Sie auch vorhandene Bögen, Koffer und Unterlagen.','Gerade Bögen können unabhängig vom Instrument interessant sein.']
    ],
    bow:[
      ['whole','Ganzer Bogen','Legen Sie den Bogen auf einen ruhigen Hintergrund und fotografieren Sie ihn vollständig.','Der gesamte Bogen von Frosch bis Spitze sollte sichtbar sein.'],
      ['frog','Unteres Ende mit Griffstück','Fotografieren Sie das untere Ende des Bogens nah und scharf.','Dieses Teil heißt Frosch. Gemeint ist das bewegliche Griffstück direkt neben der Schraube.'],
      ['head','Spitze des Bogens','Fotografieren Sie die Spitze am anderen Ende des Bogens von der Seite.','Dieses Ende wird Bogenkopf genannt.'],
      ['stamp','Stempel oder eingeprägter Name','Schauen Sie am Holz nahe dem Griffstück nach einem Namen oder Stempel und fotografieren Sie ihn möglichst scharf.','Der Stempel befindet sich häufig auf der Stange unmittelbar oberhalb des Frosches. Seitliches Licht hilft beim Lesen.']
    ],
    estate:[
      ['overview','Alles zusammen','Fotografieren Sie zunächst den gesamten Bestand oder mehrere Übersichtsaufnahmen.','Es geht noch nicht um perfekte Detailfotos. Wichtig ist zunächst zu sehen, welche Instrumente, Bögen und Koffer vorhanden sind.'],
      ['bows','Bögen und kleine Gegenstände','Falls Bögen vorhanden sind, fotografieren Sie diese bitte separat.','Bögen können leicht übersehen werden. Legen Sie mehrere Bögen ruhig nebeneinander.'],
      ['papers','Unterlagen und Beschriftungen','Fotografieren Sie vorhandene Expertisen, Rechnungen, Etiketten oder andere Unterlagen.','Sie müssen nicht entscheiden, was davon wichtig ist.']
    ],
    unknown:[
      ['overview','Ein Foto von dem Gegenstand','Fotografieren Sie den Gegenstand vollständig.','Ein einziges brauchbares Übersichtsbild reicht zunächst. Danach kann der Ablauf passend weitergeführt werden.']
    ]
  };

  const state = {
    type: params.get('type') || null,
    city: params.get('city') || '',
    step: 'type',
    photoIndex: 0,
    photos: [],
    history: [],
    data: { story:'', name:'', email:'', phone:'', city:params.get('city') || '' },
    classifiedType: null
  };

  function isAIType(type){ return ['double_bass','bow','strings','estate','unknown'].includes(type); }
  function flow(){ return FLOWS[state.classifiedType || state.type] || []; }
  function setProgress(value){ progress.style.width = `${Math.max(5, Math.min(100,value))}%`; }
  function renderStage(html){
    stage.style.transition = 'none';
    stage.style.opacity = '0';
    stage.innerHTML = html;
    void stage.offsetWidth;
    stage.style.transition = 'opacity .22s ease';
    stage.style.opacity = '1';
  }
  function push(next){ state.history.push({step:state.step, photoIndex:state.photoIndex}); state.step=next; render(); }
  function goBack(){ const last=state.history.pop(); if(!last)return; state.step=last.step; state.photoIndex=last.photoIndex; render(); }
  back.addEventListener('click',goBack);

  function chooseType(type){ state.type=type; state.classifiedType=null; state.photoIndex=0; state.photos=[]; if(isAIType(type)) push('photos'); else push('simple'); }

  function typeScreen(){
    setProgress(8); back.hidden=true;
    renderStage(`<h2 class="wizard-title">Was möchten Sie anbieten?</h2><p class="wizard-copy">Wählen Sie einfach die passendste Kategorie. „Ich weiß es nicht“ ist völlig in Ordnung.</p><div class="choice-grid">${TYPES.map(([id,title,copy])=>`<button class="choice" data-type="${id}"><strong>${title}</strong><small>${copy}</small></button>`).join('')}</div>`);
    stage.querySelectorAll('[data-type]').forEach(b=>b.onclick=()=>chooseType(b.dataset.type));
  }

  function helpMarkup(item){ return item[3] ? `<button type="button" class="help-button" data-help>Beispiel ansehen</button><div class="help-box" data-help-box hidden><strong>Beispiel / Erklärung</strong><p>${item[3]}</p><div class="help-placeholder">Beispielbild</div></div>` : ''; }

  function photoScreen(){
    const items=flow(); const item=items[state.photoIndex];
    if(!item){ push('details'); return; }
    const pct=15 + Math.round((state.photoIndex/items.length)*48); setProgress(pct); back.hidden=false;
    const dots = items.map((_,idx)=>`<span class="photo-dot${idx===state.photoIndex?' active':''}" aria-hidden="true"></span>`).join('');
    const early=state.photos.length>=2?`<div class="early-submit"><button class="ghost-button" type="button" data-early>Continue with the current photos</button></div>`:'';
    renderStage(`<div class="photo-step"><div class="photo-step-header"><p class="eyebrow">Foto ${state.photoIndex+1} von ${items.length}</p><div class="photo-progress-dots">${dots}</div></div><h2 class="wizard-title">${item[1]}</h2><p class="wizard-copy">${item[2]}</p><div class="photo-step-grid"><div class="photo-instructions">${helpMarkup(item)}<div class="photo-frame"><input type="file" accept="image/*" capture="environment" data-file hidden><div data-preview><p>Noch kein Foto aufgenommen.</p></div><div class="photo-actions"><button type="button" class="photo-button" data-camera>Foto aufnehmen</button><button type="button" class="ghost-button" data-library>Aus Mediathek wählen</button></div><div data-quality></div></div></div></div>${early}</div>`);
    const help=stage.querySelector('[data-help]'); if(help){ const helpBox=stage.querySelector('[data-help-box]'); help.onclick=()=>{ helpBox.hidden = !helpBox.hidden; }; }
    const file=stage.querySelector('[data-file]'); stage.querySelector('[data-camera]').onclick=()=>{file.setAttribute('capture','environment');file.click()}; stage.querySelector('[data-library]').onclick=()=>{file.removeAttribute('capture');file.click()};
    const earlyButton=stage.querySelector('[data-early]'); if(earlyButton)earlyButton.onclick=()=>push('details');
    file.onchange=async()=>{ const selected=file.files?.[0]; if(!selected)return; await handlePhoto(selected,item); };
  }

  async function imageForCheck(file,max=768){
    const bitmap=await createImageBitmap(file); const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)); const canvas=document.createElement('canvas'); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale); const ctx=canvas.getContext('2d'); ctx.drawImage(bitmap,0,0,canvas.width,canvas.height); return await new Promise(r=>canvas.toBlob(r,'image/jpeg',.72));
  }
  async function localQuality(blob){
    const bitmap=await createImageBitmap(blob); const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64; const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.drawImage(bitmap,0,0,64,64); const d=ctx.getImageData(0,0,64,64).data; let sum=0,sum2=0; for(let i=0;i<d.length;i+=4){const y=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];sum+=y;sum2+=y*y;} const n=d.length/4,mean=sum/n,variance=sum2/n-mean*mean; if(mean<28)return {ok:false,message:'Das Foto ist sehr dunkel. Bitte mit mehr Licht noch einmal aufnehmen.'}; if(variance<80)return {ok:false,message:'Auf dem Foto sind kaum Details erkennbar. Bitte näher oder mit besserem Licht fotografieren.'}; return {ok:true};
  }
  async function aiCheck(blob,item){
    if(!apiBase) return {ok:true,message:'Foto ist brauchbar (lokaler Demo-Modus).'};
    const body=new FormData(); body.append('image',blob,'check.jpg'); body.append('expected',item[1]); body.append('instruction',item[2]); body.append('mode',state.type==='unknown'&&state.photoIndex===0?'identify':'quality');
    const res=await fetch(`${apiBase}/api/photo-check`,{method:'POST',body}); if(!res.ok) throw new Error('quality'); return await res.json();
  }
  async function handlePhoto(selected,item){
    const preview=stage.querySelector('[data-preview]'), quality=stage.querySelector('[data-quality]'); const url=URL.createObjectURL(selected); preview.innerHTML=`<img src="${url}" alt="Vorschau des aufgenommenen Fotos">`; quality.innerHTML='<div class="quality checking">Foto wird kurz geprüft …</div>';
    try{
      const small=await imageForCheck(selected); const local=await localQuality(small); if(!local.ok){quality.innerHTML=`<div class="quality retry">${local.message}</div>`; return;}
      let result={ok:true}; if(isAIType(state.type)) result=await aiCheck(small,item);
      if(!result.ok){quality.innerHTML=`<div class="quality retry">${result.message || 'Bitte noch einmal fotografieren.'}</div>`; return;}
      if(result.detected_type && state.type==='unknown'){
        const mapped={double_bass:'double_bass',bow:'bow',violin:'strings',viola:'strings',cello:'strings',guitar:'guitar',other:'other'}[result.detected_type] || null;
        state.classifiedType=mapped;
      }
      state.photos.push({file:selected,kind:item[0],label:item[1]}); quality.innerHTML=`<div class="quality ok">✓ ${result.message || 'Das Foto ist gut brauchbar.'}</div><div class="photo-actions"><button class="continue-button" data-next>Weiter</button></div>`;
      stage.querySelector('[data-next]').onclick=()=>{ if(state.type==='unknown'&&state.classifiedType && !isAIType(state.classifiedType)){ push('simple'); return; } if(state.type==='unknown'&&state.classifiedType && flow().length>1){ state.photoIndex=1; render(); return;} state.photoIndex++; render(); };
    }catch(e){quality.innerHTML='<div class="quality ok">Foto gespeichert. Die automatische Prüfung ist gerade nicht erreichbar – Sie können trotzdem fortfahren.</div><div class="photo-actions"><button class="continue-button" data-next>Weiter</button></div>';state.photos.push({file:selected,kind:item[0],label:item[1]});stage.querySelector('[data-next]').onclick=()=>{state.photoIndex++;render();};}
  }

  function simpleScreen(){
    setProgress(35); back.hidden=false;
    stage.innerHTML=`<h2 class="wizard-title">Fotos und kurze Angaben</h2><p class="wizard-copy">Für diese Kategorie ist keine automatische Fotoanalyse nötig. Laden Sie einfach ein oder mehrere aussagekräftige Bilder hoch.</p><div class="field"><label>Fotos</label><input type="file" accept="image/*" multiple data-simple-photos></div><div class="field"><label>Hersteller / Marke <span class="optional">optional</span></label><input data-maker></div><div class="field"><label>Was wissen Sie über das Instrument? <span class="optional">optional</span></label><textarea data-story placeholder="Zum Beispiel Alter, Herkunft, Nachlass, Modell oder Zustand."></textarea></div><button class="continue-button" data-next>Weiter</button>`;
    stage.querySelector('[data-next]').onclick=()=>{ const fs=stage.querySelector('[data-simple-photos]').files; state.photos=[...fs].map((file,i)=>({file,kind:`photo_${i+1}`,label:'Foto'})); state.data.maker=stage.querySelector('[data-maker]').value; state.data.story=stage.querySelector('[data-story]').value; push('contact'); };
  }

  function detailsScreen(){
    setProgress(72); back.hidden=false;
    stage.innerHTML=`<h2 class="wizard-title">Was wissen Sie darüber?</h2><p class="wizard-copy">Ein paar Sätze helfen. Wenn Sie nichts wissen, lassen Sie das Feld einfach leer.</p><div class="field"><label>Geschichte / Herkunft <span class="optional">optional</span></label><textarea data-story placeholder="Zum Beispiel: aus dem Nachlass meines Onkels, der Berufsmusiker war …">${state.data.story||''}</textarea></div><div class="field"><label>Hersteller oder Name <span class="optional">optional</span></label><input data-maker value="${state.data.maker||''}" placeholder="Unbekannt ist völlig in Ordnung"></div><button class="continue-button" data-next>Weiter</button>`;
    stage.querySelector('[data-next]').onclick=()=>{state.data.story=stage.querySelector('[data-story]').value;state.data.maker=stage.querySelector('[data-maker]').value;push('contact');};
  }

  function contactScreen(){
    setProgress(88); back.hidden=false;
    stage.innerHTML=`<h2 class="wizard-title">Wie dürfen wir Sie erreichen?</h2><p class="wizard-copy">Ihre Fotos und Angaben werden anschließend persönlich angesehen.</p><div class="field"><label>Name</label><input data-name value="${state.data.name||''}"></div><div class="field"><label>E-Mail</label><input type="email" data-email value="${state.data.email||''}" required></div><div class="field"><label>Telefon <span class="optional">optional</span></label><input type="tel" data-phone value="${state.data.phone||''}"></div><div class="field"><label>Ort / Region <span class="optional">optional</span></label><input data-city value="${state.data.city||''}" placeholder="z. B. Hamburg"></div><label class="mini-note"><input type="checkbox" data-consent> Ich stimme zu, dass meine Angaben und Fotos zur Bearbeitung der Anfrage verarbeitet werden.</label><div class="wizard-summary"><strong>${state.photos.length} Foto(s) ausgewählt</strong><span>${TYPES.find(t=>t[0]===state.type)?.[1] || 'Instrument'}</span></div><button class="submit-button" data-submit>Anfrage senden</button><div data-submit-status></div>`;
    stage.querySelector('[data-submit]').onclick=submit;
  }

  async function submit(){
    const status=stage.querySelector('[data-submit-status]'); const email=stage.querySelector('[data-email]').value.trim(); if(!email || !stage.querySelector('[data-consent]').checked){status.innerHTML='<div class="quality retry">Bitte E-Mail und Zustimmung ergänzen.</div>';return;}
    state.data={...state.data,name:stage.querySelector('[data-name]').value.trim(),email,phone:stage.querySelector('[data-phone]').value.trim(),city:stage.querySelector('[data-city]').value.trim()}; status.innerHTML='<div class="quality checking">Anfrage wird übermittelt …</div>';
    if(!apiBase){ localStorage.setItem(`demo-lead-${Date.now()}`,JSON.stringify({type:state.type,classifiedType:state.classifiedType,data:state.data,photoCount:state.photos.length,createdAt:new Date().toISOString()})); state.step='done';render();return; }
    try{
      const fd=new FormData(); fd.append('meta',JSON.stringify({type:state.type,classifiedType:state.classifiedType,data:state.data,photoMeta:state.photos.map(p=>({kind:p.kind,label:p.label}))}));
      for(let i=0;i<state.photos.length;i++){
        const p=state.photos[i];
        fd.append(`photo_${i}`,p.file,p.file.name);
        if(isAIType(state.classifiedType || state.type)){
          const small=await imageForCheck(p.file,1024);
          if(small) fd.append(`ai_${i}`,small,`ai-${i}.jpg`);
        }
      }
      const res=await fetch(`${apiBase}/api/leads`,{method:'POST',body:fd}); if(!res.ok)throw new Error(); state.step='done';render();
    }catch(e){status.innerHTML='<div class="quality retry">Die Übermittlung hat nicht geklappt. Bitte versuchen Sie es noch einmal.</div>';}
  }
  function doneScreen(){ setProgress(100);back.hidden=true;stage.innerHTML='<p class="eyebrow">Fertig</p><h2 class="wizard-title">Vielen Dank.</h2><p class="wizard-copy">Ihre Anfrage ist angekommen. Die Fotos und Angaben werden persönlich angesehen. Wir melden uns anschließend bei Ihnen.</p><a class="button secondary" href="/">Zur Startseite</a>'; }
  function render(){ back.hidden=state.history.length===0; if(state.step==='type')return typeScreen(); if(state.step==='photos')return photoScreen(); if(state.step==='simple')return simpleScreen(); if(state.step==='details')return detailsScreen(); if(state.step==='contact')return contactScreen(); if(state.step==='done')return doneScreen(); }
  if(state.type && TYPES.some(t=>t[0]===state.type)){ state.step=isAIType(state.type)?'photos':'simple'; state.history=[{step:'type',photoIndex:0}]; }
  render();
})();
