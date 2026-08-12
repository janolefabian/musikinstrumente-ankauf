# PROJECT_HANDOVER.md

# Musikinstrument-Ankauf – Projektübergabe

Stand: 12. August 2026

Dieses Dokument ist die zentrale Übergabe für Coding-Agenten, die `musikinstrument-ankauf.de` weiterentwickeln.

Wichtig: Bestehende Produktentscheidungen nicht eigenmächtig „verbessern“. Besonders bei KI, Nutzerführung, Lead-Klassifizierung und Außendarstellung gibt es bewusste Entscheidungen, die aus dem Geschäftsmodell folgen.

---

# 1. Projektziel

## FAKTEN

`musikinstrument-ankauf.de` ist eine Lead-Generation-Website für den Ankauf von Musikinstrumenten.

Der wirtschaftlich wichtigste Fokus liegt auf:

1. Kontrabässen
2. Kontrabassbögen

Ebenfalls angenommen werden:

- Geigen
- Bratschen
- Celli
- Bögen
- Gitarren
- Nachlässe
- Sammlungen
- sonstige Instrumente

Die Website soll möglichst viele unkomplizierte Anfragen ermöglichen, aber gleichzeitig dafür sorgen, dass besonders interessante Fälle nicht zwischen gewöhnlichen Anfragen untergehen.

Das System besteht nicht nur aus einer Marketing-Website, sondern aus:

- öffentlicher Website
- geführtem Foto-Upload
- Foto-Qualitätskontrolle
- KI-Vorsortierung
- Cloud-Datenbank
- Bildspeicher
- internem Review-Dashboard
- optionaler Automatisierung über Make

---

## GETROFFENE ENTSCHEIDUNG

Das eigentliche Geschäftsinteresse liegt nicht darin, kostenlose Bewertungen zu erstellen.

Das Ziel ist:

> interessante Instrumente finden und ankaufen.

Die Technik muss diesem Ziel dienen.

---

# 2. Geschäftsmodell

## FAKTEN

Besucher bieten Instrumente zum Verkauf an.

Der Betreiber prüft die Anfrage und entscheidet anschließend persönlich, ob weiterer Kontakt, Besichtigung oder Ankauf interessant ist.

Insbesondere bei hochwertigen Kontrabässen und Bögen besteht Bereitschaft, für eine persönliche Besichtigung auch zu reisen.

---

## GETROFFENE ENTSCHEIDUNG

Dem Besucher darf nicht erklärt werden, dass nur für intern als besonders interessant eingestufte Instrumente größere Anstrengungen wie eine Reise unternommen werden.

Die Website soll grundsätzlich den Eindruck vermitteln:

- seriöser Ankauf
- persönliche Prüfung
- unkomplizierter Kontakt
- fachliche Kompetenz
- regional erreichbar

Die interne Priorisierung bleibt intern.

---

# 3. Zielgruppen

## FAKTEN

Primäre Zielgruppe:

- Menschen, die einen Kontrabass verkaufen möchten
- Menschen, die einen Kontrabassbogen verkaufen möchten

Wichtige sekundäre Gruppen:

- Erben
- Angehörige verstorbener Musiker
- Menschen ohne Instrumentenkenntnisse
- Besitzer mehrerer Instrumente
- Nachlässe und Sammlungen
- Menschen, die nicht einmal genau wissen, welches Instrument sie besitzen

Eine Person muss keinerlei Fachwissen besitzen, um eine gute Anfrage stellen zu können.

---

## GETROFFENE ENTSCHEIDUNG

Unwissen darf niemals als negatives Signal gewertet werden.

Beispiele:

- „Ich weiß nicht, was das ist.“
- „Hersteller unbekannt.“
- „Aus dem Nachlass meines Großvaters.“
- „Ich kenne den Wert nicht.“

können sogar interessante Leads sein.

---

# 4. Positionierung

## GETROFFENE ENTSCHEIDUNG

Die Website soll nicht wie ein typischer Antiquitätenankäufer wirken.

Insbesondere vermeiden:

- aggressives Verkaufsmarketing
- „Sofort Bargeld“
- künstliche Dringlichkeit
- übertriebene Versprechen
- kostenlose Wertgutachten als Lockmittel
- Aussagen, die Misstrauen erzeugen könnten

Die Formulierung

> „Machen Sie sich keine Gedanken darüber, was Ihr Instrument wert ist. Zeigen Sie es uns einfach.“

wurde ausdrücklich verworfen, weil sie den Eindruck erwecken kann, der Verkäufer solle sich nicht mit dem Wert beschäftigen.

---

# 5. Betreiber / persönliche Außendarstellung

## FAKTEN

Der Betreiber möchte auf der normalen Website möglichst nicht persönlich in Erscheinung treten.

Insbesondere sollen weder der persönliche Name noch `Tempera Strings` als Marke prominent auf der Website erscheinen.

---

## GETROFFENE ENTSCHEIDUNG

Öffentliche Marke:

> Musikinstrument Ankauf

Kein Tempera-Branding im normalen Marketing.

Keine persönliche Selbstdarstellung, sofern nicht später ausdrücklich anders entschieden.

Person/Firma nur dort nennen, wo dies rechtlich erforderlich ist.

---

## OFFENE FRAGE

Die endgültige rechtliche Betreiberstruktur ist noch nicht abschließend entschieden.

Diskutiert wurden:

- Tempera Strings GmbH
- bestehendes Einzelunternehmen des Betreibers
- später eventuell eigenes Gewerbe / eigene Gesellschaft

