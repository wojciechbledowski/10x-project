import { describe, it, expect, beforeEach, vi } from "vitest";
import { ReviewService } from "../reviewService";
import {
  createMockSupabaseClient,
  resetAllMocks,
  createMockFlashcard,
  createMockReview,
  type MockSupabaseClient,
} from "./test-utils";

describe("ReviewService", () => {
  let mockSupabase: MockSupabaseClient;
  let reviewService: ReviewService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    reviewService = new ReviewService(
      mockSupabase as unknown as import("../../../db/supabase.client").SupabaseServerClient
    );
    resetAllMocks(mockSupabase);
  });

  describe("constructor", () => {
    it("should create a ReviewService instance", () => {
      expect(reviewService).toBeInstanceOf(ReviewService);
    });
  });

  describe("getReviewQueue", () => {
    it("should be a function", () => {
      expect(typeof reviewService.getReviewQueue).toBe("function");
    });

    it("should accept a userId parameter", async () => {
      const userId = "user-123";

      // Mock the FlashcardService.listUserFlashcards call to avoid database dependency
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Should not throw when called with valid userId
      await expect(reviewService.getReviewQueue(userId)).resolves.not.toThrow();
    });

    describe("submitReview", () => {
      const userId = "user-123";
      const flashcardId = "card-123";
      const validRequest = {
        flashcardId,
        quality: 4,
        latencyMs: 2500,
      };

      it("should submit review successfully with valid data", async () => {
        // Mock flashcard lookup
        const mockFlashcard = createMockFlashcard({
          id: flashcardId,
          user_id: userId,
          ease_factor: 2.5,
          interval_days: 1,
          repetition: 0,
        });

        const mockReview = createMockReview({
          flashcard_id: flashcardId,
          user_id: userId,
          quality: 4,
          latency_ms: 2500,
        });

        // Mock the database calls
        mockSupabase.from
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockFlashcard, error: null }),
          })
          .mockReturnValueOnce({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockReview, error: null }),
          })
          .mockReturnValueOnce({
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          });

        const result = await reviewService.submitReview(userId, validRequest);

        expect(result).toEqual({
          id: mockReview.id,
          flashcardId,
          quality: 4,
          createdAt: mockReview.created_at,
          flashcard: {
            id: flashcardId,
            easeFactor: 2.5, // Updated based on SM-2 algorithm (quality 4)
            intervalDays: 3, // ceil(1 * 2.5) = 3
            repetition: 1,
            nextReviewAt: expect.any(String),
          },
        });
      });

      it("should throw FLASHCARD_NOT_FOUND when flashcard does not exist", async () => {
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        });

        await expect(reviewService.submitReview(userId, validRequest)).rejects.toThrow("FLASHCARD_NOT_FOUND");
      });

      it("should throw FLASHCARD_NOT_FOUND when flashcard belongs to different user", async () => {
        // When flashcard doesn't exist for the user, Supabase returns null
        mockSupabase.from.mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

        await expect(reviewService.submitReview(userId, validRequest)).rejects.toThrow("FLASHCARD_NOT_FOUND");
      });

      it("should throw REVIEW_SUBMISSION_FAILED when review insertion fails", async () => {
        const mockFlashcard = createMockFlashcard({
          id: flashcardId,
          user_id: userId,
        });

        mockSupabase.from
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockFlashcard, error: null }),
          })
          .mockReturnValueOnce({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
          });

        await expect(reviewService.submitReview(userId, validRequest)).rejects.toThrow("REVIEW_SUBMISSION_FAILED");
      });

      it("should handle review submission without latencyMs", async () => {
        const requestWithoutLatency = {
          flashcardId,
          quality: 3,
        };

        const mockFlashcard = createMockFlashcard({
          id: flashcardId,
          user_id: userId,
          ease_factor: 2.5,
          interval_days: 6,
          repetition: 2,
        });

        const mockReview = createMockReview({
          flashcard_id: flashcardId,
          user_id: userId,
          quality: 3,
          latency_ms: null,
        });

        mockSupabase.from
          .mockReturnValueOnce({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockFlashcard, error: null }),
          })
          .mockReturnValueOnce({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockReview, error: null }),
          })
          .mockReturnValueOnce({
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          });

        const result = await reviewService.submitReview(userId, requestWithoutLatency);

        expect(result.quality).toBe(3);
        expect(result.flashcard.repetition).toBe(3);
      });
    });

    describe("SM-2 Algorithm (calculateSM2Scheduling)", () => {
      // Type-safe way to access private method for testing
      interface TestFlashcard {
        ease_factor: number;
        interval_days: number;
        repetition: number;
      }

      const calculateSM2Scheduling = (flashcard: TestFlashcard, quality: number) =>
        (
          reviewService as unknown as {
            calculateSM2Scheduling: (
              flashcard: TestFlashcard,
              quality: number
            ) => { easeFactor: number; intervalDays: number; repetition: number; nextReviewAt: string | null };
          }
        ).calculateSM2Scheduling(flashcard, quality);

      it("should handle quality 0 (failed recall) - reset to 1 day interval", () => {
        const flashcard = {
          ease_factor: 2.5,
          interval_days: 10,
          repetition: 3,
        };

        const result = calculateSM2Scheduling(flashcard, 0);

        expect(result.intervalDays).toBe(1);
        expect(result.repetition).toBe(0);
        expect(result.easeFactor).toBe(1.7); // 2.5 + (0.1 - 5 * (0.08 + 5 * 0.02)) = 1.7
        expect(result.nextReviewAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      });

      it("should handle quality 1 (failed recall) - reset to 1 day interval", () => {
        const flashcard = {
          ease_factor: 2.8,
          interval_days: 15,
          repetition: 4,
        };

        const result = calculateSM2Scheduling(flashcard, 1);

        expect(result.intervalDays).toBe(1);
        expect(result.repetition).toBe(0);
        expect(result.easeFactor).toBe(2.26); // 2.8 + (0.1 - 4 * (0.08 + 4 * 0.02)) = 2.26
      });

      it("should handle quality 2 (failed recall) - reset to 1 day interval", () => {
        const flashcard = {
          ease_factor: 3.0,
          interval_days: 20,
          repetition: 5,
        };

        const result = calculateSM2Scheduling(flashcard, 2);

        expect(result.intervalDays).toBe(1);
        expect(result.repetition).toBe(0);
        expect(result.easeFactor).toBe(2.68); // 3.0 + (0.1 - 3 * (0.08 + 3 * 0.02)) = 2.68
      });

      it("should handle quality 3 (hard recall) - minimal interval increase", () => {
        const flashcard = {
          ease_factor: 2.5,
          interval_days: 6,
          repetition: 2,
        };

        const result = calculateSM2Scheduling(flashcard, 3);

        expect(result.intervalDays).toBe(8); // ceil(6 * 1.2) = 8
        expect(result.repetition).toBe(3);
        expect(result.easeFactor).toBe(2.36); // 2.5 + (0.1 - 2 * (0.08 + 2 * 0.02)) = 2.36
      });

      it("should handle quality 4 (good recall) - standard interval increase", () => {
        const flashcard = {
          ease_factor: 2.5,
          interval_days: 6,
          repetition: 2,
        };

        const result = calculateSM2Scheduling(flashcard, 4);

        expect(result.intervalDays).toBe(15); // ceil(6 * 2.5) = 15
        expect(result.repetition).toBe(3);
        expect(result.easeFactor).toBe(2.5); // 2.5 + (0.1 - (5-4) * (0.08 + (5-4) * 0.02)) = 2.5
      });

      it("should handle quality 5 (perfect recall) - maximum interval increase", () => {
        const flashcard = {
          ease_factor: 2.5,
          interval_days: 6,
          repetition: 2,
        };

        const result = calculateSM2Scheduling(flashcard, 5);

        expect(result.intervalDays).toBe(16); // ceil(6 * 2.6) = 16
        expect(result.repetition).toBe(3);
        expect(result.easeFactor).toBe(2.6); // 2.5 + (0.1 - 0 * (0.08 + 0 * 0.02)) = 2.6
      });

      it("should clamp ease factor to minimum 1.3", () => {
        const flashcard = {
          ease_factor: 1.3,
          interval_days: 1,
          repetition: 0,
        };

        const result = calculateSM2Scheduling(flashcard, 0);

        expect(result.easeFactor).toBe(1.3); // Should not go below 1.3
      });

      it("should handle fractional intervals correctly (round up)", () => {
        const flashcard = {
          ease_factor: 2.3,
          interval_days: 7,
          repetition: 3,
        };

        const result = calculateSM2Scheduling(flashcard, 4);

        expect(result.intervalDays).toBe(17); // ceil(7 * 2.3) = ceil(16.1) = 17
      });

      it("should handle first successful review after failures", () => {
        const flashcard = {
          ease_factor: 2.5,
          interval_days: 1,
          repetition: 0,
        };

        const result = calculateSM2Scheduling(flashcard, 4);

        expect(result.intervalDays).toBe(3); // ceil(1 * 2.5) = 3
        expect(result.repetition).toBe(1);
      });
    });
  });
});
