import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createD1Mock, createR2Mock } from "../../tests/helpers/d1-mock.mjs";
import worker from "./index.js";

const schemaSql = await readFile(
  new URL("../schema/schema.sql", import.meta.url),
  "utf8",
);
const allowedOrigin = "https://musikinstrument-ankauf.de";

function environment(overrides = {}) {
  return {
    LEADS: createD1Mock(schemaSql),
    PHOTOS: createR2Mock(),
    UPLOAD_TOKEN_SECRET: "test-upload-token-secret-with-sufficient-length",
    REVIEW_TOKEN: "test-review-token",
    ALLOWED_ORIGIN: allowedOrigin,
    ...overrides,
  };
}

function context() {
  return { waitUntil() {} };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function jpeg(name = "detail.jpg") {
  return new File(
    [new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3, 0xff, 0xd9])],
    name,
    { type: "image/jpeg" },
  );
}

function initialRequest({
  key = "initial-operation-key-000001",
  photos = [],
  thumbnails = [],
  consent = {
    accepted: true,
    version: "2026-08-24",
    at: new Date().toISOString(),
  },
  includeKey = true,
} = {}) {
  const form = new FormData();
  const meta = {
    type: "guitar",
    classifiedType: "guitar",
    data: { email: "test@example.invalid" },
    photoMeta: photos.map((_, index) => ({
      kind: "detail",
      label: `Detail ${index + 1}`,
    })),
  };
  if (consent !== undefined) meta.consent = consent;
  form.set("meta", JSON.stringify(meta));
  photos.forEach((photo, index) => form.set(`photo_${index}`, photo));
  thumbnails.forEach((photo, index) => form.set(`thumb_${index}`, photo));
  const headers = { Origin: allowedOrigin };
  if (includeKey) headers["Idempotency-Key"] = key;
  return new Request("https://api.example.test/api/leads", {
    method: "POST",
    headers,
    body: form,
  });
}

async function createLead(env, options = {}) {
  const response = await worker.fetch(
    initialRequest(options),
    env,
    context(),
  );
  assert.equal(response.status, 201, await response.clone().text());
  return response.json();
}

function continuationRequest(lead, operationKey, photoCount = 1) {
  const form = new FormData();
  form.set(
    "meta",
    JSON.stringify({
      classifiedType: "guitar",
      data: { story: "", maker: "" },
      photoMeta: Array.from({ length: photoCount }, (_, index) => ({
        kind: "detail",
        label: `Detail ${index + 1}`,
      })),
    }),
  );
  for (let index = 0; index < photoCount; index += 1)
    form.set(`photo_${index}`, jpeg(`detail-${index + 1}.jpg`));
  return new Request(
    `https://api.example.test/api/leads/${encodeURIComponent(lead.id)}/continue`,
    {
      method: "POST",
      headers: {
        Origin: allowedOrigin,
        Authorization: `Bearer ${lead.continuation_token}`,
        "Idempotency-Key": operationKey,
      },
      body: form,
    },
  );
}

function deleteRequest(env, leadId) {
  return new Request(`https://api.example.test/api/review/${leadId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.REVIEW_TOKEN}` },
  });
}

async function runScheduled(env) {
  let task;
  await worker.scheduled({}, env, {
    waitUntil(promise) {
      task = promise;
    },
  });
  assert.ok(task, "scheduled maintenance must register a task");
  await task;
}

test("current submissions require a key and a plausible explicit consent time", async () => {
  const env = environment();
  try {
    const missingKey = await worker.fetch(
      initialRequest({ includeKey: false }),
      env,
      context(),
    );
    assert.equal(missingKey.status, 400);
    assert.equal((await missingKey.json()).error, "idempotency_key_missing");

    const missingConsentTime = await worker.fetch(
      initialRequest({
        key: "strict-consent-operation-000001",
        consent: { accepted: true, version: "2026-08-24" },
      }),
      env,
      context(),
    );
    assert.equal(missingConsentTime.status, 400);
    assert.equal((await missingConsentTime.json()).error, "consent_invalid");

    const nullConsent = await worker.fetch(
      initialRequest({
        key: "strict-consent-operation-000002",
        consent: null,
      }),
      env,
      context(),
    );
    assert.equal(nullConsent.status, 400);
    assert.equal((await nullConsent.json()).error, "consent_invalid");

    const implicitLegacy = await worker.fetch(
      initialRequest({ includeKey: false, consent: undefined }),
      env,
      context(),
    );
    assert.equal(implicitLegacy.status, 400);
    assert.equal((await implicitLegacy.json()).error, "idempotency_key_missing");
  } finally {
    env.LEADS.close();
  }
});