Vor Live-Nutzung der finalen Rechtstexte muss geklärt werden, welche natürliche oder juristische Person tatsächlich Betreiber und Ankäufer ist.

Rechtstexte niemals eigenmächtig auf Tempera Strings GmbH festschreiben, solange diese Frage offen ist.

---

# 6. Tonalität

## GETROFFENE ENTSCHEIDUNG

Ton:

- ruhig
- sachlich
- freundlich
- kompetent
- verständlich
- vertrauenswürdig

Keine Fachsprache, wenn sie für Laien nicht erforderlich ist.

Keine Startup-Sprache.

Keine KI-Sprache im normalen User Interface.

---

## WICHTIGE FORMULIERUNGEN

Erfolgsseite aktuell sinngemäß:

> „Ihre Anfrage ist angekommen. Die Fotos und Angaben werden persönlich angesehen. Wir melden uns anschließend bei Ihnen.“

Diese Richtung ist ausdrücklich gewünscht.

Für „Ich weiß es nicht“:

> „Kein Problem – wir helfen bei der Einordnung.“

---

## NICHT VERWENDEN

Begriffe wie:

- „KI-Analyse“
- „AI powered“
- „KI-Führung“
- „kein KI-Upload“
- „automatische Bewertung“
- „KI-Wertschätzung“

dürfen nicht unnötig im sichtbaren Nutzerinterface auftauchen.

Die Technik ist Mittel zum Zweck und kein Verkaufsargument.

---

# 7. Nutzerführung

## GRUNDPRINZIP

Der Funnel muss so einfach sein, dass auch ein älterer, technisch unerfahrener Verkäufer ihn problemlos benutzen kann.

Priorität:

> Anfrage erhalten > perfekte Datenerfassung.

Ein wertvoller Lead darf nicht verloren gehen, weil ein Nutzer nicht perfekte Fotos liefert.

---

# 8. Instrumentenauswahl

## AKTUELLE KATEGORIEN

Im Wizard existieren ungefähr folgende Typen:

- `double_bass`
- `bow`
- `strings`
- `guitar`
- `estate`
- `unknown`
- `other`

Aktuelle nutzerfreundliche Bezeichnungen:

### Kontrabass

> Einzelinstrumente, Sammlungen und Instrumente aus Nachlässen

### Bogen

> Für Geige, Bratsche, Cello oder Kontrabass

### Geige / Bratsche / Cello

> Einzelinstrumente jeder Herkunft und Bauart

### Gitarre

> Akustische Gitarren, E-Gitarren und Zubehör

### Mehrere Instrumente / Nachlass

> Wenn Sie mehrere Instrumente oder einen gesamten Nachlass anbieten möchten

### Ich weiß es nicht

> Kein Problem – wir helfen bei der Einordnung

### Anderes Instrument oder Zubehör

> Weitere Instrumente oder musikalisches Zubehör

---

## GETROFFENE ENTSCHEIDUNG

Unter den Kategorien dürfen keine internen technischen Informationen stehen.

Ausdrücklich unerwünscht waren Texte wie:

> „Einfacher Upload ohne KI-Führung“

oder

> „Geführte Fotos mit Qualitätscheck“

Der Nutzer interessiert sich dafür nicht.

---

# 9. KI-Einsatz nach Kategorie

## GETROFFENE ENTSCHEIDUNG

KI soll bewusst nicht für jede Anfrage verwendet werden.

Primär KI-relevant:

- Kontrabass
- Bogen
- Geige / Bratsche / Cello
- Nachlass
- „Ich weiß es nicht“

Nicht notwendig:

- normale Gitarrenanfragen
- klar uninteressante sonstige Kategorien

Grund:

- KI-Kosten gering halten
- unnötige Bildanalyse vermeiden
- KI nur dort einsetzen, wo sie geschäftlich einen Nutzen hat

Volumenannahme aus der Planung:

- ca. 2–3 Anfragen pro Tag
- etwa 10 % Kontrabass / relevanter Bogen
- etwa 10 % „Ich weiß es nicht“

---

# 10. Foto-Wizard

## FAKTEN

Wichtige Datei:

`public/js/lead-wizard.js`

Astro-Wrapper:

`LeadWizard.astro` bzw. entsprechende Component-Datei.

Der Wizard führt relevante Instrumente schrittweise durch Fotoaufgaben.

Kontrabass-Flow umfasst derzeit u. a.:

- Vorderseite
- Rückseite
- Schnecke / Wirbelkasten
- Zettel / Beschriftung
- Bögen / Zubehör

Bogen-Flow umfasst:

- ganzer Bogen
- Frosch
- Kopf / Spitze
- Stempel

Strings-Flow:

- Vorderseite
- Rückseite
- Schnecke
- Zettel
- Bogen / Koffer

Nachlass:

- Übersicht
- Bögen
- Unterlagen

---

# 11. Beispielbilder

## GETROFFENE ENTSCHEIDUNG

Bei unklaren Begriffen wie „Schnecke“, „Frosch“ oder „Kopf“ muss der Nutzer Hilfe bekommen.

Bestehender Mechanismus:

> „Beispiel ansehen“

Das Beispielbild wird erst nach dem Klick eingeblendet.

Dieser Mechanismus soll bleiben.

Keine dauerhafte Galerie im Wizard.

---

## BEREITS VORHANDENE BEISPIELFOTOS

Der Betreiber hat echte professionelle Fotos geliefert für:

