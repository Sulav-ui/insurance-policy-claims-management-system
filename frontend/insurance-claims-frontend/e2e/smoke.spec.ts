import { test, expect } from "@playwright/test";

test.describe("Insurance Application - Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // 1. Application loads successfully
  test("should load the application successfully", async ({ page }) => {
    await expect(page.locator("body")).toBeVisible();
  });

  // 2. Email input is visible
  test("should display the email input", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  // 3. Password input is visible
  test("should display the password input", async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  // 4. Login button is available
  test("should display the sign-in button", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: /sign in|login|log in/i,
      }),
    ).toBeEnabled();
  });

  // 5. Registration button is visible
  test("should display the create account button", async ({ page }) => {
    await expect(
      page.getByRole("button", {
        name: "Create Account",
        exact: true,
      }),
    ).toBeVisible();
  });

  // 6. Email input accepts text
  test("should accept an email address", async ({ page }) => {
    const email = page.locator('input[type="email"]');

    await email.fill("test@example.com");

    await expect(email).toHaveValue("test@example.com");
  });

  // 7. Password input accepts and masks text
  test("should accept and mask the password", async ({ page }) => {
    const password = page.locator('input[type="password"]');

    await password.fill("TestPassword123!");

    await expect(password).toHaveValue("TestPassword123!");

    await expect(password).toHaveAttribute("type", "password");
  });

  // 8. Registration navigation works
  test("should navigate to the registration page", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Create Account",
        exact: true,
      })
      .click();

    await expect(page.locator('input[type="password"]')).toHaveCount(2);
  });

  // 9. Protected dashboard is not accessible
  test("should hide the dashboard without authentication", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: "Insurance Dashboard",
        exact: true,
      }),
    ).toHaveCount(0);
  });

  // 10. Refresh preserves the unauthenticated state
  test("should remain on the login page after refresh", async ({ page }) => {
    await page.reload();

    await expect(page.locator('input[type="email"]')).toBeVisible();

    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});
