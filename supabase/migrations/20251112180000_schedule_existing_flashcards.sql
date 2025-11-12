-- Schedule existing flashcards for immediate review
-- This migration updates flashcards that have null next_review_at to schedule them for immediate review

UPDATE flashcards
SET next_review_at = NOW()::timestamptz
WHERE next_review_at IS NULL;

-- Add a comment to document this change
COMMENT ON COLUMN flashcards.next_review_at IS 'Timestamp when the flashcard is next due for review. Set to current time for new cards to enable immediate review.';
