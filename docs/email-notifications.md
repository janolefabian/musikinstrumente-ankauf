# E-Mail-Benachrichtigungen – Veröffentlichung, 26. September 2026

**Backend veröffentlicht; Mail-Versand noch nicht verbunden.** Die Empfängeradresse
ist als Worker-Secret `EMAIL_NOTIFICATION_TO` und in der ignorierten lokalen
`worker/.dev.vars` hinterlegt, nicht im öffentlichen Website-Code.
Der Benutzer hat `jean-eau-le@gmx.net` als
Absender bestätigt. Die passende SMTP-Verbindung in Make ist noch nicht bestätigt.
Es wurden keine E-Mails versendet und keine Make-Szenarien geändert.

Für die Wiederaufnahme wurde im Make-Team 223925 eine Verbindungsanfrage angelegt:
`29bfff84-ead7-4782-925e-545b15b13c39`. Nach Bestätigung mit `connection_get` prüfen;
keine zweite Anfrage erzeugen. Eine fremde Mail-Verbindung nicht einfach durch
Überschreiben des From-Headers als GMX-Absender verwenden.

## Veröffentlichungsstand

- Migration `0009_email_notifications.sql` wurde nach einem privaten D1-Backup
  erfolgreich angewendet. Keine historischen Anfragen wurden nachgetragen.
- Worker-Version: `d947ee17-101a-46ae-ae08-4d7e142424aa`.
- Die Dashboard-Seite wird mit diesem Stand über den bestehenden Pages-Workflow
  veröffentlicht. `EMAIL_WEBHOOK_URL` und `EMAIL_WEBHOOK_SECRET` sind absichtlich
  noch nicht gesetzt: Die Oberfläche zeigt den Versand als nicht eingerichtet an.
- Neue Anfragen werden ab diesem Worker-Release dauerhaft vorgemerkt; solange die
  Verbindung fehlt, werden weder Mails verschickt noch Versandversuche verbraucht.
- Zum Abschluss: GMX-Verbindung bestätigen, eigenes Make-Szenario aufbauen,
  absichern und testen, dann beide fehlenden Secrets setzen und Versand prüfen.

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
   `receipt_token`. Das Mail-Modul verwendet **Klartext**, keine HTML-Interpretation.
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
Kein Browser-End-to-End-Test und kein echter Mail-Versandtest durchgeführt.
