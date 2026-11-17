import { defineConfig } from "@playwright/test";

const web = "http://127.0.0.1:5190";
const api = "http://127.0.0.1:3090";

export default defineConfig({
  testDir: "./tests/browser",
  forbidOnly: !!process.env.CI,
  use: { baseURL: web, viewport: { width: 390, height: 844 } },
  webServer: [
    {
      command: "node --import tsx tests/browser/api.ts",
      url: `${api}/api/ready`,
      env: { NODE_ENV: "test", PORT: "3090", HOST: "127.0.0.1", APP_ORIGIN: web, OPEN_METEO_MODE: "disabled" },
    },
    {
      command: "npm run dev:web -- --host 127.0.0.1 --port 5190 --strictPort",
      url: web,
      env: { KOOKIA_API_PROXY_TARGET: api },
    },
  ],
});
