ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_question_type_check1;
ALTER TABLE public.questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('multiple_choice', 'text_input', 'text', 'image'));
