# Musikinstrument Ankauf – v1.1

Git-Startpunkt für den Relaunch von `musikinstrument-ankauf.de`.

## Lokal starten

```bash
npm install
npm run dev
```

Website: `http://localhost:4321`

Ohne `PUBLIC_API_BASE` arbeitet der Funnel im Demo-Modus. Für R2/D1/OpenAI/Make den Worker separat starten.

## Architektur

- **Astro / GitHub Pages** – öffentliche Website und Funnel
- **Cloudflare Worker** – API, Upload und KI-Aufrufe
- **Cloudflare R2** – private Originalfotos
- **Cloudflare D1** – vollständige technische Lead-Daten
- **Make** – E-Mail-Routing und Übergabe an Ninox
- **Ninox** – schlankes Arbeits-CRM ohne Fotos; jeder Datensatz enthält nur einen Link zur internen Detailansicht

## Funnel

- Kontrabass, Bogen, Geige/Bratsche/Cello, Nachlass und „Ich weiß es nicht“ → geführte Fotoaufnahme + KI nur dort, wo sie nützlich ist.
- Gitarre und sonstige Kategorien → normaler Upload **ohne KI**.
- Qualitätscheck verwendet eine verkleinerte Bildkopie; das Original bleibt in R2.
- Bei geführten Kategorien wird der Lead nach dem ersten brauchbaren Übersichtsfoto und den Kontaktdaten gespeichert. Weitere Detailfotos und Angaben können anschließend freiwillig ergänzt werden.
- Keine Anfrage wird automatisch verworfen. A/B/C steuert nur Priorität und Benachrichtigung.

## Interne Review-Ansicht

`/review/` zeigt die Leads als schnelle Bildkarten. Ein Klick öffnet:

- alle Fotos aus R2
- Kontaktdaten
- Geschichte / Herstellerangabe
- KI-Kurzfassung
- Interest Score und Confidence getrennt
- Auffälligkeiten / Signale
- Make-Status
- einfache Arbeitsstatus wie „Interessant“, „Kontaktiert“, „Angekauft“ und „Archiv“

Direktlinks funktionieren über `/review/?lead=ANK-...` und sind für das URL-Feld in Ninox gedacht.

Die Liste lädt serverseitig gefiltert in Seiten zu 30 Leads. Kleine, private
Vorschaubilder werden nur im sichtbaren Bereich nachgeladen; die großen
Originale werden erst beim Öffnen der Galerie übertragen.

Ansichten gibt es sowohl nach Priorität als auch nach Bearbeitungsstand
(`Neu`, `Interessant`, `Kontaktiert`, `Angekauft`, `Nicht interessant` und
`Archiviert`). Über die Checkboxen lassen sich bis zu 100 geladene Anfragen
gemeinsam archivieren oder löschen.

## Cloudflare aktivieren

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
```

1. R2-Bucket `musikinstrument-ankauf-photos` anlegen.
2. D1-Datenbank `musikinstrument-ankauf-leads` anlegen und ID in `worker/wrangler.jsonc` einsetzen.
3. Schema anwenden:

```bash
npx wrangler d1 execute LEADS --remote --file=./schema/schema.sql
```

Bei einer bereits bestehenden D1-Datenbank stattdessen vor dem Worker-Deploy
die neue Migration anwenden:

```bash
npx wrangler d1 execute LEADS --remote --file=./schema/migrations/0002_photo_thumbnails_and_review_indexes.sql
```

4. Secrets setzen:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put UPLOAD_TOKEN_SECRET
npx wrangler secret put REVIEW_TOKEN
npx wrangler secret put MAKE_WEBHOOK_URL
```

5. `ALLOWED_ORIGIN` und `REVIEW_BASE_URL` in Produktion auf `https://musikinstrument-ankauf.de` setzen.
6. Worker deployen und URL als `PUBLIC_API_BASE` beim Astro-Build setzen.

Nach Migration und Worker-Deploy können bestehende R2-Fotos einmalig mit
kleinen Vorschaubildern ergänzt werden:

```bash
REVIEW_API_BASE="https://WORKER-URL" REVIEW_ACCESS_TOKEN="REVIEW_TOKEN" npm --workspace worker run thumbnails:backfill
```

Ohne gesetztes `REVIEW_TOKEN` bleiben sämtliche Review- und Foto-Endpunkte
geschlossen.

`UPLOAD_TOKEN_SECRET` signiert den auf 72 Stunden begrenzten Fortsetzungszugang für ergänzende Fotos. Wenn kein eigener Wert gesetzt ist, nutzt der Worker als kompatible Übergangslösung `OPENAI_API_KEY`.

Der Worker nutzt standardmäßig `gpt-5.6-luna` für die kostensensitive Bildprüfung und Triage. Das Modell kann über `OPENAI_MODEL` geändert werden.

## Make + Ninox

Die konkrete Einrichtung, Felder und das Webhook-Payload stehen in:

`docs/make-ninox.md`

Wichtig: **Keine Bilder nach Ninox übertragen.** Ninox erhält nur Text/Metadaten und `review_url`.

## Beispielbilder

Später kommen echte Referenzbilder unter `public/images/photo-help/` hinein: Kontrabass, Bassbogen, Cello/Cellobogen, Geige/Geigenbogen und Bratsche. Die Hilfe im Funnel ist dafür bereits vorbereitet.

## Vor Livegang

- Impressum vervollständigen.
- Datenschutz an R2/D1/OpenAI/Make/Ninox und tatsächliche Löschfristen anpassen und rechtlich prüfen.
- `REVIEW_TOKEN` stark wählen; `/review/` enthält personenbezogene Daten.
- Make-Szenario testen (A, B, C und temporär nicht erreichbarer Webhook).
- D1/R2-Backups bzw. Löschkonzept festlegen.
