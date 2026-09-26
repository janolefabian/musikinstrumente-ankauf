# E-Mail-Benachrichtigungen – Veröffentlichung, 26. September 2026

**Backend veröffentlicht; Gmail-Versand aktiv und live getestet.** Die Empfängeradresse
ist als Worker-Secret `EMAIL_NOTIFICATION_TO` und in der ignorierten lokalen
`worker/.dev.vars` hinterlegt, nicht im öffentlichen Website-Code.
Der Benutzer hat den Absender nach dem nicht abgeschlossenen GMX-Setup auf
`janolefabian@gmail.com` geändert. Die Gmail-Verbindung `11292675` ist freigegeben;
die Absender-Auswahl wurde über Make geprüft und liefert genau dieses Konto.
Der Benachrichtigungsempfänger bleibt unverändert. Genau eine gekennzeichnete Testmail
wurde erfolgreich über Gmail gesendet; die Ankunft im Posteingang ist noch nicht
vom Benutzer bestätigt.

Aktuelle Verbindungsanfrage im Make-Team 223925 für Gmail:
`abe56eb5-dc58-4400-bb2c-b7ad9c112b0c` wurde erfolgreich autorisiert;
keine zweite Gmail-Anfrage erzeugen. Die vorhandenen Tempera-Postfächer
sind für diesen Versand ausdrücklich nicht ausgewählt.

Die frühere GMX-Verbindungsanfrage `29bfff84-ead7-4782-925e-545b15b13c39` ist überholt
und darf nicht mehr für diesen Versand verwendet werden. Eine fremde Verbindung
nicht durch Überschreiben des From-Headers als gewünschten Absender ausgeben.

## Veröffentlichungsstand

- Migration `0009_email_notifications.sql` wurde nach einem privaten D1-Backup
  erfolgreich angewendet. Keine historischen Anfragen wurden nachgetragen.
- Worker-Code-Veröffentlichung: `d947ee17-101a-46ae-ae08-4d7e142424aa`;
  die Versand-Secrets wurden anschließend separat veröffentlicht.
- Die Dashboard-Seite wurde mit Commit `c7d4705` über den bestehenden Pages-Workflow
  veröffentlicht (Run `36198032212` erfolgreich). `EMAIL_WEBHOOK_URL` und
  `EMAIL_WEBHOOK_SECRET` sind gesetzt; das geschützte Live-API meldet
  `configured: true`, alle drei Prioritäten aktiv und den unveränderten Empfänger.
- Neue Anfragen werden ab diesem Worker-Release dauerhaft vorgemerkt; solange die
  Verbindung fehlt, werden weder Mails verschickt noch Versandversuche verbraucht.
- Die Make-Verbindung und der Versand einschließlich Abschlussbericht sind geprüft.
  Der Benutzer muss lediglich den tatsächlichen Posteingang bestätigen.

## Aktive Make-Einrichtung

- Eigenes Szenario `7622871` im Team `223925` ist **aktiv**:
  https://eu1.make.com/223925/scenarios/7622871/edit
- Webhook `3788242`, Modul 1. Erfassung von HTTP-Headern und HTTP-Methode ist aktiviert.
  Die Webhook-URL gehört nicht ins Repository oder in den öffentlichen Website-Code.
- Die tatsächlichen Trigger-Felder und die HTTP-Antwort `data` wurden anhand von
  Ausführungen geprüft. Modul 2 reserviert den Versand, Modul 3 sendet über Gmail,
  Modul 4 bestätigt den Erfolg an den Worker.
- Vor Modul 2 müssen HTTP-Methode `POST`, Ereignis `lead.email.requested`, der
  separate Header `x-webhook-secret` und eine sichere Ereignis-ID passen.
  Die ID ist auf `^lead-email:[A-Za-z0-9_-]{1,128}$` beschränkt. Erst bei booleschem
  `data.send: true` läuft Gmail. Empfänger und Inhalt stammen nur aus dem Worker.
- Gmail-Modul `google-email:sendAnEmail`, Version 4, Verbindung `11292675`.
  Dieses Modul arbeitet mit HTML: den gesamten Mailtext zwingend mit
  `escapeHTML(...)` maskieren und nur in einen festen Text-/`pre`-Rahmen einsetzen.
  Besuchertext darf weder HTML noch zusätzliche Empfänger oder Header erzeugen.
- HTTP-Modul `http:MakeRequest`, Version 4: feste Worker-URLs, POST/JSON,
  keine Weiterleitungen, Fehler bei HTTP 4xx/5xx. Claim vor Gmail, Complete danach.
