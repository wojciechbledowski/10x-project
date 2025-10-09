# Database Schema – AI Flashcard Generator

## 1. Tables

### 1.1 decks

| Column     | Type        | Constraints                   | Description        |
| ---------- | ----------- | ----------------------------- | ------------------ |
| id         | uuid        | PK DEFAULT gen_random_uuid()  | Deck identifier    |
| user_id    | uuid        | NOT NULL, FK → auth.users(id) | Owner              |
| name       | text        | NOT NULL                      | Deck title         |
| created_at | timestamptz | NOT NULL DEFAULT now()        | UTC timestamp      |
| deleted_at | timestamptz | NULLABLE                      | Soft-delete marker |

### 1.2 flashcards

| Column         | Type         | Constraints                                       | Description            |
| -------------- | ------------ | ------------------------------------------------- | ---------------------- |
| id             | uuid         | PK DEFAULT gen_random_uuid()                      | Card identifier        |
| user_id        | uuid         | NOT NULL, FK → auth.users(id)                     | Owner                  |
| deck_id        | uuid         | FK → decks(id) ON DELETE SET NULL                 | Optional deck          |
| front          | text         | NOT NULL CHECK (length(front) <= 1000)            | Front face             |
| back           | text         | NOT NULL CHECK (length(back) <= 1000)             | Back face              |
| source         | source_enum  | NOT NULL DEFAULT 'MANUAL'                         | Card origin            |
| ease_factor    | numeric(4,2) | NOT NULL DEFAULT 2.50 CHECK (ease_factor >= 1.30) | SM-2 EF                |
| interval_days  | integer      | NOT NULL DEFAULT 0 CHECK (interval_days >= 0)     | Days until next review |
| repetition     | integer      | NOT NULL DEFAULT 0 CHECK (repetition >= 0)        | SM-2 reps counter      |
| next_review_at | timestamptz  | NULLABLE                                          | Scheduled review       |
| created_at     | timestamptz  | NOT NULL DEFAULT now()                            | Creation time          |
| updated_at     | timestamptz  | NOT NULL DEFAULT now()                            | Last update            |
| deleted_at     | timestamptz  | NULLABLE                                          | Soft-delete marker     |

### 1.3 ai_generations

| Column              | Type         | Constraints                                              | Description          |
| ------------------- | ------------ | -------------------------------------------------------- | -------------------- |
| id                  | uuid         | PK DEFAULT gen_random_uuid()                             | Generation id        |
| user_id             | uuid         | NOT NULL, FK → auth.users(id)                            | Requester            |
| deck_id             | uuid         | FK → decks(id) ON DELETE SET NULL                        | Context deck         |
| generation_batch_id | uuid         | FK → generation_batches(id)                              | Batch grouping       |
| status              | text         | NOT NULL CHECK (status IN ('PENDING','SUCCESS','ERROR')) | Outcome              |
| model_name          | text         | NOT NULL                                                 | e.g. gpt-4o          |
| model_version       | text         | NULLABLE                                                 | Provider version     |
| temperature         | numeric(3,2) | NULLABLE                                                 | Sampling param       |
| top_p               | numeric(3,2) | NULLABLE                                                 | Sampling param       |
| prompt_tokens       | integer      | NULLABLE                                                 | Token usage          |
| completion_tokens   | integer      | NULLABLE                                                 | Token usage          |
| config              | jsonb        | NOT NULL DEFAULT '{}'::jsonb                             | Raw provider payload |
| error_message       | text         | NULLABLE                                                 | Failure reason       |
| created_at          | timestamptz  | NOT NULL DEFAULT now()                                   | Requested            |

### 1.4 generation_batches

| Column     | Type        | Constraints                   | Description      |
| ---------- | ----------- | ----------------------------- | ---------------- |
| id         | uuid        | PK DEFAULT gen_random_uuid()  | Batch identifier |
| user_id    | uuid        | NOT NULL, FK → auth.users(id) | Owner            |
| created_at | timestamptz | NOT NULL DEFAULT now()        | Trigger time     |

### 1.5 card_generations (junction)

| Column        | Type | Constraints                                   | Description |
| ------------- | ---- | --------------------------------------------- | ----------- |
| flashcard_id  | uuid | PK, FK → flashcards(id) ON DELETE CASCADE     | Card        |
| generation_id | uuid | PK, FK → ai_generations(id) ON DELETE CASCADE | Generation  |

### 1.6 reviews (partitioned monthly)

