import assert from "node:assert/strict";
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "worker/schema/migrations");
const schemaFile = path.join(root, "worker/schema/schema.sql");

async function migrationFiles() {
  return (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b, "en"));
}

async function migrationEntries() {
  return Promise.all(
    (await migrationFiles()).map(async (name) => ({
      name,
      sql: await readFile(path.join(migrationsDir, name), "utf8"),
    })),
  );
}

function createMigrationHistory(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS d1_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )
  `);
}

async function applyUnappliedMigrations(database) {
  createMigrationHistory(database);
  const applied = new Set(
    database.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map(({ name }) => name),
  );

  for (const migration of await migrationEntries()) {
    if (applied.has(migration.name)) continue;
    database.exec(migration.sql);
    database
      .prepare("INSERT INTO d1_migrations (name) VALUES (?)")
      .run(migration.name);
  }
}

function schemaSnapshot(database) {
  const tables = database
    .prepare(
      `SELECT name
         FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
          AND name != 'd1_migrations'
        ORDER BY name`,
    )
    .all()
    .map(({ name }) => name);

  const columns = Object.fromEntries(
    tables.map((table) => [
      table,
      database
        .prepare(`PRAGMA table_info(${JSON.stringify(table)})`)
        .all()
        .map(({ name, type, notnull, dflt_value, pk }) => ({
          name,
          type,
          notnull,
          default: dflt_value,
          pk,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "en")),
    ]),
  );

  const indexes = database
    .prepare(
      `SELECT name, tbl_name
         FROM sqlite_master
        WHERE type = 'index'
          AND name NOT LIKE 'sqlite_%'
          AND tbl_name != 'd1_migrations'
        ORDER BY name`,
    )
    .all()
    .map(({ name, tbl_name: table }) => {
      const definition = database
        .prepare(`PRAGMA index_list(${JSON.stringify(table)})`)
        .all()
        .find((index) => index.name === name);
      const columnsForIndex = database
        .prepare(`PRAGMA index_xinfo(${JSON.stringify(name)})`)
        .all()
        .filter(({ key }) => key === 1)
        .map(({ name: column, desc, coll }) => ({ column, desc, coll }));
      return {
        name,
        table,
        unique: definition.unique,
        partial: definition.partial,
        columns: columnsForIndex,
      };
    });

  return { tables, columns, indexes };
}

async function canonicalDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(await readFile(schemaFile, "utf8"));
  return database;
}

test("migration chain starts at 0001 and is contiguous", async () => {
  const files = await migrationFiles();
  assert.ok(files.length > 0, "at least one migration is required");
  assert.equal(new Set(files).size, files.length, "migration names must be unique");

  const numbers = files.map((file) => {
    assert.match(file, /^\d{4}_[a-z0-9_]+\.sql$/);
    return Number(file.slice(0, 4));
  });
  assert.deepEqual(
    numbers,
    Array.from({ length: numbers.length }, (_, index) => index + 1),
    "a fresh database must be able to run the complete ordered chain",
  );

  for (const { name, sql } of await migrationEntries()) {
    assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i, `${name} drops a table`);
    assert.doesNotMatch(
      sql,
      /\bDELETE\s+FROM\s+(?:leads|photos)\b/i,
      `${name} deletes production data`,
    );
  }
});

test("a fresh database reaches the canonical final schema using migrations only", async () => {
  const migrated = new DatabaseSync(":memory:");
  const current = await canonicalDatabase();

  try {
    await applyUnappliedMigrations(migrated);
    assert.deepEqual(schemaSnapshot(migrated), schemaSnapshot(current));
    assert.deepEqual(
      migrated.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map(({ name }) => name),
      await migrationFiles(),
    );

    await applyUnappliedMigrations(migrated);
    assert.deepEqual(
      migrated.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map(({ name }) => name),
      await migrationFiles(),
      "a second apply must be a no-op",
    );
  } finally {
    migrated.close();
    current.close();
  }
});

test("legacy schema plus the full migration chain preserves data and reaches the final schema", async () => {
  const legacySql = await readFile(
    path.join(root, "tests/fixtures/legacy-schema.sql"),
    "utf8",
  );
  const migrated = new DatabaseSync(":memory:");
  const current = await canonicalDatabase();

  try {
    migrated.exec(legacySql);
    migrated
      .prepare(`
        INSERT INTO leads (id, created_at, name, email, photo_count)
        VALUES ('ANK-LEGACY', '2026-08-01T12:00:00.000Z', 'Bestand', 'bestand@example.test', 1)
      `)
      .run();
    migrated
      .prepare(`
        INSERT INTO photos (id, lead_id, object_key, kind, created_at)
        VALUES ('P-LEGACY', 'ANK-LEGACY', 'leads/legacy/original.jpg', 'overview', '2026-08-01T12:00:00.000Z')
      `)
      .run();

    await applyUnappliedMigrations(migrated);

    assert.deepEqual(schemaSnapshot(migrated), schemaSnapshot(current));
    assert.deepEqual(
      {
        ...migrated
          .prepare(`
          SELECT name, email, idempotency_key_hash, processing_status,
                 processing_error, deletion_status
            FROM leads
           WHERE id = 'ANK-LEGACY'
        `)
          .get(),
      },
      {
        name: "Bestand",
        email: "bestand@example.test",
        idempotency_key_hash: null,
        processing_status: "ready",
        processing_error: "",
        deletion_status: "",
      },
    );
    assert.deepEqual(
      {
        ...migrated
          .prepare(`
          SELECT object_key, thumbnail_key, storage_status, storage_error,
                 operation_key_hash
            FROM photos
           WHERE id = 'P-LEGACY'
        `)
          .get(),
      },
      {
        object_key: "leads/legacy/original.jpg",
        thumbnail_key: null,
        storage_status: "ready",
        storage_error: "",
        operation_key_hash: null,
      },
    );
  } finally {
    migrated.close();
    current.close();
  }
});

test("an audited pre-migration production schema can be baselined at 0002 and upgraded", async () => {
  const preHardeningSql = await readFile(
    path.join(root, "tests/fixtures/pre-hardening-schema.sql"),
    "utf8",
  );
  const migrated = new DatabaseSync(":memory:");
  const current = await canonicalDatabase();

  try {
    migrated.exec(preHardeningSql);
    createMigrationHistory(migrated);
    const markApplied = migrated.prepare("INSERT INTO d1_migrations (name) VALUES (?)");
    markApplied.run("0001_initial_schema.sql");
    markApplied.run("0002_photo_thumbnails_and_review_indexes.sql");

    await applyUnappliedMigrations(migrated);

    assert.deepEqual(schemaSnapshot(migrated), schemaSnapshot(current));
    assert.deepEqual(
      migrated.prepare("SELECT name FROM d1_migrations ORDER BY id").all().map(({ name }) => name),
      await migrationFiles(),
    );
  } finally {
    migrated.close();
    current.close();
  }
});

test("final defaults, required fields, uniqueness and named indexes are explicit", async () => {
  const database = new DatabaseSync(":memory:");
  await applyUnappliedMigrations(database);

  try {
    const snapshot = schemaSnapshot(database);
    assert.deepEqual(snapshot.tables, [
      "api_rate_limits",
      "funnel_breakdowns_daily",
      "funnel_daily",
      "lead_continuations",
      "leads",
      "object_deletions",
      "photos",
      "site_pageviews_daily",
      "site_visitor_uniques",
      "site_visitors_daily",
    ]);
    assert.deepEqual(
      snapshot.indexes.map(({ name }) => name),
      [
        "idx_funnel_breakdowns_event",
        "idx_funnel_daily_event",
        "idx_lead_continuations_status",
        "idx_leads_class",
        "idx_leads_created",
        "idx_leads_deletion",
        "idx_leads_idempotency",
        "idx_leads_status",
        "idx_object_deletions_retry",
        "idx_photos_lead_created",
        "idx_photos_operation",
        "idx_photos_storage",
        "idx_rate_limits_expires",
        "idx_site_pageviews_date",
        "idx_site_visitor_uniques_created",
        "idx_site_visitors_date",
      ],
    );

    const defaults = Object.fromEntries(
      Object.entries(snapshot.columns).flatMap(([table, columns]) =>
        columns
          .filter((column) => column.default !== null)
          .map((column) => [`${table}.${column.name}`, column.default]),
      ),
    );
    assert.deepEqual(defaults, {
      "api_rate_limits.count": "0",
      "funnel_breakdowns_daily.event_count": "0",
      "funnel_breakdowns_daily.instrument_type": "'unselected'",
      "funnel_daily.device_type": "'unknown'",
      "funnel_daily.event_count": "0",
      "funnel_daily.instrument_type": "'unselected'",
      "lead_continuations.last_error": "''",
      "lead_continuations.status": "'pending'",
      "leads.confidence": "0",
      "leads.deletion_status": "''",
      "leads.interest_score": "0",
      "leads.lead_class": "'C'",
      "leads.make_error": "''",
      "leads.make_status": "'pending'",
      "leads.notable": "0",
      "leads.photo_count": "0",
      "leads.processing_error": "''",
      "leads.processing_status": "'ready'",
      "leads.status": "'new'",
      "object_deletions.attempts": "0",
      "object_deletions.last_error": "''",
      "photos.storage_error": "''",
      "photos.storage_status": "'ready'",
      "site_pageviews_daily.country_code": "'XX'",
      "site_pageviews_daily.view_count": "0",
      "site_visitors_daily.country_code": "'XX'",
      "site_visitors_daily.visitor_count": "0",
    });

    assert.throws(
      () => database.prepare("INSERT INTO leads (id) VALUES ('missing-created-at')").run(),
      /NOT NULL constraint failed/,
    );
    database
      .prepare("INSERT INTO leads (id, created_at, idempotency_key_hash) VALUES (?, ?, ?)")
      .run("A", "2026-08-01", "same-key");
    assert.throws(
      () =>
        database
          .prepare("INSERT INTO leads (id, created_at, idempotency_key_hash) VALUES (?, ?, ?)")
          .run("B", "2026-08-02", "same-key"),
      /UNIQUE constraint failed/,
    );
    database
      .prepare("INSERT INTO leads (id, created_at, idempotency_key_hash) VALUES (?, ?, NULL)")
      .run("C", "2026-08-03");
    database
      .prepare("INSERT INTO leads (id, created_at, idempotency_key_hash) VALUES (?, ?, NULL)")
      .run("D", "2026-08-04");
  } finally {
    database.close();
  }
});

test("Wrangler discovers schema/migrations and records the complete chain locally", async () => {
  const wrangler = path.join(root, "node_modules/.bin/wrangler");
  await access(wrangler);
  const persistence = await mkdtemp(path.join(tmpdir(), "mia-d1-migrations-"));
  const args = [
    "d1",
    "migrations",
    "apply",
    "LEADS",
    "--local",
    `--persist-to=${persistence}`,
    "--config",
    path.join(root, "worker/wrangler.jsonc"),
  ];
  const env = {
    ...process.env,
    CI: "true",
    WRANGLER_LOG_PATH: path.join(persistence, "wrangler.log"),
  };

  try {
    const first = spawnSync(wrangler, args, { cwd: root, env, encoding: "utf8" });
    const firstOutput = `${first.stdout}\n${first.stderr}`;
    assert.equal(first.status, 0, firstOutput);
    for (const file of await migrationFiles()) assert.match(firstOutput, new RegExp(file));

    const second = spawnSync(wrangler, args, { cwd: root, env, encoding: "utf8" });
    const secondOutput = `${second.stdout}\n${second.stderr}`;
    assert.equal(second.status, 0, secondOutput);
    assert.match(secondOutput, /No migrations to apply/i);
  } finally {
    await rm(persistence, { recursive: true, force: true });
  }
});
