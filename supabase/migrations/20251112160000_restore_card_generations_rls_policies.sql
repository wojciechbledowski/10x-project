-- -----------------------------------------------------------------------------
-- migration name: 20251112160000_restore_card_generations_rls_policies.sql
-- purpose       : restore row-level security (rls) policies for card_generations table
-- description   :
--   * card_generations is a junction table between flashcards and ai_generations
--   * allow select if user owns the flashcard
--   * service_role has full access
--   * insert/update/delete handled via triggers and foreign keys
-- -----------------------------------------------------------------------------

-- Drop existing card_generations policies if they exist
drop policy if exists card_generations_owner_select on public.card_generations;
drop policy if exists card_generations_service_role on public.card_generations;

-- Allow select if user owns the flashcard (read access)
create policy card_generations_owner_select on public.card_generations
  for select using (
    exists (
      select 1 from public.flashcards f where f.id = flashcard_id and f.user_id = auth.uid()
    )
  );

-- Service role has full access (for background job processing)
create policy card_generations_service_role on public.card_generations
  for all using (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- end migration
-- -----------------------------------------------------------------------------
