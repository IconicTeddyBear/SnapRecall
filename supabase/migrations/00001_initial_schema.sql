-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create decks table
CREATE TABLE decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cards table
CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 0,
    next_review_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Decks Policies
CREATE POLICY "Users can create their own decks" 
ON decks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own decks" 
ON decks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own decks" 
ON decks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decks" 
ON decks FOR DELETE 
USING (auth.uid() = user_id);

-- Cards Policies
CREATE POLICY "Users can create their own cards" 
ON cards FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cards" 
ON cards FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards" 
ON cards FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards" 
ON cards FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance and realtime subscriptions
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_deck_id ON cards(deck_id);

-- Enable Realtime for the cards table
ALTER PUBLICATION supabase_realtime ADD TABLE cards;
