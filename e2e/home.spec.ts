import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should load successfully", async ({ page }) => {
    // Navigate to the home page
    await page.goto("/");

    // Check if the page loaded (basic smoke test)
    await expect(page).toHaveTitle(/Flashcard App/);
  });
});
