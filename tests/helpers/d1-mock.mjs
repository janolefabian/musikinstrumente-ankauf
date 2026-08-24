import { DatabaseSync } from "node:sqlite";

function normalizeMeta(result) {
  return {
    changes: Number(result?.changes || 0),
    last_row_id: Number(result?.lastInsertRowid || 0),
  };
}

class D1StatementMock {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return Promise.resolve({ success: true, meta: normalizeMeta(result) });
  }

  first() {
    return Promise.resolve(
      this.database.prepare(this.sql).get(...this.values) || null,
    );
  }

  all() {
    const results = this.database.prepare(this.sql).all(...this.values);
    return Promise.resolve({ success: true, results, meta: {} });
  }
}

export function createD1Mock(schemaSql) {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(schemaSql);

  return {
    database,
    prepare(sql) {
      return new D1StatementMock(database, sql);
    },
    async batch(statements) {
      database.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      database.close();
    },
  };
}

async function bytesFromValue(value) {
  if (value instanceof ReadableStream)
    return new Uint8Array(await new Response(value).arrayBuffer());
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  return new TextEncoder().encode(String(value));
}

export function createR2Mock() {
  const objects = new Map();
  let failDeletes = false;

  return {
    objects,
    setDeleteFailure(value) {
      failDeletes = Boolean(value);
    },
    async put(key, value, options = {}) {
      objects.set(key, {
        bytes: await bytesFromValue(value),
        httpMetadata: options.httpMetadata || {},
      });
    },
    async get(key) {
      const object = objects.get(key);
      if (!object) return null;
      return {
        body: object.bytes,
        httpMetadata: object.httpMetadata,
      };
    },
    async delete(key) {
      if (failDeletes) throw new Error("simulated_r2_delete_failure");
      objects.delete(key);
    },
  };
}
