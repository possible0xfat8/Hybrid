-- ============================================================================
-- HEMI ARCADE - UNIFIED MULTI-GAME DATABASE SCHEMA
-- Game-Specific Tables & Views:
--   1. crazy8_*   -> Crazy 8 / Uno Card Game Tables
--   2. connect4_* -> Connect 4 Game Tables
--   3. arcade_*   -> Global Multi-Game Aggregates & Leaderboard
-- (Chess tables remain: players, game_history, moves, player_stats, etc.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CRAZY 8 TABLES (Prefix: crazy8_)
-- ============================================================================

-- Canonical Player Profiles & Career Stats for Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_profiles (
  id TEXT PRIMARY KEY,                                      -- e.g. 'wallet_0x1234...'
  address TEXT UNIQUE,                                      -- Lowercase Ethereum wallet address
  tag TEXT NOT NULL,                                        -- e.g. 'Chad#4829'
  name TEXT NOT NULL,                                       -- Player display name
  avatar TEXT NOT NULL DEFAULT '🦊',                        -- Emoji or URL avatar
  bio TEXT DEFAULT 'Crazy 8 Pot Collector',                 -- Player bio
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'in_game', 'offline')),
  current_room_code TEXT DEFAULT NULL,                     -- Active room code if currently playing
  matches_played INTEGER NOT NULL DEFAULT 0,                -- Career matches played
  wins INTEGER NOT NULL DEFAULT 0,                          -- Career victories
  cards_played INTEGER NOT NULL DEFAULT 0,                  -- Total cards laid down
  total_winnings TEXT NOT NULL DEFAULT '0.000',             -- Total chips won
  last_seen BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_crazy8_profiles_address ON crazy8_profiles (LOWER(address));
CREATE INDEX IF NOT EXISTS idx_crazy8_profiles_tag ON crazy8_profiles (LOWER(tag));
CREATE INDEX IF NOT EXISTS idx_crazy8_profiles_last_seen ON crazy8_profiles (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_crazy8_profiles_wins ON crazy8_profiles (wins DESC);

-- Active and Public Table Lobbies for Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_rooms (
  room_code TEXT PRIMARY KEY,
  host_name TEXT NOT NULL,
  host_avatar TEXT NOT NULL DEFAULT '🦊',
  buy_in TEXT NOT NULL DEFAULT '0.000',
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'game_over')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_crazy8_rooms_created ON crazy8_rooms (created_at DESC);

-- Completed Match History & Pot Payouts for Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  winner_id TEXT REFERENCES crazy8_profiles(id) ON DELETE SET NULL,
  player_ids TEXT[] NOT NULL DEFAULT '{}',
  pot_amount TEXT NOT NULL DEFAULT '0.000',
  cards_played JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

CREATE INDEX IF NOT EXISTS idx_crazy8_match_winner ON crazy8_match_history (winner_id);
CREATE INDEX IF NOT EXISTS idx_crazy8_match_created ON crazy8_match_history (created_at DESC);

-- Social: Opponents Faced in Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_recent_opponents (
  user_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  opponent_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  played_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (user_id, opponent_id)
);

CREATE INDEX IF NOT EXISTS idx_crazy8_opponents_user ON crazy8_recent_opponents (user_id);

-- Social: Friend Requests for Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_friend_requests (
  sender_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (sender_id, receiver_id)
);

-- Mutual Friends for Crazy 8
CREATE TABLE IF NOT EXISTS crazy8_friends (
  user_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES crazy8_profiles(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
  PRIMARY KEY (user_id, friend_id)
);

-- Dedicated Leaderboard View for Crazy 8
CREATE OR REPLACE VIEW crazy8_leaderboard AS
SELECT
  id,
  address,
  tag,
  name,
  avatar,
  bio,
  matches_played,
  wins,
  cards_played,
  total_winnings,
  last_seen
FROM crazy8_profiles
ORDER BY wins DESC, matches_played DESC
LIMIT 100;

-- ============================================================================
-- 2. CONNECT 4 TABLES (Prefix: connect4_)
-- ============================================================================

CREATE TABLE IF NOT EXISTS connect4_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id VARCHAR(100) UNIQUE NOT NULL,
  player_white VARCHAR(42) NOT NULL,
  player_black VARCHAR(42) NOT NULL,
  winner VARCHAR(42),
  tx_hash VARCHAR(66),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connect4_white ON connect4_matches (player_white);
CREATE INDEX IF NOT EXISTS idx_connect4_black ON connect4_matches (player_black);

-- ============================================================================
-- 3. ARCADE GLOBAL MULTI-GAME LEADERBOARD VIEW
-- Aggregates performance across Chess & Crazy 8
-- ============================================================================

CREATE OR REPLACE VIEW arcade_global_leaderboard AS
SELECT 
  COALESCE(p.wallet_address, c.address) AS wallet_address,
  COALESCE(p.username, c.name, 'ArcadePlayer') AS username,
  COALESCE(p.elo_rating, 1200) AS chess_elo,
  COALESCE(p.wins, 0) AS chess_wins,
  COALESCE(c.wins, 0) AS crazy8_wins,
  COALESCE(c.cards_played, 0) AS crazy8_cards_played,
  (COALESCE(p.wins, 0) + COALESCE(c.wins, 0)) AS total_arcade_wins
FROM players p
FULL OUTER JOIN crazy8_profiles c ON LOWER(p.wallet_address) = LOWER(c.address)
ORDER BY total_arcade_wins DESC, chess_elo DESC
LIMIT 100;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE crazy8_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_recent_opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect4_matches ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public crazy8_profiles are viewable by everyone" ON crazy8_profiles;
CREATE POLICY "Public crazy8_profiles are viewable by everyone" ON crazy8_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public crazy8_rooms are viewable by everyone" ON crazy8_rooms;
CREATE POLICY "Public crazy8_rooms are viewable by everyone" ON crazy8_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public crazy8_match_history is viewable by everyone" ON crazy8_match_history;
CREATE POLICY "Public crazy8_match_history is viewable by everyone" ON crazy8_match_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public connect4_matches are viewable by everyone" ON connect4_matches;
CREATE POLICY "Public connect4_matches are viewable by everyone" ON connect4_matches FOR SELECT USING (true);

-- Service Role Full Access Policies
DROP POLICY IF EXISTS "Service role access on crazy8_profiles" ON crazy8_profiles;
CREATE POLICY "Service role access on crazy8_profiles" ON crazy8_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on crazy8_rooms" ON crazy8_rooms;
CREATE POLICY "Service role access on crazy8_rooms" ON crazy8_rooms FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on crazy8_match_history" ON crazy8_match_history;
CREATE POLICY "Service role access on crazy8_match_history" ON crazy8_match_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on crazy8_recent_opponents" ON crazy8_recent_opponents;
CREATE POLICY "Service role access on crazy8_recent_opponents" ON crazy8_recent_opponents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on crazy8_friend_requests" ON crazy8_friend_requests;
CREATE POLICY "Service role access on crazy8_friend_requests" ON crazy8_friend_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on crazy8_friends" ON crazy8_friends;
CREATE POLICY "Service role access on crazy8_friends" ON crazy8_friends FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on connect4_matches" ON connect4_matches;
CREATE POLICY "Service role access on connect4_matches" ON connect4_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
