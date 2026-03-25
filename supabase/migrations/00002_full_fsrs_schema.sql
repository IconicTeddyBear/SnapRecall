-- Migration 00002: Extend schema to store full FSRS card data and review logs
-- Run this after 00001_initial_schema.sql

-- ─── Cards table: add all FSRS + content fields ────────────────────────────

-- Make deck_id nullable. The app uses a tag-based deck system, not a
-- strict FK hierarchy, so cards don't always belong to a single deck.
ALTER TABLE cards ALTER COLUMN deck_id DROP NOT NULL;

ALTER TABLE cards
  -- Rich content
  ADD COLUMN IF NOT EXISTS back_short          TEXT,
  ADD COLUMN IF NOT EXISTS category            TEXT,
  ADD COLUMN IF NOT EXISTS tags                TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS front_image         TEXT,
  ADD COLUMN IF NOT EXISTS back_image          TEXT,
  ADD COLUMN IF NOT EXISTS front_translation   TEXT,
  ADD COLUMN IF NOT EXISTS back_translation    TEXT,

  -- FSRS scheduling fields
  ADD COLUMN IF NOT EXISTS stability           FLOAT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty_fsrs     FLOAT   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS elapsed_days        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scheduled_days      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reps                INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lapses              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS state               INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review         BIGINT,
  ADD COLUMN IF NOT EXISTS due                 BIGINT  NOT NULL DEFAULT 0,

  -- Legacy SM-2 fields (kept for migration compatibility)
  ADD COLUMN IF NOT EXISTS repetition          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interval_days       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS easiness            FLOAT   NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS difficulty_score    INTEGER NOT NULL DEFAULT 3,

  -- Timestamps as milliseconds (the app's native format)
  ADD COLUMN IF NOT EXISTS created_at_ms       BIGINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at          BIGINT  NOT NULL DEFAULT 0;

-- ─── Decks table: add tag array and ms timestamp ───────────────────────────

ALTER TABLE decks
  ADD COLUMN IF NOT EXISTS tags                TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at_ms       BIGINT  NOT NULL DEFAULT 0;

-- ─── Review logs table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_logs (
  id             TEXT    PRIMARY KEY,
  user_id        UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id        TEXT    NOT NULL,
  quality        INTEGER NOT NULL,
  elapsed_days   INTEGER NOT NULL DEFAULT 0,
  scheduled_days INTEGER NOT NULL DEFAULT 0,
  review         BIGINT  NOT NULL,
  state          INTEGER NOT NULL DEFAULT 0,
  timestamp      BIGINT  NOT NULL
);

ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own review logs"
  ON review_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own review logs"
  ON review_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own review logs"
  ON review_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cards_category    ON cards(category);
CREATE INDEX IF NOT EXISTS idx_cards_due         ON cards(due);
CREATE INDEX IF NOT EXISTS idx_review_logs_user  ON review_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_card  ON review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_ts    ON review_logs(timestamp);

-- ─── Enable Realtime ───────────────────────────────────────────────────────

-- decks and review_logs were not in the initial publication
ALTER PUBLICATION supabase_realtime ADD TABLE decks;
ALTER PUBLICATION supabase_realtime ADD TABLE review_logs;
