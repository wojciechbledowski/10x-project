import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Test utilities for E2E tests
 * Provides helper functions for setup, teardown, and common test operations
 */

// Test ID selectors for common elements
export const TEST_IDS = {
  // Deck management
  decksGrid: "decks-grid",
  createDeckButton: "create-deck-button",
  deckCard: (id: string) => `deck-card-${id}`,

  // Create deck modal
  createDeckModal: "create-deck-modal",
  createDeckForm: "create-deck-form",
  deckNameInput: "deck-name-input",
  deckNameError: "deck-name-error",
  submitCreateDeck: "submit-create-deck",
  cancelCreateDeck: "cancel-create-deck",

  // Settings
  deckSettingsForm: "deck-settings-form",
  deckSettingsSaveButton: "deck-settings-save-button",

  // Delete dialog
  deleteDeckButton: "delete-deck-button",
  confirmDeleteDeckButton: "confirm-delete-deck-button",

  // Empty state
  emptyState: "empty-state",
  emptyStateTitle: "empty-state-title",
  emptyStateMessage: "empty-state-message",
  emptyStateIcon: "empty-state-icon",

  // Navigation
  sortSelectTrigger: "sort-select-trigger",
} as const;

// Supabase client for direct database operations in tests
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for test teardown");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Clean up test data created during E2E tests
 * This function removes decks and flashcards created by the test user
 */
export async function cleanupTestData() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set, skipping test data cleanup");
      return;
    }

    const supabase = getSupabaseClient();
    const testUserId = process.env.E2E_USERNAME_ID;

    if (!testUserId) {
      console.warn("E2E_USERNAME_ID not set, skipping test data cleanup");
      return;
    }

    // Get deck IDs first
    const deckIds = await getTestDeckIds();

    if (deckIds.length === 0) {
      console.log("No test decks to cleanup");
      return;
    }

    // Delete flashcards first (due to foreign key constraints)
    const { error: flashcardsError } = await supabase.from("flashcards").delete().in("deck_id", deckIds);

    if (flashcardsError) {
      console.warn("Failed to cleanup flashcards:", flashcardsError);
    }

    // Delete decks created by test user
    const { error: decksError } = await supabase.from("decks").delete().eq("user_id", testUserId);

    if (decksError) {
      console.warn("Failed to cleanup decks:", decksError);
    }

    console.log("Test data cleanup completed");
  } catch (error) {
    console.error("Error during test data cleanup:", error);
  }
}

/**
 * Get deck IDs for the test user (helper for cleanup)
 */
async function getTestDeckIds(): Promise<string[]> {
  try {
    const supabase = getSupabaseClient();
    const testUserId = process.env.E2E_USERNAME_ID;

    if (!testUserId) return [];

    const { data, error } = await supabase.from("decks").select("id").eq("user_id", testUserId);

    if (error) {
      console.warn("Failed to get test deck IDs:", error);
      return [];
    }

    return data?.map((deck) => deck.id) || [];
  } catch (error) {
    console.error("Error getting test deck IDs:", error);
    return [];
  }
}

/**
 * Wait for a specific element to be visible with timeout
 */
export async function waitForElement(page: Page, selector: string, timeout = 5000) {
  await page.waitForSelector(selector, { state: "visible", timeout });
}

/**
 * Generate a unique test identifier
 */