test("an initial partial R2 failure returns retryable failure and the same key repairs it", async () => {
  const env = environment();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  let failThumbnailOnce = true;
  env.PHOTOS.put = async (key, value, options) => {
    if (failThumbnailOnce && key.includes("-thumb.")) {
      failThumbnailOnce = false;
      throw new Error("simulated_thumbnail_put_failure");
    }
    return basePut(key, value, options);
  };
  const key = "initial-r2-retry-operation-000001";
  const request = () =>
    initialRequest({ key, photos: [jpeg()], thumbnails: [jpeg("thumb.jpg")] });
  try {
    const failed = await worker.fetch(request(), env, context());
    assert.equal(failed.status, 503);
    const leadId = env.LEADS.database.prepare("SELECT id FROM leads").get().id;
    assert.deepEqual(await failed.json(), {
      error: "photo_storage_failed",
      id: leadId,
      retryable: true,
      processing_status: "partial",
    });
    assert.equal(
      env.LEADS.database
        .prepare("SELECT storage_status FROM photos")
        .get().storage_status,
      "failed",
    );

    const repaired = await worker.fetch(request(), env, context());
    assert.equal(repaired.status, 200, await repaired.clone().text());
    assert.equal((await repaired.json()).processing_status, "ready");
    assert.equal(
      env.LEADS.database
        .prepare("SELECT storage_status FROM photos")
        .get().storage_status,
      "ready",
    );
    assert.equal(env.PHOTOS.objects.size, 2);
    assert.equal(
      env.LEADS.database.prepare("SELECT COUNT(*) AS count FROM photos").get().count,
      1,
    );
  } finally {
    env.LEADS.close();
  }
});

test("a repeated continuation operation stores its photos exactly once", async () => {
  const env = environment();
  try {
    const lead = await createLead(env);
    const operationKey = "continuation-operation-key-000001";
    const first = await worker.fetch(
      continuationRequest(lead, operationKey),
      env,
      context(),
    );
    const second = await worker.fetch(
      continuationRequest(lead, operationKey),
      env,
      context(),
    );
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal((await second.json()).idempotent, true);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE lead_id=?")
        .get(lead.id).count,
      1,
    );
    assert.equal(env.PHOTOS.objects.size, 1);
    assert.equal(
      env.LEADS.database
        .prepare(
          "SELECT COUNT(*) AS count FROM lead_continuations WHERE lead_id=? AND status='complete'",
        )
        .get(lead.id).count,
      1,
    );
  } finally {
    env.LEADS.close();
  }
});

test("an upload that races deletion cannot leave original or thumbnail R2 objects", async () => {
  const env = environment();
  const enteredPut = deferred();
  const releasePut = deferred();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  let block = true;
  env.PHOTOS.put = async (key, value, options) => {
    if (block) {
      block = false;
      enteredPut.resolve();
      await releasePut.promise;
    }
    return basePut(key, value, options);
  };
  try {
    const lead = await createLead(env, {
      key: "upload-delete-race-initial-000001",
    });
    const upload = worker.fetch(
      continuationRequest(lead, "upload-delete-race-continue-000001"),
      env,
      context(),
    );
    await enteredPut.promise;

    const deletion = await worker.fetch(deleteRequest(env, lead.id), env, context());
    assert.equal(deletion.status, 202);
    assert.equal(env.PHOTOS.objects.size, 0);

    releasePut.resolve();
    const uploadResponse = await upload;
    assert.equal(uploadResponse.status, 410, await uploadResponse.clone().text());
    assert.equal(env.PHOTOS.objects.size, 0);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(lead.id).count,
      0,
    );
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE lead_id=?")
        .get(lead.id).count,
      0,
    );
  } finally {
    releasePut.resolve();
    env.LEADS.close();
  }
});