- Kontrabass Vorderseite
- Kontrabass Rückseite
- Schnecke
- F-Loch
- Zettel
- weitere Gesamtansicht

Diese sollen als echte Beispielbilder verwendet werden.

Keine Stockfotos.

Keine künstlichen Illustrationen.

Keine roten Kreise oder unnötigen Pfeile, solange das Foto selbst verständlich ist.

---

## OFFENE AUFGABE

Im aktuellen Wizard existieren noch Platzhalter:

> „Beispielbild“

Diese müssen durch die gelieferten echten Fotos ersetzt werden.

Vorgeschlagener Pfad:

`public/images/upload-guide/`

z. B.:

- `bass-front.jpg`
- `bass-back.jpg`
- `bass-scroll.jpg`
- `bass-label.jpg`

Der bestehende `helpMarkup()`-Mechanismus soll erweitertert werden, nicht durch ein neues UI ersetzt werden.

---

# 12. Verhalten bei Fotoqualität

## SEHR WICHTIGE ENTSCHEIDUNG

Die Foto-KI darf NICHT streng sein.

Das wurde anhand eines realen Beispiels festgestellt:

Ein professionelles Rückseitenfoto eines Kontrabasses wurde abgelehnt, weil ein kleiner Teil von Hals/Wirbelkasten angeschnitten war.

Das ist unerwünscht.

---

## GRUNDREGEL

> Im Zweifel akzeptieren.

Die KI ist kein Fotografie-Prüfer.

Sie soll ausschließlich offensichtlich unbrauchbare Bilder herausfiltern.

---

## AKZEPTIEREN

Auch akzeptabel:

- leichte Schräglage
- kleiner Beschnitt
- Schnecke teilweise abgeschnitten
- normale Smartphone-Qualität
- leichter Lichtmangel
- leichter unscharfer Bereich
- unruhiger Hintergrund

---

## ABLEHNEN NUR BEI

- falschem Gegenstand
- relevantem Motiv praktisch nicht sichtbar
- extremer Unschärfe
- extrem dunklem oder überbelichtetem Bild
- so starkem Beschnitt, dass die gewünschte Ansicht unbrauchbar ist

---

## FOTO-PROMPT

Datei:

`worker/src/prompt.js`

Der PHOTO_PROMPT wurde bewusst in Richtung einer großzügigen Prüfung geändert.

Zentrale Regel:

> Im Zweifel akzeptieren.

Bei Änderungen niemals wieder in Richtung „perfekte Dokumentationsfotos“ optimieren.

---

# 13. Weiter mit bisherigen Fotos

## GETROFFENE ENTSCHEIDUNG

Die Möglichkeit, mit den bereits vorhandenen Fotos fortzufahren, soll erst erscheinen, nachdem mindestens zwei Bilder erfolgreich hinzugefügt wurden.

Nicht vor dem ersten Foto.

Aktuelle Implementation prüft:

`state.photos.length >= 2`

---

## BEKANNTER UX-PUNKT

In einer aktuellen Codeversion stand der Button auf Englisch:

> `Continue with the current photos`

Das muss deutsch sein.

Gewünschte Richtung:

> „Mit den bisherigen Fotos weitermachen“

---

# 14. Bildgrößen

## GETROFFENE ENTSCHEIDUNG

Es sollen drei Qualitätsstufen unterschieden werden.

### Archiv / R2

Ziel:

- max. lange Kante ca. 3000 px
- JPEG
- Qualität ca. 0.88

Originale iPhone-Dateien müssen nicht dauerhaft unverändert gespeichert werden.

### unmittelbarer KI-Foto-Check

- max. 768 px
- JPEG etwa 0.72
- `detail: low`

### KI-Gesamtanalyse

- ca. 1024 px
- ebenfalls verkleinerte Kopie

---

## MINDESTGRÖSSE

Unter ca. 800 px lange Kante:

nur Warnung.

Keine harte Blockade.

---

## SEHR GROSSE DATEIEN

Als Schutz wurde ca. 20 MB pro Eingangsfoto diskutiert.

---

## IMPLEMENTATIONSSTATUS

Diese Regeln wurden beschlossen und ein Patch dafür erstellt.

Der Coding-Agent soll im aktuellen `public/js/lead-wizard.js` prüfen, ob der Patch tatsächlich vollständig übernommen wurde.

Eine zuvor gepostete Version schickte noch `p.file` als Original an R2.

Nicht anhand dieses Dokuments annehmen, dass die 3000-px-Archivierung bereits aktiv ist: CODE PRÜFEN.

---

# 15. KI-Lead-Triage

## FAKTEN

Datei:

`worker/src/prompt.js`

Internes Ergebnis enthält ungefähr:

- `lead_class`
- `interest_score`
- `confidence`
- `notable`
- `title`
- `summary`
- `signals`

Lead-Klassen:

- A
- B
- C

---

## BEDEUTUNG

A:

sofort bzw. höchste Aufmerksamkeit

B:

normal / zeitnah prüfen

C:

gewöhnliche Anfrage / gesammelt prüfen

`notable=true`:

auffällig oder unsicher und deshalb besondere Aufmerksamkeit wert

---

## GETROFFENE ENTSCHEIDUNG

C-Leads werden niemals gelöscht oder komplett ignoriert.

Der Betreiber möchte C regelmäßig durchsehen, weil die KI ein interessantes Objekt falsch einordnen könnte.

---

# 16. Aktueller LEAD_PROMPT – Grundprinzipien

Der Prompt soll insbesondere berücksichtigen:

