import { test as setup } from "@playwright/test";
import { expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

/**
 * Authentication setup for E2E tests
 * This setup runs once before all tests to authenticate and save the session state
 */
setup("authenticate", async ({ page }) => {
  // Navigate to login page
  await page.goto("/auth/login");

  // Wait for the page to load
  await expect(page).toHaveTitle(/.*(?:login|sign in).*/i);

  // Fill in login credentials from environment variables
  const email = process.env.E2E_USERNAME || "test@example.com";
  const password = process.env.E2E_PASSWORD || "testpassword123";

  // Fill the login form - wait for fields to be ready
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.waitForSelector('input[type="password"]', { state: "visible" });

  // Clear and fill the email and password
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for login to complete - the form redirects after showing a toast
  console.log("Waiting for login to complete...");

  // Give it time for the API call and redirect
  await page.waitForTimeout(2000);

  // Check if we're now on the decks page
  const currentUrl = page.url();
  if (currentUrl.includes("/decks")) {
    console.log("Successfully logged in and redirected to decks");
  } else {
    // Check for any error messages on the page
    const errorText = await page.textContent("body");
    console.log("Current page content:", errorText?.substring(0, 500));

    // Check browser console for errors
    const consoleMessages = [];
    page.on("console", (msg) => consoleMessages.push(msg.text()));

    throw new Error(`Login did not redirect to decks. Current URL: ${currentUrl}`);
  }

  // Verify we're logged in by checking the decks page loads
  await expect(page).toHaveURL(/\/decks/);

  // Save the authentication state for other tests
  await page.context().storageState({ path: authFile });
});
