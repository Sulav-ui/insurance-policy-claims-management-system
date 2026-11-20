import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,

  timeout: 30000,

  expect: {
    timeout: 10000,
  },

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:5174",

    headless: true,

    screenshot: "only-on-failure",

    video: "retain-on-failure",

    trace: "retain-on-failure",

    actionTimeout: 10000,

    navigationTimeout: 30000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  webServer: {
    command: "npm run dev -- --host localhost --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      E2E_TEST: "true",
    },
  },
});
