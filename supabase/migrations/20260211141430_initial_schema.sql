-- Admin role system
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
DO $$ BEGIN
  CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Games table
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Borderland Arena',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'round1', 'round2', 'round3', 'between_rounds', 'finished')),
  current_round INTEGER NOT NULL DEFAULT 0,
  round_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Games: anon can read (for joining), admin can CRUD
DO $$ BEGIN
  CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can create games" ON public.games FOR INSERT WITH CHECK (auth.uid() = admin_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can update own games" ON public.games FOR UPDATE USING (auth.uid() = admin_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can delete own games" ON public.games FOR DELETE USING (auth.uid() = admin_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, name)
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read teams" ON public.teams FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can create teams" ON public.teams FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can update teams" ON public.teams FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.games WHERE games.id = teams.game_id AND games.admin_id = auth.uid())
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can delete teams" ON public.teams FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.games WHERE games.id = teams.game_id AND games.admin_id = auth.uid())
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Members table
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_eliminated BOOLEAN NOT NULL DEFAULT false,
  eliminated_round INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read members" ON public.members FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can create members" ON public.members FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can update members" ON public.members FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.games g ON g.id = t.game_id
      WHERE t.id = members.team_id AND g.admin_id = auth.uid()
    )
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  suit TEXT NOT NULL CHECK (suit IN ('spades', 'hearts', 'diamonds', 'clubs')),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'text_input')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read questions" ON public.questions FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin can manage questions" ON public.questions;
  CREATE POLICY "Admin can manage questions" ON public.questions
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Round scores
CREATE TABLE IF NOT EXISTS public.round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  suit_chosen TEXT CHECK (suit_chosen IN ('spades', 'hearts', 'diamonds', 'clubs')),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, game_id, round_number)
);
ALTER TABLE public.round_scores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read round_scores" ON public.round_scores FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can insert round_scores" ON public.round_scores FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Anyone can update round_scores" ON public.round_scores FOR UPDATE USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Eliminations
CREATE TABLE IF NOT EXISTS public.eliminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eliminations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read eliminations" ON public.eliminations FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY "Admin can manage eliminations" ON public.eliminations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.games WHERE games.id = eliminations.game_id AND games.admin_id = auth.uid())
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enable realtime for game state sync
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.round_scores;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.eliminations;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