- Kontrabässe und Kontrabassbögen primär relevant
- Streichinstrumente sekundär relevant
- Nachlässe und Sammlungen relevant
- mehrere Instrumente können Aufmerksamkeit verdienen
- unbekannter Hersteller ist NICHT negativ
- geerbtes Instrument ist NICHT negativ
- sichtbare Stempel und Etiketten können relevant sein
- Unsicherheit bei Bögen kann notable sein
- keine Marktwertbestimmung
- keine definitive Zuschreibung

---

# 17. Was die KI NICHT tun darf

## NICHT VERÄNDERN

Keine automatische Wertangabe an den Nutzer.

Keine Aussagen wie:

> „Ihr Bass ist 8.500 € wert.“

Keine definitive Authentifizierung.

Keine definitive Herstellerzuschreibung.

Keine automatische Ablehnung eines Verkäufers aufgrund eines KI-Scores.

---

# 18. Website ist KEIN KI-Bewertungsportal

## VERWORFENER ANSATZ

Eine Landingpage bzw. Funktion:

> „Was ist mein Kontrabass wert? – KI-Wertschätzung“

wurde ausdrücklich abgelehnt.

Gründe:

1. KI kann falsch liegen.
2. Fachliche Bewertung anhand von Bildern ist begrenzt.
3. Geschäftsinteresse ist der Ankauf interessanter Instrumente.
4. Eine automatische Wertangabe kann den Ankauf sogar erschweren.

---

# 19. Fachlicher SEO-Content

## GETROFFENE ENTSCHEIDUNG

Fachwissen darf und soll grundsätzlich veröffentlicht werden.

Sehr geeignete Themen:

- originaler Lack
- Deckenrisse
- Bassbalken
- Wurmschäden
- Herkunft
- Reparaturen
- Provenienz
- Bauweisen

Das schafft echten, nicht generischen Content.

---

## AKTUELLE PRIORITÄT

Niedrig.

Der Betreiber möchte aktuell nicht viel weitere Zeit in Content investieren.

Keine große Wissensbibliothek bauen, bevor dies später ausdrücklich gewünscht wird.

---

# 20. Landingpages

## BEREITS VORHANDENE / RELEVANTE ROUTES

Unter anderem:

- `/`
- `/instrument-verkaufen/`
- `/kontrabass-verkaufen/`
- `/kontrabassbogen-verkaufen/`
- `/instrument-geerbt/`

Dazu dynamisch erzeugte Stadtseiten.

Aktuell gebaute Städte umfassen u. a.:

- Berlin
- Bremen
- Dortmund
- Dresden
- Düsseldorf
- Duisburg
- Essen
- Frankfurt
- Hamburg
- Hannover
- Köln
- Leipzig
- München
- Nürnberg
- Stuttgart

Quelle der Stadtseiten ist `src/pages/[city].astro` bzw. dazugehörige Daten.

---

## GETROFFENE ENTSCHEIDUNG

Keine große Zahl dünner SEO-Seiten produzieren.

Bestehende Kernseiten lieber gut halten.

Kurzfristig keine große Content-Offensive.

---

# 21. Bedeutung der Stadtseiten

## GETROFFENE ENTSCHEIDUNG

Die Stadt dient nicht nur als Suchkeyword.

Sie erzeugt beim Nutzer das Gefühl:

> „Hier gibt es einen Ansprechpartner, der mein Instrument auch vor Ort ansehen kann.“

Das ist psychologisch wichtig.

---

## NICHT KOMMUNIZIEREN

Nicht schreiben:

> „Nur bei außergewöhnlich interessanten Instrumenten fahren wir zu Ihnen.“

Die interne Reise-/Besichtigungsentscheidung bleibt intern.

---

# 22. Technische Architektur

## FRONTEND

Astro.

Bekannte Version während Entwicklung:

`Astro 7.2.0`

Ausgabe:

`static`

`astro.config.mjs` enthält:

- `site: 'https://musikinstrument-ankauf.de'`
- `output: 'static'`
- `@astrojs/sitemap`

---

## HOSTING

GitHub Pages.

Repository:

`janolefabian/musikinstrumente-ankauf`

Repository ist öffentlich, damit GitHub Pages genutzt werden kann.

---

## DEPLOYMENT

GitHub Actions.

Workflow ungefähr:

`.github/workflows/deploy-pages.yml`

Build:

- Node 22
- `npm ci`
- `npm run build`
- `PUBLIC_API_BASE` aus GitHub Repository Variables
- `dist` als Pages Artifact
- `actions/deploy-pages`

---

# 23. Domain

Produktionsdomain:

`https://musikinstrument-ankauf.de`

Registrar:

do.de / Domain-Offensive.

Historisch wurden ALL-INKL/kasserver Nameserver verwendet.

Beim Umzug gab es inkonsistente Nameserver-Sets.

Da die Website später bereits über die Produktionsdomain inklusive Sitemap erreichbar war, funktioniert die Domain inzwischen grundsätzlich.

DNS niemals blind ändern.

Vor DNS-Änderungen aktuellen Zustand prüfen.

---

# 24. Backend

Cloudflare Worker.

Worker-Name:

`musikinstrument-ankauf-api`

Öffentliche Worker-URL:

`https://musikinstrument-ankauf-api.janolefabian.workers.dev`

Wichtige Datei:

`worker/src/index.js`

---

# 25. API-Endpunkte

Bereits implementiert:

### Health

`GET /api/health`

### Foto-Check

`POST /api/photo-check`

### Lead erstellen

`POST /api/leads`

