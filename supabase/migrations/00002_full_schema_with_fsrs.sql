-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── DECKS ────────────────────────────────────────────────────────────────────
CREATE TABLE decks (
    id          TEXT PRIMARY KEY,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name        TEXT NOT NULL,
    tags        TEXT[] NOT NULL DEFAULT '{}',
    created_at  BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own decks" ON decks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_decks_user_id ON decks(user_id);

-- ─── CARDS ────────────────────────────────────────────────────────────────────
CREATE TABLE cards (
    id                  TEXT PRIMARY KEY,
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    front               TEXT NOT NULL DEFAULT '',
    back                TEXT NOT NULL DEFAULT '',
    back_short          TEXT,
    category            TEXT,
    tags                TEXT[] NOT NULL DEFAULT '{}',
    front_image         TEXT,
    back_image          TEXT,
    front_translation   TEXT,
    back_translation    TEXT,
    -- FSRS fields
    due                 BIGINT NOT NULL DEFAULT 0,
    stability           DOUBLE PRECISION NOT NULL DEFAULT 0,
    difficulty          DOUBLE PRECISION NOT NULL DEFAULT 0,
    elapsed_days        INTEGER NOT NULL DEFAULT 0,
    scheduled_days      INTEGER NOT NULL DEFAULT 0,
    reps                INTEGER NOT NULL DEFAULT 0,
    lapses              INTEGER NOT NULL DEFAULT 0,
    state               INTEGER NOT NULL DEFAULT 0,
    last_review         BIGINT,
    -- Legacy SM-2 fields (kept for migration compatibility)
    next_review_date    BIGINT,
    difficulty_score    INTEGER,
    repetition          INTEGER NOT NULL DEFAULT 0,
    interval_days       INTEGER NOT NULL DEFAULT 0,
    easiness            DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    -- Timestamps
    created_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    updated_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own cards" ON cards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_due ON cards(user_id, due);
CREATE INDEX idx_cards_tags ON cards USING GIN(tags);

-- ─── REVIEW LOGS ──────────────────────────────────────────────────────────────
CREATE TABLE review_logs (
    id              TEXT PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_id         TEXT NOT NULL,
    quality         INTEGER NOT NULL,
    elapsed_days    INTEGER NOT NULL DEFAULT 0,
    scheduled_days  INTEGER NOT NULL DEFAULT 0,
    review          BIGINT NOT NULL,
    state           INTEGER NOT NULL DEFAULT 0,
    timestamp       BIGINT NOT NULL
);

ALTER TABLE review_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own logs" ON review_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_review_logs_user_id ON review_logs(user_id);
CREATE INDEX idx_review_logs_timestamp ON review_logs(user_id, timestamp);
CREATE INDEX idx_review_logs_card_id ON review_logs(card_id);

-- ─── USER SETTINGS ────────────────────────────────────────────────────────────
CREATE TABLE user_settings (
    user_id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    target_retention    DOUBLE PRECISION NOT NULL DEFAULT 0.90,
    auto_translate      BOOLEAN NOT NULL DEFAULT false,
    target_language     TEXT NOT NULL DEFAULT 'English',
    answer_display_mode TEXT NOT NULL DEFAULT 'long',
    updated_at          BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
ALTER PUBLICATION supabase_realtime ADD TABLE decks;
