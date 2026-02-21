DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can manage questions" ON public.questions;
  CREATE POLICY "Admin can manage questions" ON public.questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