test("a late upload recreates a PII-free cleanup anchor after stale maintenance", async () => {
  const env = environment();
  const enteredPut = deferred();
  const releasePut = deferred();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  let block = true;
  env.PHOTOS.put = async (key, value, options) => {
    if (block) {
      block = false;
      enteredPut.resolve();
      await releasePut.promise;
    }
    return basePut(key, value, options);
  };
  try {
    const lead = await createLead(env, {
      key: "late-upload-cleanup-initial-000001",
    });
    const upload = worker.fetch(
      continuationRequest(lead, "late-upload-cleanup-continue-000001"),
      env,
      context(),
    );
    await enteredPut.promise;
    const deletion = await worker.fetch(deleteRequest(env, lead.id), env, context());
    assert.equal(deletion.status, 202);
    env.LEADS.database
      .prepare("UPDATE photos SET created_at=? WHERE lead_id=?")
      .run("2000-01-01T00:00:00.000Z", lead.id);

    await runScheduled(env);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(lead.id).count,
      0,
    );

    releasePut.resolve();
    const response = await upload;
    assert.equal(response.status, 410);
    assert.equal(env.PHOTOS.objects.size, 0);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(lead.id).count,
      0,
    );
  } finally {
    releasePut.resolve();
    env.LEADS.close();
  }
});

test("a stale successful delete cannot acknowledge an object recreated by an in-flight upload", async () => {
  const env = environment();
  const enteredPut = deferred();
  const releasePut = deferred();
  const firstDeleteFinishedR2 = deferred();
  const releaseFirstDelete = deferred();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  let blockPut = true;
  let deleteCalls = 0;
  env.PHOTOS.put = async (key, value, options) => {
    if (blockPut) {
      blockPut = false;
      enteredPut.resolve();
      await releasePut.promise;
    }
    return basePut(key, value, options);
  };
  env.PHOTOS.delete = async (key) => {
    deleteCalls += 1;
    if (deleteCalls === 1) {
      env.PHOTOS.objects.delete(key);
      firstDeleteFinishedR2.resolve();
      await releaseFirstDelete.promise;
      return;
    }
    if (deleteCalls === 2)
      throw new Error("simulated_second_delete_failure");
    env.PHOTOS.objects.delete(key);
  };

  try {
    const lead = await createLead(env, {
      key: "stale-delete-race-initial-000001",
    });
    const upload = worker.fetch(
      continuationRequest(lead, "stale-delete-race-continue-000001"),
      env,
      context(),
    );
    await enteredPut.promise;
    const deletion = worker.fetch(deleteRequest(env, lead.id), env, context());
    await firstDeleteFinishedR2.promise;

    releasePut.resolve();
    const uploadResponse = await upload;
    assert.equal(uploadResponse.status, 410);
    assert.equal(deleteCalls, 2);
    assert.equal(env.PHOTOS.objects.size, 1);

    releaseFirstDelete.resolve();
    const deletionResponse = await deletion;
    assert.equal(deletionResponse.status, 202);
    const journal = env.LEADS.database
      .prepare(
        "SELECT completed_at,attempts FROM object_deletions WHERE lead_id=?",
      )
      .get(lead.id);
    assert.equal(journal.completed_at, null);
    assert.ok(journal.attempts >= 2);
    assert.equal(env.PHOTOS.objects.size, 1);

    env.LEADS.database
      .prepare(
        "UPDATE object_deletions SET next_attempt_at=? WHERE lead_id=? AND completed_at IS NULL",
      )
      .run("2000-01-01T00:00:00.000Z", lead.id);
    await runScheduled(env);
    assert.equal(env.PHOTOS.objects.size, 0);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(lead.id).count,
      0,
    );
  } finally {
    releasePut.resolve();
    releaseFirstDelete.resolve();
    env.LEADS.close();
  }
});

