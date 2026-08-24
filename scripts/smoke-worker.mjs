const baseUrl = String(process.env.SMOKE_BASE_URL || process.argv[2] || "")
  .trim()
  .replace(/\/$/, "");
const reviewToken = String(process.env.SMOKE_REVIEW_TOKEN || "").trim();
const siteOrigin = String(process.env.SMOKE_ORIGIN || "").trim();

if (!baseUrl) {
  console.error("SMOKE_BASE_URL oder eine URL als erstes Argument fehlt.");
  process.exit(2);
}

const parsed = new URL(baseUrl);
if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
  console.error("Smoke-Tests erlauben außerhalb von localhost ausschließlich HTTPS.");
  process.exit(2);
}

async function request(pathname, options = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    ...options,
  });
}

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await request("/api/health", {
  headers: { "Cache-Control": "no-store" },
});
ensure(health.status === 200, `Healthcheck antwortet mit HTTP ${health.status}`);
ensure((await health.json()).ok === true, "Healthcheck liefert kein ok=true");

const unauthorized = await request("/api/review?limit=1");
ensure(
  [401, 503].includes(unauthorized.status),
  `Review-Endpunkt ist ohne Token unerwartet erreichbar (HTTP ${unauthorized.status})`,
);

if (siteOrigin) {
  const preflight = await request("/api/leads", {
    method: "OPTIONS",
    headers: {
      Origin: siteOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type,Idempotency-Key",
    },
  });
  ensure(preflight.ok, `CORS-Preflight antwortet mit HTTP ${preflight.status}`);
  ensure(
    preflight.headers.get("access-control-allow-origin") === siteOrigin,
    "CORS-Preflight erlaubt den konfigurierten Seiten-Origin nicht",
  );
}

if (reviewToken) {
  const authorized = await request("/api/review?limit=1", {
    headers: { Authorization: `Bearer ${reviewToken}` },
  });
  ensure(authorized.status === 200, `Review-Smoke antwortet mit HTTP ${authorized.status}`);
  const payload = await authorized.json();
  ensure(Array.isArray(payload.items), "Review-Smoke liefert keine items-Liste");
}

console.log("Worker-Smoke erfolgreich: Health, Auth-Abschirmung und optionale Gates sind in Ordnung.");
