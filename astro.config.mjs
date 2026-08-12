import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const sitemapExcludedPaths = new Set([
  "/datenschutz/",
  "/impressum/",
  "/review/",
]);

export default defineConfig({
  site: "https://musikinstrument-ankauf.de",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => !sitemapExcludedPaths.has(new URL(page).pathname),
    }),
  ],
});
