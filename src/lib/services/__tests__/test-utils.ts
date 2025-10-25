import { vi } from "vitest";

// Minimal Supabase client interface for testing - only includes methods we mock
export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
}

// Mock Supabase client for testing - simplified for test purposes
export const createMockSupabaseClient = (): MockSupabaseClient => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
});

// Helper to create mock query result
export const createMockQueryResult = <T>(data: T, error: unknown = null, count?: number | null) => ({
  data,
  error,
  count: count !== undefined ? count : Array.isArray(data) ? data.length : null,
});

// Helper to create mock deck data
export const createMockDeck = (overrides = {}) => ({
  id: "deck-123",
  name: "Test Deck",
  created_at: "2025-01-01T00:00:00.000Z",
  user_id: "user-123",
  deleted_at: null,
  ...overrides,
});

// Helper to create mock flashcard data
export const createMockFlashcard = (overrides = {}) => ({
  id: "card-123",
  front: "Front content",
  back: "Back content",
  deck_id: "deck-123",
  user_id: "user-123",
  source: "manual" as const,
  ease_factor: 2.5,
  interval_days: 1,
  repetition: 0,
  next_review_at: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
  deleted_at: null,
  ...overrides,
});

// Helper to reset all mocks
export const resetAllMocks = (mockClient: MockSupabaseClient) => {
  Object.values(mockClient).forEach((mock) => {
    if (typeof mock === "function" && "mockClear" in mock) {
      mock.mockClear();
    }
  });
};
