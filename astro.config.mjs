import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const sitemapExcludedPrefixes = [
  "/datenschutz/",
  "/impressum/",
  "/admin/",
  "/review/",
];

export default defineConfig({
  site: "https://musikinstrument-ankauf.de",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !sitemapExcludedPrefixes.some((prefix) =>
          pathname.startsWith(prefix),
        );
      },
    }),
  ],
});
