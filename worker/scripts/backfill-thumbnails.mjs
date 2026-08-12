import sharp from "sharp";

const apiBase = String(process.env.REVIEW_API_BASE || "").replace(/\/$/, "");
const accessToken = process.env.REVIEW_ACCESS_TOKEN || "";

if (!apiBase || !accessToken) {
  console.error(
    "REVIEW_API_BASE und REVIEW_ACCESS_TOKEN müssen gesetzt sein.",
  );
  process.exit(1);
}

const headers = { Authorization: `Bearer ${accessToken}` };

async function checkedFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response;
}

async function findMissingThumbnails() {
  const missing = [];
  let cursor = "";
  do {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.set("cursor", cursor);
    const page = await (
      await checkedFetch(`${apiBase}/api/review?${params}`)
    ).json();
    for (const lead of page.items || []) {
      const detail = await (
        await checkedFetch(
          `${apiBase}/api/review/${encodeURIComponent(lead.id)}`,
        )
      ).json();
      for (const photo of detail.photos || []) {
        if (!photo.has_thumbnail) missing.push(photo);
      }
    }
    cursor = page.has_more ? page.next_cursor || "" : "";
  } while (cursor);
  return missing;
}

async function backfill(photo, index, total) {
  const original = await checkedFetch(photo.url);
  const thumbnail = await sharp(Buffer.from(await original.arrayBuffer()))
    .rotate()
    .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  await checkedFetch(
    `${apiBase}/api/review/photo/${encodeURIComponent(photo.id)}/thumbnail`,
    {
      method: "PUT",
      headers: { "Content-Type": "image/jpeg" },
      body: thumbnail,
    },
  );
  console.log(`[${index + 1}/${total}] ${photo.id}`);
}

const photos = await findMissingThumbnails();
if (!photos.length) {
  console.log("Alle Fotos haben bereits Vorschaubilder.");
  process.exit(0);
}

console.log(`${photos.length} Vorschaubilder werden erzeugt …`);
let nextIndex = 0;
const concurrency = Math.min(3, photos.length);
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (nextIndex < photos.length) {
      const index = nextIndex++;
      await backfill(photos[index], index, photos.length);
    }
  }),
);
console.log("Thumbnail-Backfill abgeschlossen.");
