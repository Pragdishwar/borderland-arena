-- ========================================
-- PAUSE/RESUME + TIMER AFTER CARD
-- Run in Supabase SQL Editor
-- ========================================

-- 1. Add pause columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_paused_seconds integer DEFAULT 0;

-- 2. Add suit_chosen_at to round_scores table
ALTER TABLE round_scores ADD COLUMN IF NOT EXISTS suit_chosen_at timestamptz;

-- 3. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games' AND column_name IN ('is_paused', 'paused_at', 'total_paused_seconds');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'round_scores' AND column_name = 'suit_chosen_at';
