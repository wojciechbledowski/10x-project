import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventService } from "../eventService";
import { createMockSupabaseClient, createMockQueryResult, resetAllMocks, type MockSupabaseClient } from "./test-utils";

describe("EventService", () => {
  let mockSupabase: MockSupabaseClient;
  let eventService: EventService;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    eventService = new EventService(
      mockSupabase as unknown as import("../../../db/supabase.client").SupabaseServerClient
    );
    resetAllMocks(mockSupabase);
  });

  describe("createEvent", () => {
    it("should create audit event successfully", async () => {
      // Arrange
      const eventParams = {
        action: "delete" as const,
        flashcardId: "card-123",
        source: "manual" as const,
        userId: "user-123",
      };

      const mockQuery = {
        insert: vi.fn().mockResolvedValue(createMockQueryResult(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await eventService.createEvent(eventParams);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith("events");
      expect(mockQuery.insert).toHaveBeenCalledWith({
        action: "delete",
        flashcard_id: "card-123",
        source: "manual",
        user_id: "user-123",
      });
    });

    it("should throw error when database insert fails", async () => {
      // Arrange
      const eventParams = {
        action: "delete" as const,
        flashcardId: "card-123",
        source: "manual" as const,
        userId: "user-123",
      };

      const mockError = new Error("Database connection failed");

      const mockQuery = {
        insert: vi.fn().mockResolvedValue(createMockQueryResult(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.createEvent(eventParams)).rejects.toThrow(mockError);
    });
  });
});
