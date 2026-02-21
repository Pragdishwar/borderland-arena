
DO $$
BEGIN
  -- Add question_number column if it doesn't exist
  ALTER TABLE public.questions ADD COLUMN question_number integer;

  -- Assign sequential question numbers within each round/suit group
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY round_number, suit ORDER BY created_at) AS rn
    FROM public.questions
  )
  UPDATE public.questions q SET question_number = n.rn FROM numbered n WHERE q.id = n.id;

  -- Set default and not null
  ALTER TABLE public.questions ALTER COLUMN question_number SET NOT NULL;
  ALTER TABLE public.questions ALTER COLUMN question_number SET DEFAULT 1;

  -- Add unique constraint
  ALTER TABLE public.questions ADD CONSTRAINT unique_round_suit_question UNIQUE (round_number, suit, question_number);

EXCEPTION
  WHEN duplicate_column THEN null;
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