### Review-Liste

`GET /api/review`

### Review-Detail

`GET /api/review/:id`

### Status ändern

`PATCH /api/review/:id`

### Foto ausliefern

`GET /api/photo/:id`

Diese Struktur nicht ohne Grund verändern.

---

# 26. Cloudflare D1

Datenbank:

`musikinstrument-ankauf-leads`

Bekannte Datenbank-ID:

`36171733-d97d-466c-aab2-60b2788b09bc`

Region bei Erstellung:

EEUR

Schema liegt unter:

`worker/schema/`

---

## LEADS

Felder umfassen u. a.:

- id
- created_at
- type
- classified_type
- name
- email
- phone
- city
- story
- maker
- lead_class
- interest_score
- confidence
- notable
- summary
- ai_json
- photo_count
- status
- make_status
- make_error

---

## STATUSWERTE

Aktuell unterstützt:

- `new`
- `contacted`
- `interesting`
- `purchased`
- `declined`
- `archived`

---

# 27. Cloudflare R2

Bucket:

`musikinstrument-ankauf-photos`

Original-/Archivbilder werden dort gespeichert.

Struktur ungefähr:

`<LEAD-ID>/<PHOTO-ID>-<filename>`

Beispiel:

`ANK-.../P-...-DSC_6398.jpg`

Fotos sollen nicht in Ninox gespeichert werden.

---

# 28. Datenhaltung – Source of Truth

## GETROFFENE ENTSCHEIDUNG

Cloudflare ist die technische Hauptdatenhaltung.

D1:

Lead-Metadaten

R2:

Fotos

Die Daten sollen nicht gelöscht werden, nur weil sie eventuell in ein anderes System übertragen wurden.

---

# 29. Ninox

## HISTORIE

Ursprünglich war geplant:

Website → Make → Ninox

Ninox sollte CRM/Dashboard sein.

---

## GETROFFENE ENTSCHEIDUNG

Für dieses Projekt wurde anschließend ein eigenes Dashboard gebaut.

Ninox ist aktuell NICHT als primäres System vorgesehen.

Gründe:

- Bilder sollen nicht in Ninox liegen
- Tempera verbraucht bereits einen großen Teil der Ninox-Kapazität
- Synchronisation D1 ↔ Ninox würde zusätzliche Komplexität erzeugen
- eigenes Dashboard kann direkt auf D1/R2 zugreifen

---

## WENN NINOX SPÄTER VERWENDET WIRD

Nur Metadaten / CRM-Informationen.

Keine Bilddateien.

D1/R2 bleiben Source of Truth.

---

# 30. Make

Make ist vorhanden und kann für Automatisierungen genutzt werden.

Worker enthält bereits Make-Webhook-Logik.

Geplanter Nutzen:

- E-Mail-Benachrichtigungen
- A-Lead sofort
- ggf. B normal
- C gesammelt / keine Sofortbenachrichtigung
- spätere Integrationen

Make darf nicht Voraussetzung dafür sein, dass eine Nutzeranfrage erfolgreich gespeichert wird.

---

## GETROFFENE ARCHITEKTURENTSCHEIDUNG

Reihenfolge:

User → Worker → D1/R2 → danach Make

Wenn Make ausfällt, darf kein Lead verloren gehen.

---

# 31. OpenAI

KI-Anfragen erfolgen aus dem Worker.

API:

OpenAI Responses API.

Fotos werden als verkleinerte Data-URLs übermittelt.

Structured JSON Schema wird für Antworten verwendet.

---

## SECRETS

Secrets niemals in Git committen.

Relevante Variablen können umfassen:

- `OPENAI_API_KEY`
- `MAKE_WEBHOOK_URL`
- `MAKE_WEBHOOK_SECRET`
- `REVIEW_TOKEN`

Lokale Worker-Secrets:

`worker/.dev.vars`

Diese Datei ist gitignored.

---

# 32. CORS

## HISTORIE

Ursprünglich erlaubte der Worker genau eine Origin, z. B.:

`http://localhost:4321`

Das verursachte wiederholt Probleme bei:

- Port 4322
- GitHub Pages
- Produktionsdomain

---

## GETROFFENE LÖSUNG

CORS wurde auf eine echte Allowlist umgebaut.

Erlaubte Origins sollen mindestens umfassen:

- `http://localhost:4321`
- `http://localhost:4322`
- `https://janolefabian.github.io`
- `https://musikinstrument-ankauf.de`
- `https://www.musikinstrument-ankauf.de`

Zusätzlich optional:

`ALLOWED_ORIGINS`

als CSV-Environment-Variable.

---

## SICHERHEITSREGEL

Nicht:

`Access-Control-Allow-Origin: *`

und keine beliebige Origin spiegeln.

Nur explizit erlaubte Origins zurückgeben.

`Vary: Origin` setzen.

---

# 33. Review-Dashboard

Dateien u. a.:

- `src/pages/review.astro`
- `public/js/review.js`
- CSS in globalen Styles

Bereits vorhanden:

- Lead-Liste
- A/B/C-Filter
- notable
- KI-unsicher
- Suche
- Split-View
- Detailansicht
- Fotos
- Statusänderungen
- Galerie
- Kontaktinformationen
- Tastaturfunktionen

Dashboard ist für interne Nutzung.

Das Design ist derzeit ausreichend.

Nicht weiter kosmetisch optimieren, bis echte Daten zeigen, was tatsächlich benötigt wird.

---

# 34. SEHR WICHTIG: Dashboard-Sicherheit

