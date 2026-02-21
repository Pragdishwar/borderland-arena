ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_round_number_check;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_round_number_check1;
ALTER TABLE public.questions ADD CONSTRAINT questions_round_number_check CHECK (round_number BETWEEN 1 AND 4);