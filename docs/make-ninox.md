# Make + Ninox – schlanke Lead-Ablage

Die Website speichert die schweren Daten nicht in Ninox:

- **R2**: alle Originalfotos
- **D1**: vollständige Anfrage, KI-Ergebnis, Status, Foto-Referenzen
- **Make**: Routing, E-Mails und Übergabe an Ninox
- **Ninox**: nur schlanker Arbeitsdatensatz + Link zur internen Detailansicht

## 1. Make-Webhook

In Make ein neues Scenario anlegen:

1. `Webhooks > Custom webhook`
2. Webhook-URL kopieren.
3. Im Cloudflare Worker als Secret setzen:

```bash
npx wrangler secret put MAKE_WEBHOOK_URL
```

Der Worker sendet nach jeder erfolgreich gespeicherten Anfrage JSON an Make. Der Webhook läuft im Hintergrund; selbst wenn Make ausfällt, bleibt die Anfrage in D1 und die Fotos bleiben in R2 gespeichert.

Beispiel:

```json
{
  "event": "lead.created",
  "id": "ANK-...",
  "created_at": "2026-08-09T18:00:00.000Z",
  "instrument_type": "double_bass",
  "classified_type": "",
  "ai_used": true,
  "title": "Kontrabass mit zwei Bögen",
  "lead_class": "A",
  "notable": true,
  "interest_score": 94,
  "confidence": 62,
  "summary": "Älterer Kontrabass aus Nachlass; zwei Bögen vorhanden.",
  "signals": ["Nachlass", "Kontrabass", "mehrere Bögen"],
  "photo_count": 7,
  "name": "...",
  "email": "...",
  "phone": "...",
  "city": "Hamburg",
  "story": "...",
  "maker": "...",
  "suggested_route": "immediate",
  "review_url": "https://musikinstrument-ankauf.de/review/?lead=ANK-..."
}
```

**Es werden keine Bilder an Make oder Ninox übertragen.** `review_url` öffnet die interne Detailansicht; die Bilder werden dort geschützt direkt aus R2 geladen.

## 2. Ninox-Tabelle

Empfohlene minimale Felder:

| Feld | Typ |
|---|---|
| Lead ID | Text |
| Eingang | Datum/Zeit |
| Titel | Text |
| Instrument | Text |
| Klasse | Auswahl/Text |
| Auffällig | Ja/Nein |
| Interesse | Zahl |
| Sicherheit | Zahl |
| Stadt | Text |
| Name | Text |
| E-Mail | Text |
| Telefon | Text |
| Kurzfassung | Mehrzeiliger Text |
| Anzahl Fotos | Zahl |
| Status | Auswahl |
| Anfrage öffnen | URL |

Optional: `Signale` als Text. Fotos, vollständige KI-JSON-Daten oder sonstige Binärdateien gehören **nicht** in Ninox.

## 3. Make-Routing

Nach `Custom webhook`:

1. Ninox: Datensatz anlegen/aktualisieren (für **jede** Anfrage).
2. Router:
   - `suggested_route = immediate` → sofortige E-Mail an dich.
   - `suggested_route = normal` → normale Benachrichtigung (z. B. E-Mail oder Digest).
   - `suggested_route = weekly` → keine E-Mail; nur Ninox-Eintrag für die wöchentliche Durchsicht.

Die endgültige A/B/C-Einstufung ist kein Löschfilter. C-Anfragen bleiben vollständig vorhanden.

## 4. Review-Link

In Produktion in `worker/wrangler.jsonc` setzen:

```json
"REVIEW_BASE_URL": "https://musikinstrument-ankauf.de"
```

Der Link in Ninox führt dann z. B. zu:

```text
https://musikinstrument-ankauf.de/review/?lead=ANK-...
```

Beim ersten Öffnen fragt die Review-Seite nach `REVIEW_TOKEN` und merkt sich den Token lokal im Browser. Die API liefert danach alle Bilder und Details aus R2/D1.

## 5. Ausfallsicherheit

`leads.make_status` enthält:

- `pending` – Übergabe läuft
- `sent` – Make hat den Webhook angenommen
- `failed` – Make-Aufruf fehlgeschlagen
- `disabled` – kein Make-Webhook konfiguriert

Damit geht eine Anfrage nicht verloren, nur weil Make kurzzeitig nicht erreichbar ist.
