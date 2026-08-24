# Sicherer Worker- und D1-Release

Dieser Ablauf ist für vorwärtsgerichtete, rückwärtskompatible Datenbankänderungen ausgelegt. Er führt keine Veröffentlichung automatisch beim Push auf `main` aus. GitHub Pages und der API-Worker bleiben getrennte Releases.

Wrangler sucht die Dateien aus `worker/schema/migrations/` in numerischer Reihenfolge. Beim Anwenden legt es die Tabelle `d1_migrations` an und trägt dort den relativen Dateinamen jeder erfolgreich ausgeführten Migration ein. Spätere Läufe führen ausschließlich noch nicht verzeichnete Dateien aus. Eine fehlerhafte einzelne Migration wird zurückgerollt; davor erfolgreich abgeschlossene Dateien bleiben angewendet. Das entspricht der aktuellen [D1-Migrationsdokumentation von Cloudflare](https://developers.cloudflare.com/d1/reference/migrations/).

## Grundregeln

- Bereits veröffentlichte Migrationen niemals ändern oder umbenennen.
- Für eine Remote-Datenbank niemals `wrangler d1 execute ... --remote --file=schema.sql` verwenden.
- Änderungen ausschließlich als neue Datei unter `worker/schema/migrations/` anlegen.
- Remote-Änderungen mit `wrangler d1 migrations apply LEADS --remote` ausführen.
- `worker/schema/schema.sql` ist nur die kanonische Momentaufnahme des Endschemas für Tests und Inspektion. Bootstrap und Updates laufen ausschließlich über Migrationen.
- Erst Staging, dann Produktion. Vor Produktion müssen Tests, Worker-Dry-Run und Smoke-Test grün sein.
- Schemaänderungen zunächst nur erweitern. Spalten oder Tabellen werden erst in einem späteren Release entfernt, nachdem kein veröffentlichter Code sie mehr verwendet.
- Der Browser verwendet für eine erstmalige Anfrage und für jeden einzelnen Fortsetzungs-Batch jeweils einen stabilen `Idempotency-Key`. Bei einem Netzwerk-Retry muss derselbe Schlüssel erneut gesendet werden; erst der nächste logische Batch erhält einen neuen Schlüssel.
- Der aktuelle Einwilligungs-Payload lautet `{ "accepted": true, "version": "2026-08-24", "at": "<ISO-Zeitpunkt>" }`. Eine neue Version braucht eine bewusste Frontend-, Worker- und Teständerung.

## Einmalige Baseline der bestehenden Produktion

Die Produktionsdatenbank existierte bereits vor der Wrangler-Migrationshistorie. Dort wurde das Grundschema und sehr wahrscheinlich auch die Thumbnail-Änderung manuell ausgeführt. Wrangler erkennt vorhandene Spalten nicht selbst: Ohne Baseline würde es `0002_photo_thumbnails_and_review_indexes.sql` erneut ausführen und am bereits vorhandenen `thumbnail_key` abbrechen.

Diese Baseline wird genau einmal und nur für die bereits bestehende Produktion durchgeführt. Zuerst einen Export außerhalb des Repositories sichern:

```sh
npm exec --workspace worker -- wrangler d1 export LEADS --remote --output="/ABSOLUTER/SICHERER/PFAD/d1-backup-before-baseline.sql"
```

Dann die Migrationsliste aufrufen. Dadurch wird bei Bedarf die leere Tabelle `d1_migrations` angelegt:

```sh
npm exec --workspace worker -- wrangler d1 migrations list LEADS --remote
```

Vor dem Markieren müssen Historie und echtes Schema gelesen werden:

```sh
npm exec --workspace worker -- wrangler d1 execute LEADS --remote --command "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;"
npm exec --workspace worker -- wrangler d1 execute LEADS --remote --command "SELECT 'leads' AS table_name, group_concat(name, ',') AS columns FROM pragma_table_info('leads') UNION ALL SELECT 'photos', group_concat(name, ',') FROM pragma_table_info('photos');"
npm exec --workspace worker -- wrangler d1 execute LEADS --remote --command "SELECT type, name, sql FROM sqlite_schema WHERE type IN ('table','index') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;"
```

Die erwartete, noch nicht gehärtete Produktion hat:

- in `leads` die Grundspalten von `id` bis `make_error`, aber noch keine Spalten ab `idempotency_key_hash`;
- in `photos` die Grundspalten und bereits `thumbnail_key`, aber noch keine Spalten ab `storage_status`;
- `idx_photos_lead_created`; der ältere zusätzliche Index `idx_photos_lead` darf noch vorhanden sein und wird von `0003` entfernt;
- noch keine Tabellen `api_rate_limits`, `object_deletions` oder `lead_continuations`.

Nur wenn genau dieser Zustand vorliegt und die Historie für `0001`/`0002` leer ist, werden die beiden nachweislich schon vorhandenen Stände als angewendet markiert:

```sh
npm exec --workspace worker -- wrangler d1 execute LEADS --remote --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_initial_schema.sql'), ('0002_photo_thumbnails_and_review_indexes.sql');"
```

Danach müssen Historie und ausstehende Liste erneut kontrolliert werden:

```sh
npm exec --workspace worker -- wrangler d1 execute LEADS --remote --command "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;"
npm exec --workspace worker -- wrangler d1 migrations list LEADS --remote
```

Jetzt darf nur `0003_worker_hardening.sql` ausstehen. Bei jedem anderen Ergebnis nicht `apply` starten: Export in eine getrennte Staging-Datenbank importieren und dort den tatsächlichen Zwischenstand untersuchen. Insbesondere darf eine fehlende Historie niemals durch erneutes Ausführen von `schema.sql` „repariert“ werden.

Sonderfall: Fehlt `thumbnail_key` noch, `0002` nicht als angewendet markieren. Nach gesichertem Test auf einer Datenbankkopie kann die vollständige Kette ab `0001` laufen; `0001` verwendet für die vorhandenen Grundtabellen ausschließlich `IF NOT EXISTS`.

## Lokale Prüfung

```sh
npm ci
npm test
npm run worker:check
npm run build
```

Für eine neue oder bereits über diese Migrationskette initialisierte lokale D1-Datenbank:

```sh
npm run worker:db:init
```

`worker:db:init` ist ein lesbarer Alias für `worker:db:migrate:local`; beide wenden dieselbe idempotente Kette an. Es gibt keinen separaten Bootstrap über das fertige `schema.sql` mehr.

Eine ältere lokale Datenbank, die noch direkt mit `schema.sql` angelegt wurde, hat wie die Produktion keine verlässliche Historie. Ist sie entbehrlich, eine frische lokale D1-Instanz verwenden. Müssen ihre Daten erhalten bleiben, zuvor exportieren und die Baseline-Prüfung oben mit `--local` statt `--remote` durchführen.

## Staging

Staging benötigt einen eigenen Worker, eine eigene D1-Datenbank und einen eigenen R2-Bucket. Niemals die produktiven Bindings in einer Staging-Konfiguration wiederverwenden.

```sh
npm exec --workspace worker -- wrangler d1 migrations list LEADS --env staging --remote
npm exec --workspace worker -- wrangler d1 migrations apply LEADS --env staging --remote
npm exec --workspace worker -- wrangler deploy --env staging
SMOKE_BASE_URL=https://api-staging.example SMOKE_ORIGIN=https://staging.example npm run smoke:worker
```

Mit `SMOKE_REVIEW_TOKEN` prüft das Smoke-Skript zusätzlich einen autorisierten, rein lesenden Dashboard-Aufruf. Ohne Secret prüft es Health, Auth-Abschirmung und optional CORS. Es legt keine Anfrage an und verändert keine Daten.

In GitHub Actions läuft derselbe Staging-Smoke optional, sobald `STAGING_API_BASE` als Repository-Variable gesetzt ist. Optional:

- Variable `STAGING_SITE_ORIGIN`
- Secret `STAGING_REVIEW_TOKEN`

## Produktion

1. D1 sichern und den Export außerhalb des Repositories aufbewahren. Falls die einmalige Baseline oben noch nicht durchgeführt wurde, hier stoppen und zuerst diesen Abschnitt vollständig abarbeiten:

   ```sh
   npm exec --workspace worker -- wrangler d1 export LEADS --remote --output="/ABSOLUTER/SICHERER/PFAD/d1-backup-before-release.sql"
   ```

2. Ausstehende Migrationen ansehen:

   ```sh
   npm exec --workspace worker -- wrangler d1 migrations list LEADS --remote
   ```

3. Vorwärtsgerichtete Migrationen anwenden:

   ```sh
   npm run worker:db:migrate:remote
   ```

4. Worker veröffentlichen:

   ```sh
   npm run worker:deploy
   ```

5. Rein lesende Smoke-Gates ausführen:

   ```sh
   SMOKE_BASE_URL=https://api.example SMOKE_ORIGIN=https://musikinstrument-ankauf.de npm run smoke:worker
   ```

6. Danach einen echten End-to-End-Test mit einem klar als Test markierten Lead durchführen und ihn kontrolliert im Dashboard entfernen.

Bei einer Löschung kann die API `202 Accepted` mit `deletion_pending: true` zurückgeben. Das ist ein erfolgreicher Löschauftrag, kein UI-Fehler: Der Lead ist sofort aus dem Dashboard ausgeblendet, seine personenbezogenen Felder sind geleert und die R2-Objekte werden aus der dauerhaften Warteschlange erneut gelöscht. `200 OK` bedeutet, dass auch diese Nacharbeit bereits abgeschlossen ist.

Beim End-to-End-Test zusätzlich prüfen:

- Ein erneuter Versand der initialen Anfrage mit identischem Schlüssel erzeugt keinen zweiten Lead.
- Ein erneuter Versand desselben Foto-Fortsetzungs-Batches mit identischem Schlüssel erzeugt weder einen zweiten Foto-Datensatz noch ein zweites R2-Objekt.
- Der gespeicherte Lead trägt die aktuelle Consent-Version.
- Eine absichtlich simulierte ausstehende Objektlöschung wird im Dashboard als angenommen behandelt; im Tombstone sind Name, E-Mail, Telefon, Ort, Geschichte, Hersteller, Zusammenfassung und KI-JSON bereits geleert.

## Rollback

- Worker-Code kann auf den letzten bekannten Commit zurückgesetzt und erneut veröffentlicht werden.
- Datenbankmigrationen sind vorwärtsgerichtet. Keine bereits angewendete Migration zurückeditieren.
- Bei einem Schemafehler eine neue korrigierende Migration erstellen.
- Einen D1-Export nur im echten Notfall wiederherstellen; das kann neuere Leads überschreiben und braucht deshalb eine bewusste Freigabe.
- Eine noch ausstehende R2-Löschung nicht durch manuelles Entfernen des Tombstones „aufräumen“: Dadurch ginge die Retry-Zuordnung verloren. Erst die Objektwarteschlange kontrollieren und abarbeiten.

## GitHub-Berechtigungen

Der Pages-Build besitzt nur `contents: read`. `pages: write` und `id-token: write` sind ausschließlich am eigentlichen Deploy-Job gesetzt. Worker-Secrets werden im normalen Pages-Workflow nicht benötigt.