test("a generated thumbnail that races deletion is journaled and removed", async () => {
  const env = environment();
  const leadId = "ANK-THUMBNAIL-RACE";
  const photoId = "P-THUMBNAIL-RACE";
  const objectKey = `${leadId}/original.jpg`;
  env.LEADS.database
    .prepare("INSERT INTO leads (id,created_at,status) VALUES (?,?,?)")
    .run(leadId, new Date().toISOString(), "new");
  env.LEADS.database
    .prepare(
      "INSERT INTO photos (id,lead_id,object_key,content_type,created_at,storage_status) VALUES (?,?,?,?,?,?)",
    )
    .run(
      photoId,
      leadId,
      objectKey,
      "image/jpeg",
      new Date().toISOString(),
      "ready",
    );
  env.PHOTOS.objects.set(objectKey, {
    bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    httpMetadata: { contentType: "image/jpeg" },
  });
  const enteredPut = deferred();
  const releasePut = deferred();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  env.PHOTOS.put = async (key, value, options) => {
    enteredPut.resolve();
    await releasePut.promise;
    return basePut(key, value, options);
  };

  try {
    const thumbnailUpload = worker.fetch(
      new Request(
        `https://api.example.test/api/review/photo/${photoId}/thumbnail`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${env.REVIEW_TOKEN}`,
            "Content-Type": "image/jpeg",
          },
          body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]),
        },
      ),
      env,
      context(),
    );
    await enteredPut.promise;
    assert.equal(
      env.LEADS.database
        .prepare("SELECT storage_status FROM photos WHERE id=?")
        .get(photoId).storage_status,
      "thumbnail_pending",
    );

    const deletion = await worker.fetch(deleteRequest(env, leadId), env, context());
    assert.equal(deletion.status, 202);
    releasePut.resolve();

    const thumbnailResponse = await thumbnailUpload;
    assert.equal(thumbnailResponse.status, 410);
    assert.equal(env.PHOTOS.objects.size, 0);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(leadId).count,
      0,
    );
  } finally {
    releasePut.resolve();
    env.LEADS.close();
  }
});

test("a failed delete of a replaced thumbnail remains scheduled and retryable", async () => {
  const env = environment();
  const leadId = "ANK-THUMBNAIL-REPLACEMENT";
  const photoId = "P-THUMBNAIL-REPLACEMENT";
  const objectKey = `${leadId}/original.jpg`;
  const oldThumbnailKey = `${leadId}/old-thumb.jpg`;
  env.LEADS.database
    .prepare("INSERT INTO leads (id,created_at,status) VALUES (?,?,?)")
    .run(leadId, new Date().toISOString(), "new");
  env.LEADS.database
    .prepare(
      "INSERT INTO photos (id,lead_id,object_key,thumbnail_key,content_type,created_at,storage_status) VALUES (?,?,?,?,?,?,?)",
    )
    .run(
      photoId,
      leadId,
      objectKey,
      oldThumbnailKey,
      "image/jpeg",
      new Date().toISOString(),
      "ready",
    );
  for (const key of [objectKey, oldThumbnailKey])
    env.PHOTOS.objects.set(key, {
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      httpMetadata: { contentType: "image/jpeg" },
    });
  env.PHOTOS.setDeleteFailure(true);

  try {
    const response = await worker.fetch(
      new Request(
        `https://api.example.test/api/review/photo/${photoId}/thumbnail`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${env.REVIEW_TOKEN}`,
            "Content-Type": "image/jpeg",
          },
          body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]),
        },
      ),
      env,
      context(),
    );
    assert.equal(response.status, 200, await response.clone().text());
    const currentThumbnailKey = env.LEADS.database
      .prepare("SELECT thumbnail_key FROM photos WHERE id=?")
      .get(photoId).thumbnail_key;
    assert.notEqual(currentThumbnailKey, oldThumbnailKey);
    assert.ok(env.PHOTOS.objects.has(oldThumbnailKey));
    const pending = env.LEADS.database
      .prepare(
        "SELECT completed_at,last_error FROM object_deletions WHERE object_key=?",
      )
      .get(oldThumbnailKey);
    assert.equal(pending.completed_at, null);
    assert.match(pending.last_error, /simulated_r2_delete_failure/u);

    env.PHOTOS.setDeleteFailure(false);
    env.LEADS.database
      .prepare("UPDATE object_deletions SET next_attempt_at=? WHERE object_key=?")
      .run("2000-01-01T00:00:00.000Z", oldThumbnailKey);
    await runScheduled(env);
    assert.equal(env.PHOTOS.objects.has(oldThumbnailKey), false);
    assert.ok(env.PHOTOS.objects.has(currentThumbnailKey));
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(leadId).count,
      1,
    );
  } finally {
    env.LEADS.close();
  }
});

