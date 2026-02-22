-- Drop the legacy global unique constraint that breaks multi-lobby questions
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS unique_round_suit_question;

-- Re-apply the constraint, this time locking it dynamically to the game_id namespace
ALTER TABLE public.questions ADD CONSTRAINT unique_round_suit_question UNIQUE (game_id, round_number, suit, question_number);
