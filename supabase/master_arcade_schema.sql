-- ============================================================================
-- HYBRID - MASTER "ONE FOR ALL" DATABASE SCHEMA
-- ============================================================================
-- This single SQL file provisions the entire database for all Hybrid games on Hemi Network:
--   1. Chess Tables & Views (players, game_history, moves, leaderboard, etc.)
--   2. Crazy 8 / Uno Tables & Views (crazy8_profiles, crazy8_rooms, crazy8_leaderboard, etc.)
--   3. Connect 4 Tables (connect4_matches)
--   4. Unified Arcade Aggregate Views (arcade_global_leaderboard)
--   5. Full Row Level Security (RLS) & Policies
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CHESS TABLES & VIEWS
-- ============================================================================

-- Players / Accounts
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  player_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  total_games INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT DEFAULT '🦊',
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'in_game', 'offline')),
  is_online BOOLEAN DEFAULT false,
  last_active TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_wallet ON players (LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players (player_id);
CREATE INDEX IF NOT EXISTS idx_players_elo ON players (elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players (wins DESC);

-- Match History
CREATE TABLE IF NOT EXISTS game_history (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT UNIQUE NOT NULL,
  white_player_id TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  winner TEXT,
  result TEXT,
  total_moves INTEGER DEFAULT 0,
  game_duration INTEGER DEFAULT 0,
  white_elo_before INTEGER DEFAULT 1200,
  black_elo_before INTEGER DEFAULT 1200,
  white_elo_after INTEGER DEFAULT 1200,
  black_elo_after INTEGER DEFAULT 1200,
  final_fen TEXT,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_history_game_id ON game_history (game_id);
CREATE INDEX IF NOT EXISTS idx_game_history_white ON game_history (white_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_black ON game_history (black_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_completed ON game_history (completed_at DESC);

-- Individual Moves
CREATE TABLE IF NOT EXISTS moves (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  from_square TEXT NOT NULL,
  to_square TEXT NOT NULL,
  piece TEXT,
  promotion TEXT,
  san TEXT,
  fen_after TEXT,
  move_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves (game_id);

-- Wallet Links
CREATE TABLE IF NOT EXISTS wallet_links (
  id BIGSERIAL PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  linked_address TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_links_wallet ON wallet_links (LOWER(wallet_address));

-- Social: Friends
CREATE TABLE IF NOT EXISTS friends (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends (user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends (friend_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id TEXT NOT NULL,
  sender_id TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);

-- Chess Views
CREATE OR REPLACE VIEW player_stats AS
SELECT
  player_id,
  username,
  wallet_address,
  elo_rating,
  total_games,
  wins,
  losses,
  draws,
  CASE WHEN total_games > 0 THEN ROUND((wins::numeric / total_games::numeric) * 100, 1) ELSE 0 END AS win_rate,
  created_at,
  last_active
FROM players;

CREATE OR REPLACE VIEW recent_games AS
SELECT
  g.game_id,
  g.white_player_id,
  pw.username AS white_username,
  g.black_player_id,
  pb.username AS black_username,
  g.winner,
  g.result,
  g.total_moves,
  g.game_duration,
  g.completed_at
FROM game_history g
LEFT JOIN players pw ON g.white_player_id = pw.player_id
LEFT JOIN players pb ON g.black_player_id = pb.player_id
ORDER BY g.completed_at DESC;

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY elo_rating DESC, wins DESC) AS rank,
  player_id,
  username,
  wallet_address,
  elo_rating,
  total_games,
  wins,
  losses,
  draws,
  CASE WHEN total_games > 0 THEN ROUND((wins::numeric / total_games::numeric) * 100, 1) ELSE 0 END AS win_rate
FROM players
ORDER BY elo_rating DESC, wins DESC;

CREATE OR REPLACE VIEW friends_list AS
SELECT
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at,
  p.username AS friend_username,
  p.avatar_url AS friend_avatar,
  p.elo_rating AS friend_elo,
  p.online_status AS friend_status,
  p.is_online AS friend_is_online
FROM friends f
LEFT JOIN players p ON LOWER(f.friend_id) = LOWER(p.wallet_address) OR f.friend_id = p.player_id;

CREATE OR REPLACE VIEW notifications_detailed AS
SELECT
  n.id,
  n.recipient_id,
  n.sender_id,
  n.type,
  n.status,
  n.data,
  n.created_at,
  n.read_at,
  p.username AS sender_username,
  p.avatar_url AS sender_avatar
FROM notifications n
LEFT JOIN players p ON LOWER(n.sender_id) = LOWER(p.wallet_address) OR n.sender_id = p.player_id;

-- ============================================================================
-- 2. CRAZY 8 TABLES & VIEWS (Prefix: crazy8_)
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
-- 3. CONNECT 4 TABLES (Prefix: connect4_)
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
-- 4. ARCADE GLOBAL MULTI-GAME LEADERBOARD VIEW
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
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_recent_opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crazy8_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE connect4_matches ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public players are viewable by everyone" ON players;
CREATE POLICY "Public players are viewable by everyone" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public game_history is viewable by everyone" ON game_history;
CREATE POLICY "Public game_history is viewable by everyone" ON game_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public moves are viewable by everyone" ON moves;
CREATE POLICY "Public moves are viewable by everyone" ON moves FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public friends are viewable by everyone" ON friends;
CREATE POLICY "Public friends are viewable by everyone" ON friends FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public notifications are viewable by everyone" ON notifications;
CREATE POLICY "Public notifications are viewable by everyone" ON notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public wallet_links are viewable by everyone" ON wallet_links;
CREATE POLICY "Public wallet_links are viewable by everyone" ON wallet_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public crazy8_profiles are viewable by everyone" ON crazy8_profiles;
CREATE POLICY "Public crazy8_profiles are viewable by everyone" ON crazy8_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public crazy8_rooms are viewable by everyone" ON crazy8_rooms;
CREATE POLICY "Public crazy8_rooms are viewable by everyone" ON crazy8_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public crazy8_match_history is viewable by everyone" ON crazy8_match_history;
CREATE POLICY "Public crazy8_match_history is viewable by everyone" ON crazy8_match_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public connect4_matches are viewable by everyone" ON connect4_matches;
CREATE POLICY "Public connect4_matches are viewable by everyone" ON connect4_matches FOR SELECT USING (true);

-- Service Role Full Access Policies
DROP POLICY IF EXISTS "Service role access on players" ON players;
CREATE POLICY "Service role access on players" ON players FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on game_history" ON game_history;
CREATE POLICY "Service role access on game_history" ON game_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on moves" ON moves;
CREATE POLICY "Service role access on moves" ON moves FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on friends" ON friends;
CREATE POLICY "Service role access on friends" ON friends FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on notifications" ON notifications;
CREATE POLICY "Service role access on notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role access on wallet_links" ON wallet_links;
CREATE POLICY "Service role access on wallet_links" ON wallet_links FOR ALL TO service_role USING (true) WITH CHECK (true);

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
