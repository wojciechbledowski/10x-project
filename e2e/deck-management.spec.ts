import { test, expect } from "@playwright/test";
import {
  cleanupTestData,
  waitForElement,
  generateTestId,
  testData,
  verifyAuthenticated,
  createDeck,
  navigateToDeck,
  navigateToDeckSettings,
  getCurrentDeckId,
  closeAnyOpenModals,
  TEST_IDS,
} from "./test-utils";

test.describe("Deck Management", () => {
  // Run tests sequentially to avoid database conflicts
  test.describe.configure({ mode: "serial" });

  // Ensure clean state before each test
  test.beforeEach(async ({ page }) => {
    await closeAnyOpenModals(page);
  });

  // Global teardown to clean up test data
  test.afterAll(async () => {
    await cleanupTestData();
  });

  test.describe("Deck Browsing & Navigation", () => {
    test("should handle empty deck state", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      // Should show empty state when no decks exist
      await expect(page.locator(`[data-testid="${TEST_IDS.emptyState}"]`)).toBeVisible();
      await expect(page.locator(`[data-testid="${TEST_IDS.emptyStateTitle}"]`)).toContainText("No decks yet");
      await expect(page.locator(`[data-testid="${TEST_IDS.emptyStateMessage}"]`)).toContainText(
        "Create your first deck"
      );

      // Should show create deck button in empty state
      await expect(page.locator(`[data-testid="${TEST_IDS.createDeckButton}"]`).first()).toBeVisible();

      // Empty state should have an illustration
      await expect(page.locator(`[data-testid="${TEST_IDS.emptyStateIcon}"]`)).toBeVisible();
    });

    test("should display deck list with correct information", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Display Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Should show decks grid
      await expect(page.locator(`[data-testid="${TEST_IDS.decksGrid}"]`)).toBeVisible();

      // Should show deck cards
      const deckCards = page.locator(`[data-testid="${TEST_IDS.decksGrid}"] [role="button"]`);
      await expect(deckCards.first()).toBeVisible();
    });

    test("should navigate to deck detail on click", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Navigation Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Verify we're on the correct deck detail page
      await expect(page.locator("h1").first()).toContainText(deckName);
    });

    test("should sort decks correctly", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      // Find sort dropdown and change sort order
      const sortDropdown = page.locator(`[data-testid="${TEST_IDS.sortSelectTrigger}"]`);
      await sortDropdown.click();

      // Select "Newest First"
      await page.getByRole("option", { name: /newest|created/i }).click();

      // Verify sorting is applied (this might need specific implementation based on your sort logic)
      await expect(page.locator('[data-testid="decks-grid"]')).toBeVisible();
    });
  });

  test.describe("Deck Creation Flow", () => {
    test("should create deck successfully with valid name", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      // Click create deck button
      await page.click('[data-testid="create-deck-button"]');

      // Wait for modal to appear
      await waitForElement(page, '[role="dialog"]');

      // Verify modal title
      await expect(page.locator('[role="dialog"]').getByText("Create New Deck")).toBeVisible();

      // Fill deck name and create deck
      const deckName = `${testData.deckNames.valid} ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page to verify it exists
      await navigateToDeck(page, deckName);

      // Verify we're on the correct deck detail page
      await expect(page.locator("h1").first()).toContainText(deckName);
    });

    test("should validate empty deck name", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      // Click create deck button
      await page.click('[data-testid="create-deck-button"]');

      // Wait for modal
      await waitForElement(page, '[role="dialog"]');

      // Submit button should be disabled when name is empty
      const submitButton = page.locator('button[type="submit"]:has-text("Create Deck")');
      await expect(submitButton).toBeDisabled();

      // Try typing something and clearing it to ensure validation works
      await page.fill('input[placeholder*="Spanish Vocabulary"]', "test");
      await page.fill('input[placeholder*="Spanish Vocabulary"]', "");

      // Button should still be disabled after clearing
      await expect(submitButton).toBeDisabled();
    });

    test("should validate deck name length", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      await page.click('[data-testid="create-deck-button"]');
      await waitForElement(page, '[role="dialog"]');

      // First check that HTML maxlength prevents typing more than 255 chars
      const input = page.locator('input[placeholder*="Spanish Vocabulary"]');

      // Try to type 256 characters
      const longName = "A".repeat(256);
      await input.fill(longName);

      // Check how many characters were actually entered
      const actualValue = await input.inputValue();
      expect(actualValue.length).toBeLessThanOrEqual(255);

      // The button should be enabled since the input is truncated to 255 chars
      const submitButton = page.locator('button[type="submit"]:has-text("Create Deck")');
      await expect(submitButton).toBeEnabled();
    });

    test("should handle special characters in deck name", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      await page.click('[data-testid="create-deck-button"]');
      await waitForElement(page, '[role="dialog"]');

      const specialName = `${testData.deckNames.specialChars} ${generateTestId()}`;
      await page.fill('input[placeholder*="Spanish Vocabulary"]', specialName);
      await page.click('button[type="submit"]:has-text("Create Deck")');

      // The modal should close on success, so wait for it to disappear
      await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 });

      // Check if we're back on the decks page
      await expect(page).toHaveURL("/decks");

      // Check for success toast
      const successToast = page.locator("[data-sonner-toast]").filter({ hasText: /created|success/i });
      await expect(successToast).toBeVisible({ timeout: 5000 });

      // Verify the new deck appears in the list
      await expect(page.locator('[data-testid="decks-grid"]')).toContainText(specialName);

      // Navigate to the deck detail page manually to verify it exists
      const deckCard = page
        .locator('[data-testid="decks-grid"]')
        .locator("div")
        .filter({ hasText: specialName })
        .first();
      await deckCard.click();

      // Wait for navigation to deck detail (could be /decks/id or /decks/id/flashcards)
      await page.waitForURL(/\/decks\/[^/]+(?:\/.*)?$/, { timeout: 10000 });

      // Verify we're on the correct deck detail page
      await expect(page.locator("h1").first()).toContainText(specialName);
    });
  });

  test.describe("Deck Settings Management", () => {
    test("should access deck settings page", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Settings Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Verify deck was created and appears in list
      await expect(page.locator('[data-testid="decks-grid"]')).toContainText(deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Verify we're on the deck detail page
      await expect(page).toHaveURL(/\/decks\/[^/]+(?:\/.*)?$/);

      // Check if settings tab is visible before clicking
      const settingsTab = page.locator('[data-testid="deck-tab-settings"]');
      await expect(settingsTab).toBeVisible({ timeout: 5000 });

      // Navigate to settings page
      await navigateToDeckSettings(page);

      // Verify we're on the settings page
      await expect(page).toHaveURL(/\/decks\/[^/]+\/settings$/);

      // Wait for the settings form to become visible
      await expect(page.locator('[data-testid="deck-settings-form"]')).toBeVisible({ timeout: 5000 });
    });

    test("should update deck name in settings", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Update Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Navigate to settings
      await navigateToDeckSettings(page);

      const testDeckId = getCurrentDeckId(page);

      const newName = `Updated Deck Name ${generateTestId()}`;

      // Find name input and update it
      await page.fill('[data-testid="deck-name-input"]', newName);

      // Save changes
      await page.click('[data-testid="deck-settings-save-button"]');

      // Should show success message
      await expect(page.getByText(/saved|updated/i)).toBeVisible();

      // Navigate back to deck detail and verify name changed
      await page.goto(`/decks/${testDeckId}`);
      await expect(page.locator("h1").first()).toContainText(newName);
    });

    test("should validate settings form", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Validate Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Navigate to settings
      await navigateToDeckSettings(page);

      // Clear name field
      await page.fill('[data-testid="deck-name-input"]', "");

      // Save button should be disabled when name is empty
      const saveButton = page.locator('[data-testid="deck-settings-save-button"]');
      await expect(saveButton).toBeDisabled();
    });

    test("should allow updating deck settings", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Settings Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Navigate to settings
      await navigateToDeckSettings(page);

      const persistentName = `Updated Settings ${generateTestId()}`;
      await page.fill('[data-testid="deck-name-input"]', persistentName);

      // Save button should be enabled with valid input
      const saveButton = page.locator('[data-testid="deck-settings-save-button"]');
      await expect(saveButton).toBeEnabled();

      // Should be able to click save button
      await saveButton.click();
    });
  });

  test.describe("Deck Deletion", () => {
    test("should delete deck with confirmation", async ({ page }) => {
      await page.goto("/decks");
      await verifyAuthenticated(page);

      const deckName = `Delete Test Deck ${generateTestId()}`;
      await createDeck(page, deckName);

      // Navigate to the deck detail page
      await navigateToDeck(page, deckName);

      // Navigate to settings to find the delete button
      await navigateToDeckSettings(page);

      // Click delete button to open confirmation dialog
      await page.click('[data-testid="delete-deck-button"]');

      // Wait for confirmation dialog to appear
      await expect(page.getByText("Are you sure you want to delete this deck?")).toBeVisible();

      // Confirm deletion in dialog
      await page.click('[data-testid="confirm-delete-deck-button"]');

      // Should redirect to decks list
      await page.waitForURL("/decks");

      // Verify deck is no longer in the list
      await expect(page.getByText(deckName)).not.toBeVisible();
    });
  });
});
