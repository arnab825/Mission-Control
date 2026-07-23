-- DDL for the Supabase/PostgreSQL XP Leaderboard table
CREATE TABLE IF NOT EXISTS xp_leaderboard (
    user_id             VARCHAR(255) PRIMARY KEY,
    xp                  INTEGER DEFAULT 0,
    level               INTEGER DEFAULT 1,
    achievements_count  INTEGER DEFAULT 0,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
