-- Add is_disqualified column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS is_disqualified BOOLEAN NOT NULL DEFAULT false;

-- Create RPC function to flag team disqualification
CREATE OR REPLACE FUNCTION public.flag_team_disqualification(_team_id UUID, _game_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.teams
  SET is_disqualified = true
  WHERE id = _team_id AND game_id = _game_id;
END;
$$;
