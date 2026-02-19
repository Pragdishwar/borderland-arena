-- Copy and paste this into your Supabase SQL Editor to enable the Anti-Cheat Disqualification logic.

-- 1. Add the Disqualification Status column to the teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS is_disqualified BOOLEAN DEFAULT FALSE;

-- 2. Create the RPC function that the frontend calls
-- This function securely updates the team status to disqualified.
CREATE OR REPLACE FUNCTION public.flag_team_disqualification(_team_id UUID, _game_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.teams
  SET is_disqualified = TRUE
  WHERE id = _team_id AND game_id = _game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (Optional) Grant execute permission to authenticated users if needed
GRANT EXECUTE ON FUNCTION public.flag_team_disqualification(UUID, UUID) TO authenticated;
