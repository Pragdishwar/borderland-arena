-- Add game_id to questions table to isolate question banks per lobby
ALTER TABLE public.questions ADD COLUMN game_id UUID NULL REFERENCES public.games(id) ON DELETE CASCADE;

-- Create RPC to clone a default set of questions to a new game
CREATE OR REPLACE FUNCTION clone_game_questions(_source_game_id UUID, _target_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.questions (game_id, round_number, suit, question_text, question_type, options, correct_answer, points, image_url, question_number)
  SELECT _target_game_id, round_number, suit, question_text, question_type, options, correct_answer, points, image_url, question_number
  FROM public.questions
  WHERE game_id = _source_game_id OR (_source_game_id IS NULL AND game_id IS NULL);
END;
$$;
