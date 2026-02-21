-- Add ban_count column to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS ban_count INTEGER NOT NULL DEFAULT 0;

-- Ensure public read access to teams table so the Admin Dashboard can fetch it
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to teams" ON public.teams;
CREATE POLICY "Allow public read access to teams"
ON public.teams
FOR SELECT
TO public
USING (true);

-- Create RPC function to atomically trigger atmospheric breach
CREATE OR REPLACE FUNCTION trigger_atmospheric_breach(_team_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.teams
  SET 
    is_disqualified = true,
    ban_count = ban_count + 1
  WHERE id = _team_id;
END;
$$;
