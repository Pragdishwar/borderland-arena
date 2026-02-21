DO $$ BEGIN
  ALTER TABLE public.round_scores ADD COLUMN current_q_index INTEGER NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;