## AKTUELLER STAND

Aktuelle Authentifizierung basiert auf `REVIEW_TOKEN`.

`review.js` fragt den Token ab und speichert ihn im Browser `localStorage`.

Der Worker prüft Bearer-Token.

Der Worker arbeitet seit der Dashboard-Performance-Überarbeitung fail-closed.
Wenn `REVIEW_TOKEN` fehlt, antworten Review- und Foto-Endpunkte mit
`review_not_configured` und HTTP 503. Ein fehlendes Secret öffnet die Daten
nicht mehr versehentlich.

---

## HOHE PRIORITÄT

Unbedingt prüfen, ob `REVIEW_TOKEN` im produktiven Worker gesetzt ist.

Falls nicht:

sofort setzen.

Langfristig ist Cloudflare Access als echtes Login interessant.

---

# 35. Dashboard-Performance

## UMGESETZT AM 12. AUGUST 2026

- Eine D1-Abfrage liefert Leads, Vorschaureferenz, Zähler und Cursor statt N+1.
- Die API lädt höchstens 30 Leads pro Seite und filtert/sucht serverseitig.
- Zeilen und Text erscheinen sofort mit Platzhaltern.
- Sichtbare Vorschaubilder laden lazy mit maximal vier parallelen Abrufen.
- Neue Uploads speichern zusätzlich 480-Pixel-Thumbnails in R2.
- Die Detailansicht lädt ebenfalls nur Thumbnails; Originale erst im Lightbox-Klick.
- Prioritäts- und Bearbeitungsansichten sind getrennt; archivierte Leads liegen
  in einer eigenen Ansicht und erscheinen nicht mehr unter „Alle“.
- Mehrfachauswahl unterstützt gemeinsames Archivieren und Löschen (maximal 100
  IDs je Anfrage).
- Der Zugangsschlüssel wird über eine Dashboard-interne Anmeldemaske statt über
  ein natives Browser-Popup eingegeben.
- Bestehende Fotos können mit `worker/scripts/backfill-thumbnails.mjs`
  einmalig nachgerüstet werden.

Vor dem produktiven Worker-Deploy muss
`worker/schema/migrations/0002_photo_thumbnails_and_review_indexes.sql` auf
die Remote-D1-Datenbank angewendet werden. Danach den Backfill ausführen.

---

# 36. Review-Fotozugriff

Fotos werden über den Worker ausgeliefert:

`/api/photo/:id`

Nicht einfach öffentliche R2-URLs verwenden, solange die Bilder personenbezogene bzw. private Nutzeruploads sind.

---

# 37. Datenschutz

## FAKTEN

Verarbeitet werden u. a.:

- Name
- E-Mail
- Telefon
- Ort
- Beschreibung
- Herstellerangaben
- Herkunft / Geschichte
- Fotos

Daten gehen technisch an:

- Cloudflare
- OpenAI
- Make
- E-Mail-System über Make

---

## GETROFFENE ENTSCHEIDUNG

OpenAI analysiert nicht nur Bilder, sondern auch Textinformationen wie:

- Beschreibung
- Hersteller
- Geschichte / Herkunft

Dies muss in der Datenschutzerklärung transparent beschrieben werden.

---

## KI-DATENSCHUTZFORMULIERUNG

Wichtig:

Keine ausschließlich automatisierte Ankaufentscheidung.

KI dient nur:

- Priorisierung
- Bilderprüfung
- interner Unterstützung

Persönliche Prüfung bleibt bestehen.

---

# 38. Consent

Aktueller Wizard enthält eine Zustimmung zur Verarbeitung von Angaben und Fotos.

Gewünschte Richtung:

Datenschutzerklärung verlinken.

Zusätzlich sinnvoll / bereits diskutiert:

Hinweis, dass der Nutzer zur Übermittlung der hochgeladenen Bilder berechtigt sein soll.

Rechtliche Ausgestaltung prüfen.

---

# 39. Cookie-Banner

## ANNAHME / AKTUELLER STAND

Es sind derzeit keine Marketing- oder Tracking-Cookies bekannt.

Daher soll nicht unnötig ein Cookie-Banner eingebaut werden.

Sobald Analytics/Marketing-Tracking ergänzt wird, muss diese Entscheidung neu geprüft werden.

---

# 40. Impressum / Datenschutz in Suchmaschinen

## GETROFFENE ENTSCHEIDUNG

Legal Pages sollen:

`noindex,follow`

erhalten.

Sie müssen trotzdem:

- öffentlich erreichbar
- klar im Footer verlinkt
- für Nutzer unmittelbar zugänglich

bleiben.

Nicht per robots.txt blockieren oder verstecken.

---

# 41. Rechtstexte

Dateien:

- `src/pages/datenschutz.astro`
- `src/pages/impressum.astro`

Die Seiten werden direkt in Astro geschrieben, nicht über Markdown/Content Collections.

Grund:

einfacher und ausreichend.

---

## WICHTIG

Die vorhandenen Rechtstexte sind Entwürfe und müssen an den tatsächlich verantwortlichen Betreiber angepasst werden.

Keine rechtlichen Angaben erfinden.

Insbesondere:

- Betreiber
- Anschrift
- Register
- USt-ID
- Verantwortlicher

vor Live-Nutzung prüfen.

---

# 42. SEO

## BEREITS IMPLEMENTIERT

`@astrojs/sitemap`

Build erzeugt:

- `/sitemap-index.xml`
- `/sitemap-0.xml`

Neue statische Seiten werden bei jedem Build automatisch aufgenommen.

