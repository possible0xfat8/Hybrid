-- ============================================================================
-- HYBRID - COMPLETE DATABASE RESET SCRIPT
-- ============================================================================
-- WARNING: This script drops all arcade tables, views, and data in the public schema.
-- Run this in your Supabase SQL Editor to wipe the database clean before running
-- `master_arcade_schema.sql`.
-- ============================================================================

-- Option A: Dynamic Clean Wipe of all tables and views in the public schema
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Drop all views in public schema
    FOR r IN (SELECT table_name FROM information_schema.views WHERE table_schema = 'public') LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
    
    -- 2. Drop all user tables in public schema
    FOR r IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.table_name) || ' CASCADE';
    END LOOP;
END $$;

-- Drop Custom Functions (if any)
DROP FUNCTION IF EXISTS update_player_stats_atomic CASCADE;
DROP FUNCTION IF EXISTS get_player_games CASCADE;

-- Confirmation query to verify everything is clean:
SELECT 
  table_schema, 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_schema = 'public';
