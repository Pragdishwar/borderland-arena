-- Add active_member_id column to round_scores table to track which operative played which round
ALTER TABLE public.round_scores 
ADD COLUMN IF NOT EXISTS active_member_id UUID REFERENCES public.members(id) ON DELETE SET NULL;
