
-- 1. Games: Allow any admin to update/delete any game
DROP POLICY IF EXISTS "Admin can update own games" ON public.games;
DROP POLICY IF EXISTS "Admin can delete own games" ON public.games;

DO $$ BEGIN
  CREATE POLICY "Admins can update any game" ON public.games
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete any game" ON public.games
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Teams: Allow any admin to update/delete any team
DROP POLICY IF EXISTS "Admin can update teams" ON public.teams;
DROP POLICY IF EXISTS "Admin can delete teams" ON public.teams;

DO $$ BEGIN
  CREATE POLICY "Admins can update any team" ON public.teams
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete any team" ON public.teams
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Members: Allow any admin to update/delete any member
DROP POLICY IF EXISTS "Admin can update members" ON public.members;

DO $$ BEGIN
  CREATE POLICY "Admins can update any member" ON public.members
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Eliminate: Allow any admin to manage eliminations
DROP POLICY IF EXISTS "Admin can manage eliminations" ON public.eliminations;

DO $$ BEGIN
  CREATE POLICY "Admins can manage eliminations" ON public.eliminations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Questions: (Already correct in previous migration, but ensuring)
-- "Admin can manage questions" -> checks public.has_role(auth.uid(), 'admin')
-- so we don't need to change questions table policy if it uses has_role.
-- Checking previous migration: yes, it uses public.has_role.

-- 6. Round Scores: Allow any admin to update (Insert is public/anon for now?)
-- Previous: "Anyone can update round_scores" -> strictly might need tightening later, but for now we leave it.
-- But let's add specific admin override if needed? No, "Anyone" covers admin.
