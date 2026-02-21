DO $$ BEGIN
  ALTER TABLE public.round_scores ADD COLUMN answer_time_seconds integer DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;