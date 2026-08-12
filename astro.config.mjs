import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const sitemapExcludedPaths = new Set([
  "/datenschutz/",
  "/impressum/",
  "/review/",
  "/bremen/",
  "/dortmund/",
  "/dresden/",
  "/duesseldorf/",
  "/duisburg/",
  "/essen/",
  "/frankfurt/",
  "/hamburg/",
  "/hannover/",
  "/koeln/",
  "/leipzig/",
  "/muenchen/",
  "/nuernberg/",
  "/stuttgart/",
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