export function generateTestId(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for page load and network idle
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

/**
 * Common test data for deck creation
 */
export const testData = {
  deckNames: {
    valid: "Test Deck",
    long: "A".repeat(255), // Max length
    empty: "",
    specialChars: "Test Deck with Special Chars: @#$%^&*()",
  },
  flashcard: {
    front: "What is the capital of France?",
    back: "Paris",
  },
};

/**
 * Viewport size constants for consistent testing
 */
export const VIEWPORTS = {
  desktop: { width: 1024, height: 768 },
  mobile: { width: 375, height: 667 }, // iPhone SE size
} as const;

/**
 * Verify user is authenticated using storage state (no redirect check needed)
 */
export async function verifyAuthenticatedState(page: Page) {
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

/**
 * Setup navigation test with viewport and authentication
 */
export async function setupNavigationTest(page: Page, viewport: "desktop" | "mobile" = "desktop") {
  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.goto("/decks");
  await verifyAuthenticatedState(page);
}

/**
 * Get navigation locators
 */
export function getNavigationLocators(page: Page) {
  return {
    desktopNav: page.locator('nav[aria-label="Main navigation"]'),
    mobileNav: page.locator('nav[aria-label="Mobile navigation"]'),
    header: page.locator("header"),
    themeButton: page.locator('[data-testid="theme-toggle-button"]'),
    languageButton: page.locator('[data-testid="language-switcher-button"]'),
    userMenu: page.locator('button[aria-label="User menu"]'),
  };
}

/**
 * Verify user is authenticated by checking current URL and presence of user-specific elements
 */
export async function verifyAuthenticated(page: Page) {
  // Check if we're not on login/register pages
  const currentUrl = page.url();
  if (currentUrl.includes("/auth/login") || currentUrl.includes("/auth/register")) {
    throw new Error("User is not authenticated - redirected to login page");
  }

  // Try to access a protected page
  await page.goto("/decks");
  await page.waitForURL("/decks");
}

/**
 * Ensure no modals are open by pressing Escape
 */
export async function closeAnyOpenModals(page: Page) {
  // Multiple attempts to close modals
  for (let i = 0; i < 3; i++) {
    try {
      // Press Escape to close any open dialogs/modals
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      // Check for modal overlays and click them to close
      const overlays = page.locator('[data-slot="dialog-overlay"]');
      const overlayCount = await overlays.count();
      if (overlayCount > 0) {
        // Click the overlay to close the modal
        await overlays.first().click({ force: true });
        await page.waitForTimeout(300);
      }

      // Check if any dialogs are still open
      const openDialogs = page.locator(
        '[role="dialog"][data-state="open"], [data-state="open"][data-slot="dialog-overlay"]'
      );
      const count = await openDialogs.count();
      if (count === 0) {
        break; // No more open dialogs
      }
    } catch {
      // Continue trying
    }
  }

  // Final check - wait for any remaining animations
  await page.waitForTimeout(500);
}

/**
 * Create a new deck with the given name
 */
export async function createDeck(page: Page, deckName: string) {
  // Ensure clean state before creating deck
  await closeAnyOpenModals(page);

  // Retry clicking the create button if modal overlays are blocking
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      // Click the first visible create deck button (avoids issues with multiple buttons)
      const createButton = page.locator('[data-testid="create-deck-button"]').first();
      await createButton.click({ timeout: 5000 });
      break; // Success, exit retry loop
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw error;
      }
      // Try to close any blocking modals and retry
      await closeAnyOpenModals(page);
      await page.waitForTimeout(500);
    }
  }

  await waitForElement(page, '[role="dialog"]');

  await page.fill('input[placeholder*="Spanish Vocabulary"]', deckName);
  await page.click('button[type="submit"]:has-text("Create Deck")');

  // Wait for modal to close
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 });

  // Verify we're back on decks page
  await expect(page).toHaveURL("/decks");

  // Check for success toast (optional - some toasts may be very quick)
  try {
    const successToast = page.locator("[data-sonner-toast]").filter({ hasText: /created|success|deck/i });
    await expect(successToast).toBeVisible({ timeout: 2000 });
  } catch {
    // Toast might have disappeared or not shown - this is not critical for the test
    console.log("Success toast not detected, continuing with test");
  }

  // Verify deck appears in list
  await expect(page.locator('[data-testid="decks-grid"]')).toContainText(deckName);
}

/**
 * Navigate to a deck's detail page by clicking on it
 */
export async function navigateToDeck(page: Page, deckName: string) {
  const deckCard = page.locator('[data-testid="decks-grid"]').locator("div").filter({ hasText: deckName }).first();
  await deckCard.click();

  // Wait for navigation to deck detail
  await page.waitForURL(/\/decks\/[^/]+(?:\/.*)?$/, { timeout: 10000 });
}

/**
 * Navigate to deck settings page
 */
export async function navigateToDeckSettings(page: Page) {
  // Use test ID for more reliable selection, fallback to text if needed
  try {
    await page.click('[data-testid="deck-tab-settings"]');
  } catch {
    // Fallback to text selector if test ID is not available
    await page.click('a:has-text("Settings")');
  }
  await page.waitForURL(/\/decks\/[^/]+\/settings$/, { timeout: 10000 });
}

/**
 * Get the current deck ID from the URL
 */
export function getCurrentDeckId(page: Page): string {
  const urlParts = page.url().split("/");
  return urlParts[urlParts.length - 2]; // Get the ID from the URL
}