---

## ROBOTS

`public/robots.txt` soll auf den Sitemap-Index verweisen:

`https://musikinstrument-ankauf.de/sitemap-index.xml`

Implementation im Repo prüfen.

---

# 43. Google Search Console

Search Console wurde begonnen / eingerichtet.

`sitemap-index.xml` wurde eingereicht.

Beim ersten Versuch konnte Google `sitemap-0.xml` zeitweise nicht abrufen.

Die Datei war kurz danach öffentlich erreichbar.

Status in Search Console erneut prüfen.

---

# 44. Wichtigste SEO-Seiten

Priorität:

1. `/kontrabass-verkaufen/`
2. `/kontrabassbogen-verkaufen/`
3. `/instrument-geerbt/`
4. `/instrument-verkaufen/`
5. relevante Stadtseiten

---

# 45. SEO-Strategie

## GETROFFENE ENTSCHEIDUNG

Kein massenhaft generierter SEO-Text.

Stattdessen langfristig echter Expertencontent.

Beispiele:

- Warum beeinflusst Originallack den Markt?
- Welche Deckenrisse sind relevant?
- Was bedeutet ein neuer Bassbalken?
- Wurmschäden
- Herkunft
- Reparaturqualität

Aktuell aber keine Priorität.

---

# 46. Testimonials

Testimonials waren in einer früheren Version vorhanden und wurden entfernt.

Es gab Diskussion darüber, sie eventuell wieder zu verwenden, weil Vertrauen wichtig ist.

Keine endgültige Verpflichtung, Testimonials wieder einzubauen.

Wenn:

nur echte Testimonials.

Keine erfundenen Bewertungen.

---

# 47. Vertrauensstrategie

Die Website soll Vertrauen hauptsächlich erzeugen durch:

- professionellen Auftritt
- gute Google-Sichtbarkeit
- unkomplizierten Ablauf
- seriöse Sprache
- gute Fotos
- schnelle Kontaktaufnahme
- telefonischen persönlichen Kontakt

Nicht durch starke Marketingclaims.

---

# 48. Git / Repository

Repo:

`janolefabian/musikinstrumente-ankauf`

Branch:

`main`

GitHub Pages deployt bei Push auf `main`.

---

## GITIGNORE

Sensible Dateien sind ausgeschlossen.

Bekannte erlaubte Beispiel-Dateien:

- `.env.example`
- `worker/.dev.vars.example`

Nicht committen:

- `.env.local`
- `.env.*`
- `.dev.vars`
- `worker/.dev.vars`
- `.wrangler`
- `worker/.wrangler`

---

# 49. Lokale Entwicklung

Frontend:

```bash
npm run dev
```

typisch:

`http://localhost:4321`

Wenn Port belegt:

4322 etc.

Worker:

```bash
cd worker
npx wrangler dev
```

typisch:

`http://localhost:8787`

Produktiven Worker deployen:

```bash
cd worker
npx wrangler deploy
```

Produktionslogs:

```bash
cd worker
npx wrangler tail
```

---

# 50. Lokales Frontend → Worker

Root `.env.local`:

```env
PUBLIC_API_BASE=http://localhost:8787
```

Produktions-Build nutzt GitHub Repository Variable:

`PUBLIC_API_BASE`

mit Worker-URL.

---

# 51. D1 – lokal vs. remote

Lokal:

```bash
npx wrangler d1 execute musikinstrument-ankauf-leads --local ...
```

Remote:

```bash
npx wrangler d1 execute musikinstrument-ankauf-leads --remote ...
```

Das Schema wurde sowohl lokal als auch remote angelegt.

---

# 52. Bereits erfolgreich getestet

End-to-End wurde erfolgreich getestet:

Frontend  
→ Worker  
→ D1  
→ R2  
→ Erfolgsseite.

Remote-Test über Cloudflare wurde ebenfalls erfolgreich durchgeführt.

Fotos und Leads waren anschließend in den Cloudflare-Ressourcen sichtbar.

---

# 53. Bekannter user-facing Fehler

In einer aktuellen `simpleScreen()`-Version steht sinngemäß:

> „Für diese Kategorie ist keine automatische Fotoanalyse nötig.“

Das widerspricht einer klaren Produktentscheidung.

Diesen Satz entfernen.

Besser:

> „Laden Sie einfach ein oder mehrere aussagekräftige Bilder hoch.“

Der Nutzer muss nicht wissen, welche Kategorien KI verwenden.

---

# 54. Dinge, die NICHT verändert werden dürfen

## MUST NOT

1. Keine KI-Wertschätzung für Nutzer einbauen.

2. Keine automatische Marktwertausgabe.

3. Keine definitive Hersteller- oder Echtheitsbestimmung durch KI kommunizieren.

4. Keine unnötige KI-Sprache im öffentlichen Interface.

5. Nutzer nicht wegen kleiner Fotofehler blockieren.

6. C-Leads niemals automatisch löschen.

7. Interessante Leads niemals ausschließlich aufgrund von KI ablehnen.

8. Bilder nicht unnötig in Ninox kopieren.

9. Make nicht zum Single Point of Failure machen.

10. Tempera Strings oder den persönlichen Namen nicht prominent ins Marketing integrieren.

11. Keine große Design-Neugestaltung ohne ausdrückliche Anforderung.

12. Keine umfangreiche Content-/Blog-Architektur bauen, solange dies nicht erneut priorisiert wird.

13. Keine öffentliche R2-Galerie mit Nutzerfotos erzeugen.