- Beide Versand-Secrets sind in Cloudflare und in der ignorierten lokalen
  `worker/.dev.vars` hinterlegt. Diese Datei ist mit Modus 600 geschützt.
  Keine Secrets oder Webhook-URLs ins Repository übernehmen.
- Im Live-Test erzeugte `toString(pick(...))` nur `{object}`, kein JSON. Die beiden
  HTTP-Module verwenden deshalb JSON-Vorlagen mit der streng validierten ID;
  das Receipt stammt ausschließlich aus der vertrauenswürdigen Worker-Antwort.

## Verhalten

- Interner Bereich: `/review/einstellungen/`, derselbe Sitzungsschlüssel wie im
  Dashboard. Einstellungen und Empfänger werden ausschließlich authentifiziert geladen.
- A, B und C sind standardmäßig eingeschaltet. „Auffällig“ folgt A/B/C und ist kein
  separater Versandfilter. Kurzanfragen ohne Fotos starten mit B.
- Auswahl wird in D1 gespeichert. Gleichzeitige Änderungen in zwei Browsern
  überschreiben sich nicht stillschweigend (Revisionsprüfung).
- Nur neue, vollständig gespeicherte Erstanfragen erzeugen einen Eintrag in der
  Mail-Warteschlange, atomar mit dem Abschluss der Anfrage. Wiederholungen,
  Fortsetzungen und weitere Fotos erzeugen keine zweite Mail.
- Keine Nachbefüllung historischer Anfragen. Neue Anfragen ab Veröffentlichung des
  Workers warten bei fehlender Mail-Konfiguration auf die spätere Einrichtung.
- Vor einem Versand werden abgewählte Prioritäten und gelöschte Anfragen nochmals
  geprüft. Ausgelassene Einträge werden bei erneutem Anhaken nicht nachversendet.
- Die vorhandene `MAKE_WEBHOOK_URL`-Integration (z. B. Ninox) bleibt unverändert.
  Der eigene Mail-Webhook darf keine vorhandene Ninox-Ablage filtern oder ersetzen.

## Einrichtung nach Bestätigung des Absenders

1. Bestehende D1-Datenbank sichern, dann Migration
   `0009_email_notifications.sql` anwenden **bevor** der neue Worker veröffentlicht
   wird. Keine alten Migrationen ändern und nicht `schema.sql` auf Produktion ausführen.
2. Separates Make-Szenario mit dem bestätigten Absenderpostfach einrichten.
3. Worker-Secrets setzen (niemals ins Frontend oder in URL-Parameter):
   - `EMAIL_NOTIFICATION_TO`: die bestätigte Empfängeradresse
   - `EMAIL_WEBHOOK_URL`: HTTPS-URL des dedizierten Make-Webhooks
   - `EMAIL_WEBHOOK_SECRET`: zufälliges Geheimnis mit mindestens 32 Zeichen;
     strikt getrennt vom Review-Zugangsschlüssel
4. Make-Empfang gegen `X-Webhook-Secret` absichern. Der ausgehende Webhook enthält
   ausschließlich `event: "lead.email.requested"` und `notification_id`.
5. Make ruft **vor** jedem E-Mail-Versand
   `POST /api/email-notifications/claim` am Worker auf, JSON
   `{ "notification_id": "<ID aus dem Webhook>" }`, mit
   `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`.
6. Nur beim exakten booleschen Wert `send: true` weitermachen. Die Antwort enthält
   `message.to`, `message.subject`, `message.text`, `message.review_url` und
   `receipt_token`. Das Gmail-Modul verwendet einen festen HTML-`pre`-Rahmen mit
   `escapeHTML(message.text)`: Besuchertext wird ausschließlich als Text angezeigt.
   Kein Besuchertext darf Empfänger, Absender, Header oder Rückrufadressen steuern.
   Name, E-Mail und Telefon des Besuchers sowie Fotos werden nicht mitgeliefert;
   Kurzfassung und Ort können trotzdem personenbezogen sein.
7. Nach bestätigter Annahme durch den Mail-Anbieter
   `POST /api/email-notifications/complete` mit demselben separaten Bearer-Secret
   und JSON `{ "notification_id": "...", "receipt_token": "..." }`.
   **Nur diesen Erfolgsbericht** darf Make nach einem Netzwerkfehler erneut senden.
   Den Mail-Schritt nicht automatisch aus einer unklaren Ausführung wiederholen.
