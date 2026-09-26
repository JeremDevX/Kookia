import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { globalMediaPlugin } from "../scripts/css-media.mjs";

export default defineConfig({
  cacheDir: "../node_modules/.vite-workshop",
  plugins: [react()],
  css: { postcss: { plugins: [globalMediaPlugin(new URL("./src/tokens.css", import.meta.url))] } },
  // This separate tool does not inherit Kookia's API proxy or CSS media policy.
  server: { host: "127.0.0.1", port: 5180, strictPort: true },
});