14. Legal Pages nicht unzugänglich machen.

15. Keine Secrets oder Tokens in Git committen.

---

# 55. Derzeitige Prioritäten

## PRIORITÄT 1 – Sicherheit

Sicherstellen, dass produktiv ein starkes `REVIEW_TOKEN` gesetzt bleibt.

Danach langfristige Auth-Lösung bewerten.

---

## PRIORITÄT 2 – Dashboard im Betrieb beobachten

Die strukturellen Performance-Probleme sind behoben. Nach dem produktiven
Thumbnail-Backfill reale Ladezeiten und den Umgang mit 50+ Leads beobachten.

---

## PRIORITÄT 3 – Beispielbilder

Gelieferte Bass-Beispielbilder in bestehende „Beispiel ansehen“-Overlays integrieren.

Keine neue Galerie bauen.

---

## PRIORITÄT 4 – Foto-KI überprüfen

Mit den echten Beispielbildern testen.

Alle guten Beispielbilder müssen akzeptiert werden.

Prompt ggf. weiter großzügig kalibrieren.

---

## PRIORITÄT 5 – Bildgrößen-Patch verifizieren

Prüfen, ob:

- R2 3000 px / JPEG 88 %
- AI check 768 px
- AI lead analysis 1024 px
- <800 px nur Warnung

tatsächlich im aktuellen Code aktiv sind.

---

## PRIORITÄT 6 – sichtbare KI-Sprache entfernen

Insbesondere `simpleScreen()` und ähnliche Stellen überprüfen.

---

## PRIORITÄT 7 – SEO / Search Console

Search Console Sitemap-Status prüfen.

Kernseiten ggf. manuell zur Indexierung anmelden.

Keine große SEO-Offensive.

---

# 56. Niedrigere Prioritäten

- Bing Webmaster Tools
- strukturierte Daten
- OpenGraph-Optimierung
- Favicon / Apple Touch Icon
- echte Testimonials
- zusätzliche Landingpages
- Wissensbibliothek
- Analytics
- White-Label-Version

---

# 57. White-Label / Weiterverkauf

## IDEE, NICHT AKTUELLES ZIEL

Die technische Architektur könnte später als generisches Ankaufsystem verwendet werden für:

- Antiquitäten
- Kunst
- Uhren
- Schmuck
- andere Instrumente

Denkbares Produkt:

White-Label Lead Engine.

---

## WICHTIG

Aktuell NICHT generalisieren.

Erst beweisen, dass das System für Musikinstrument-Ankauf funktioniert.

Keine Abstraktionsschicht bauen, nur weil sie später eventuell nützlich sein könnte.

---

# 58. Annahmen

Die folgenden Punkte gelten als Annahmen und müssen anhand echter Nutzung geprüft werden:

- 2–3 Anfragen täglich
- ca. 10 % hochwertige Bass/Bogen-relevante Leads
- C-Leads können gesammelt geprüft werden
- Foto-Wizard erhöht Qualität ohne Conversion stark zu reduzieren
- Stadtseiten erhöhen Vertrauen und SEO
- Dashboard wird zentrale Arbeitsoberfläche bleiben
- eigene D1/R2-Lösung ist langfristig sinnvoller als Ninox für dieses Projekt

Diese Punkte nicht als unveränderliche Fakten behandeln.

---

# 59. Offene Fragen

1. Wer ist endgültig rechtlicher Betreiber?

2. Ist produktiv `REVIEW_TOKEN` gesetzt?

3. Soll Cloudflare Access das Token-System später ersetzen?

4. Ist der 3000-px-R2-Patch bereits im aktuellen Branch?

5. Ist der neue großzügigere PHOTO_PROMPT produktiv deployed?

6. Ist Make bereits vollständig produktiv konfiguriert?

7. Welche Benachrichtigungen sollen A/B/C konkret erzeugen?

8. Wird Ninox überhaupt noch gebraucht?

9. Soll `www` dauerhaft unterstützt oder auf die Root-Domain weitergeleitet werden?

10. Welche realen Suchbegriffe bringen nach einigen Monaten tatsächlich Leads?

11. Welche Foto-Schritte führen in der Praxis zu Abbrüchen?

12. Welche Dashboard-Informationen sind nach 50+ realen Leads wirklich wichtig?

---

# 60. Arbeitsprinzip für Coding-Agenten

Vor jeder größeren Änderung:

1. aktuellen Code lesen
2. bestehende Architektur verstehen
3. diese Datei konsultieren
4. keine neue Architektur erfinden, wenn bestehende Lösung genügt
5. kleine gezielte Änderungen bevorzugen
6. Nutzerführung vor technischer Eleganz priorisieren
7. bei KI immer Geschäftsinteresse berücksichtigen

Wenn eine Änderung einer hier dokumentierten Entscheidung widerspricht:

NICHT einfach umsetzen.

Als offene Produktentscheidung markieren.

---

# 61. Kernprinzip des gesamten Projekts

Die Website soll nicht zeigen, wie technisch clever sie ist.

Sie soll einem Menschen, der ein Instrument verkaufen möchte, das Gefühl geben:

> „Das geht einfach, hier kennt sich jemand aus, und meine Anfrage wird persönlich angesehen.“

Im Hintergrund soll das System gleichzeitig dafür sorgen, dass:

> ein möglicherweise außergewöhnlicher Kontrabass oder Bogen zuverlässig die Aufmerksamkeit des Betreibers erhält.

Beides zusammen ist der eigentliche Zweck des Projekts.
