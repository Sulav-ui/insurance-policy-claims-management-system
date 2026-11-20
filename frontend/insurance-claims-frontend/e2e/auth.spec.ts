import { test, expect } from "@playwright/test";

test.describe("Authentication E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the login form", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.locator('input[type="email"]').fill("invalid@example.com");
    await page.locator('input[type="password"]').fill("WrongPassword123!");

    await page.getByRole("button", { name: /sign in|login|log in/i }).click();

    await expect(
      page.getByRole("heading", { name: "Insurance Dashboard" }),
    ).toHaveCount(0);

    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("should navigate to registration", async ({ page }) => {
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.locator('input[type="password"]')).toHaveCount(2);
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    test.skip(!email || !password, "E2E credentials are not configured");

    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);

    await page.getByRole("button", { name: /sign in|login|log in/i }).click();

    await expect(
      page.getByRole("heading", { name: "Insurance Dashboard" }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;

    test.skip(!email || !password, "E2E credentials are not configured");

    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);

    await page.getByRole("button", { name: /sign in|login|log in/i }).click();

    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();

    await page.getByRole("button", { name: "Logout" }).click();

    await expect(page.locator('input[type="email"]')).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Insurance Dashboard" }),
    ).toHaveCount(0);
  });
});
