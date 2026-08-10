import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://musikinstrument-ankauf.de",
  output: "static",
  integrations: [sitemap()],
});