8. Einen ausdrücklich als Test gekennzeichneten neuen Eingang verwenden und den
   gesamten Weg einschließlich tatsächlichem Posteingang prüfen. Ein HTTP-200 des
   Make-Webhooks allein ist kein erfolgreicher E-Mail-Test. Der Versand darf erst
   nach abgeschlossenem Setup aktiviert werden. Die Website kann vorher mit
   ausdrücklich als nicht eingerichtet angezeigtem Versand veröffentlicht werden.

## Fehler und Grenzen

- Sofortige Übergabe im Hintergrund. Der bestehende 15-Minuten-Wartungsjob greift
  offene Einträge erneut auf; maximal acht Übergabeversuche mit wachsendem Abstand.
  Ein stabiler Ereignisschlüssel und atomare Versandreservierung schützen vor
  doppelten Mails durch doppelte Webhook-Ausführungen.
- Webhook angenommen: `awaiting`. Mail reserviert: `sending`. Mail-Anbieter hat
  Versand bestätigt und der Abschlussbericht kam an: `sent`. Das ist **keine
  Zustellbestätigung für den Posteingang**.
- Nach 30 Minuten ohne Abschlussbericht: `uncertain`. Nicht blind erneut senden:
  Die Mail könnte bereits unterwegs sein. Make-Verlauf und Ausgangspostfach prüfen;
  bei belegtem Erfolg nur den Abschlussbericht wiederholen. Ein verspäteter echter
  Abschlussbericht wird weiterhin akzeptiert.
- Ohne erfolgreichen Claim/Übergabe nach acht Versuchen: `failed`. Im Admin sichtbar.
- Keine genau-einmal-Zustellgarantie für SMTP/Gmail: Provider-Fehler, manuelles
  Wiederholen des Mail-Moduls oder unklare Providerantworten bleiben Sonderfälle.
- Die Outbox kopiert keine Kontaktdaten. Hartes Löschen einer Anfrage entfernt den
  zugehörigen Outbox-Eintrag per Fremdschlüssel; bereits versendete E-Mails lassen
  sich dadurch nicht zurückholen. Der Make-Verlauf hat seine eigene Aufbewahrung.

## Tests

`npm run check` prüft geschützte Einstellungen, A/B/C-Filter, Änderungen aus zwei
Browsern, Idempotenz, Versandreservierung bei Parallelität, Wiederholungen,
fehlende Einrichtung, unklare Zustände, spätere Bestätigungen, Löschungen,
Kurzanfragen, UI-Anmeldung und die durchgehende Datenbankmigration.

Lokaler Prüfstand am 26.09.2026: `npm run check` vollständig erfolgreich,
einschließlich des zuvor ausgesparten Wrangler-Laufzeit-Migrationstests,
Worker-Dry-Run und Website-Build. Die SQLite-Migrationstests
für frische und bestehende Datenbanken bestanden. Kompiliertes HTML enthält alle
drei angehakten Checkboxen, keine private Empfängeradresse und keine vor dem Login
sichtbaren Einstellungen; die interne Seite ist nicht in der Sitemap enthalten.
Kein Browser-End-to-End-Test durchgeführt.

Live-Prüfung am 26.09.2026:

- Ausführung `fcc138da7f9e42e1946aa8b34c472d7a`: alle vier Module erfolgreich;
  Gmail lieferte Message-ID `1a0dd99d9cf5a085` und Label `SENT`, die Outbox
  bestätigte `sent` um `2026-09-26T12:04:02.541Z`.
- Gmail-Absender exakt `janolefabian@gmail.com`, genau ein interner Empfänger,
  eingefügtes `<b>` im Testtext nachweislich HTML-maskiert.
- Derselbe Eingang erneut: nur Trigger und Claim liefen, kein zweiter Gmail-Versand
  (Ausführung `d805060fcf1e49c3b7a0a37720eb1352`).
- Falsches Secret und GET trotz korrektem Secret: jeweils nur der Trigger,
  kein Claim und kein Versand. Ein Webhook-HTTP-200 allein bedeutet also weiterhin
  nicht, dass ein Ereignis den Sicherheitsfilter passiert hat.
- Der Test verwendete einen künstlichen D1-Eintrag und einen echten POST an Make;
  öffentliche Anfrageformulare und Besucherstatistiken wurden nicht verwendet.
  Die Worker-Übergabe/Wiederholungen sind durch die zwölf erneut erfolgreichen
  automatisierten Mailtests abgedeckt, nicht durch diesen manuellen Live-POST.
- Der künstliche Testeintrag wurde nach der Prüfung samt Outbox entfernt;
  beide Kontrollabfragen ergaben null verbleibende Testeinträge. Die
  Testmail und der Make-Ausführungsverlauf bleiben als Versandbelege erhalten.