| Column       | Type        | Constraints                                     | Description    |
| ------------ | ----------- | ----------------------------------------------- | -------------- |
| id           | uuid        | PK DEFAULT gen_random_uuid()                    | Review id      |
| user_id      | uuid        | NOT NULL, FK → auth.users(id)                   | Reviewer       |
| flashcard_id | uuid        | NOT NULL, FK → flashcards(id) ON DELETE CASCADE | Card           |
| quality      | smallint    | NOT NULL CHECK (quality BETWEEN 0 AND 5)        | SM-2 quality   |
| latency_ms   | integer     | NULLABLE                                        | Client latency |
| created_at   | timestamptz | NOT NULL DEFAULT now()                          | Review time    |

### 1.7 events (audit – partitioned monthly)

| Column       | Type        | Constraints                                           | Description             |
| ------------ | ----------- | ----------------------------------------------------- | ----------------------- |
| id           | bigserial   | PK                                                    | Seq id                  |
| user_id      | uuid        | NOT NULL                                              | Actor                   |
| flashcard_id | uuid        | NOT NULL                                              | Card                    |
| action       | text        | NOT NULL CHECK (action IN ('ACCEPT','EDIT','DELETE')) | Event type              |
| source       | source_enum | NOT NULL                                              | Origin at time of event |
| created_at   | timestamptz | NOT NULL DEFAULT now()                                | Event time              |

### 1.8 background_jobs

| Column      | Type        | Constraints                                                       | Description           |
| ----------- | ----------- | ----------------------------------------------------------------- | --------------------- |
| id          | uuid        | PK DEFAULT gen_random_uuid()                                      | Job id                |
| job_type    | text        | NOT NULL                                                          | e.g. HARD_DELETE_USER |
| payload     | jsonb       | NOT NULL                                                          | Job data              |
| status      | text        | NOT NULL CHECK (status IN ('QUEUED','RUNNING','SUCCESS','ERROR')) | State                 |
| retry_count | smallint    | NOT NULL DEFAULT 0                                                | Attempts              |
| last_error  | text        | NULLABLE                                                          | Failure info          |
| created_at  | timestamptz | NOT NULL DEFAULT now()                                            | Enqueued              |
| updated_at  | timestamptz | NOT NULL DEFAULT now()                                            | Modified              |

### 1.9 metrics_daily (materialized view)

Aggregates KPI metrics per day; columns: metric_date (date), user_id (uuid), cards_generated int, cards_accepted int, acceptance_rate numeric(5,2), ai_usage_rate numeric(5,2).

---

## 2. Relationships

1. auth.users 1--∞ decks, flashcards, ai_generations, generation_batches, reviews, events, background_jobs
2. decks 1--∞ flashcards; decks 1--∞ ai_generations
3. generation_batches 1--∞ ai_generations
4. flashcards ∞--∞ ai_generations via card_generations
5. flashcards 1--∞ reviews
6. flashcards 1--∞ events

---

## 3. Indexes

- `flashcards_user_next_idx` ON flashcards (user_id, next_review_at) WHERE next_review_at IS NOT NULL
- `flashcards_search_idx` ON flashcards USING GIN (to_tsvector('simple', front || ' ' || back))
- `ai_generations_user_created_idx` ON ai_generations (user_id, created_at DESC)
- `reviews_flashcard_created_idx` ON reviews (flashcard_id, created_at DESC)
- `events_flashcard_created_idx` ON events (flashcard_id, created_at DESC)
- Partitioning: `reviews` and `events` are range-partitioned by `created_at` (monthly). Appropriate child indexes mirror parent indexes.

---

## 4. PostgreSQL Policies (RLS)

Enable RLS on all user-scoped tables.

```sql
-- Example for flashcards
aLTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Policy for owners
CREATE POLICY flashcards_owner_policy
  ON flashcards
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service-role bypass (supabase functional role)
CREATE POLICY flashcards_service_role
  ON flashcards
  FOR ALL
  USING (auth.role() = 'service_role');
```

Replicate similar owner & service_role policies on `decks`, `ai_generations`, `generation_batches`, `reviews`, `events`, `background_jobs`.

---

## 5. Additional Notes

- `source_enum` values: `AI`, `MANUAL`, `AI_EDITED`.
- All timestamps are stored in UTC (`timestamptz`) and truncated to second precision using triggers.
- Soft-deleted rows (`deleted_at IS NOT NULL`) are excluded from default application queries via SQL views or query predicates.
- A background job (`HARD_DELETE_USER`) permanently removes user-scoped rows 24 h after account deletion to satisfy GDPR.
- `reviews` & `events` keep 12 months of data; older partitions are detached & archived.
- Materialized view `metrics_daily` is refreshed nightly via a Supabase Edge Function and used for KPI dashboards.
- UUID generation requires `pgcrypto` extension (`gen_random_uuid()`).
- Check constraints guard SM-2 algorithm integrity.
- Future enhancements: partial unique index on (`user_id`, `front`, `back`) to prevent near-duplicate cards once similarity logic is finalized.
