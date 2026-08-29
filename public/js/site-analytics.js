(() => {
  const script = document.currentScript;
  const apiBase = script?.dataset.apiBase || "";
  if (
    !apiBase ||
    navigator.doNotTrack === "1" ||
    navigator.globalPrivacyControl === true
  )
    return;

  function sourceGroup() {
    if (!document.referrer) return "direct";
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin === location.origin) return "internal";
      const host = referrer.hostname.toLowerCase();
      if (/(^|\.)google\./.test(host)) return "google";
      if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
      if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com"))
        return "duckduckgo";
      return "external";
    } catch (_) {
      return "unknown";
    }
  }

  function deviceType() {
    if (window.innerWidth <= 640) return "mobile";
    if (window.innerWidth <= 1024) return "tablet";
    return "desktop";
  }

  const path = location.pathname.endsWith("/")
    ? location.pathname
    : `${location.pathname}/`;
  void fetch(`${apiBase}/api/analytics/pageview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      page_path: path,
      source_group: sourceGroup(),
      device_type: deviceType(),
    }),
    keepalive: true,
  }).catch(() => {
    // Anonymous statistics must never delay or interrupt the page.
  });
})();