test("different concurrent continuations atomically respect the per-lead photo limit", async () => {
  const env = environment();
  const enteredPut = deferred();
  const releasePut = deferred();
  const basePut = env.PHOTOS.put.bind(env.PHOTOS);
  let block = true;
  env.PHOTOS.put = async (key, value, options) => {
    if (block) {
      block = false;
      enteredPut.resolve();
      await releasePut.promise;
    }
    return basePut(key, value, options);
  };
  try {
    const lead = await createLead(env, {
      key: "parallel-limit-initial-key-000001",
    });
    const firstUpload = worker.fetch(
      continuationRequest(lead, "parallel-limit-operation-one-000001", 8),
      env,
      context(),
    );
    await enteredPut.promise;
    const competing = await worker.fetch(
      continuationRequest(lead, "parallel-limit-operation-two-000001", 5),
      env,
      context(),
    );
    assert.equal(competing.status, 400);
    assert.equal((await competing.json()).error, "too_many_photos");
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE lead_id=?")
        .get(lead.id).count,
      8,
    );

    releasePut.resolve();
    assert.equal((await firstUpload).status, 200);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM photos WHERE lead_id=?")
        .get(lead.id).count,
      8,
    );
  } finally {
    releasePut.resolve();
    env.LEADS.close();
  }
});

test("scheduled maintenance retries deletion without unauthenticated request side effects", async () => {
  const env = environment();
  const leadId = "ANK-SCHEDULED-TOMBSTONE";
  const photoId = "P-SCHEDULED-TOMBSTONE";
  const objectKey = `${leadId}/photo.jpg`;
  env.LEADS.database
    .prepare(
      "INSERT INTO leads (id,created_at,name,email,phone,city,story,maker,status) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .run(
      leadId,
      new Date().toISOString(),
      "Private Person",
      "private@example.invalid",
      "+49 123 456",
      "Berlin",
      "Privater Text",
      "Hersteller",
      "new",
    );
  env.LEADS.database
    .prepare(
      "INSERT INTO photos (id,lead_id,object_key,content_type,created_at) VALUES (?,?,?,?,?)",
    )
    .run(photoId, leadId, objectKey, "image/jpeg", new Date().toISOString());
  env.PHOTOS.objects.set(objectKey, {
    bytes: new Uint8Array([1, 2, 3]),
    httpMetadata: { contentType: "image/jpeg" },
  });
  env.PHOTOS.setDeleteFailure(true);

  try {
    const accepted = await worker.fetch(deleteRequest(env, leadId), env, context());
    assert.equal(accepted.status, 202);
    const tombstone = env.LEADS.database
      .prepare("SELECT * FROM leads WHERE id=?")
      .get(leadId);
    assert.ok(tombstone.deleted_at);
    for (const field of ["name", "email", "phone", "city", "story", "maker"])
      assert.equal(tombstone[field], "", `${field} must be scrubbed`);

    env.PHOTOS.setDeleteFailure(false);
    env.LEADS.database
      .prepare(
        "UPDATE object_deletions SET next_attempt_at=? WHERE lead_id=? AND completed_at IS NULL",
      )
      .run("2000-01-01T00:00:00.000Z", leadId);
    const unauthorized = await worker.fetch(
      new Request("https://api.example.test/api/review"),
      env,
      context(),
    );
    assert.equal(unauthorized.status, 401);
    assert.ok(env.PHOTOS.objects.has(objectKey));

    await runScheduled(env);
    assert.equal(env.PHOTOS.objects.has(objectKey), false);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM leads WHERE id=?")
        .get(leadId).count,
      0,
    );
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM object_deletions WHERE lead_id=?")
        .get(leadId).count,
      0,
    );
  } finally {
    env.LEADS.close();
  }
});

test("scheduled maintenance cleans old completed continuation journals", async () => {
  const env = environment();
  const leadId = "ANK-OLD-JOURNAL";
  env.LEADS.database
    .prepare("INSERT INTO leads (id,created_at) VALUES (?,?)")
    .run(leadId, "2026-01-01T00:00:00.000Z");
  env.LEADS.database
    .prepare(
      "INSERT INTO lead_continuations (lead_id,idempotency_key_hash,created_at,updated_at,status,response_json) VALUES (?,?,?,?,?,?)",
    )
    .run(
      leadId,
      "old-operation",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "complete",
      "{}",
    );
  try {
    await runScheduled(env);
    assert.equal(
      env.LEADS.database
        .prepare("SELECT COUNT(*) AS count FROM lead_continuations")
        .get().count,
      0,
    );
  } finally {
    env.LEADS.close();
  }
});

test("PATCH returns not_found when no active lead was updated", async () => {
  const env = environment();
  try {
    const response = await worker.fetch(
      new Request("https://api.example.test/api/review/does-not-exist", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${env.REVIEW_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "archived" }),
      }),
      env,
      context(),
    );
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "not_found");
  } finally {
    env.LEADS.close();
  }
});
