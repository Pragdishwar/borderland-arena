-- Fix clone_game_questions to delete existing questions in the target game first,
-- preventing duplicate key violations on (game_id, round_number, suit, question_number).
CREATE OR REPLACE FUNCTION clone_game_questions(_source_game_id UUID, _target_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove any existing questions in the target game first
  DELETE FROM public.questions WHERE game_id = _target_game_id;

  -- Then insert the cloned questions
  INSERT INTO public.questions (game_id, round_number, suit, question_text, question_type, options, correct_answer, points, image_url, question_number)
  SELECT _target_game_id, round_number, suit, question_text, question_type, options, correct_answer, points, image_url, question_number
  FROM public.questions
  WHERE game_id = _source_game_id OR (_source_game_id IS NULL AND game_id IS NULL);
END;
$$;
