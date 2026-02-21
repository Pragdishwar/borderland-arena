-- Add image_url column to questions table
DO $$ BEGIN
  ALTER TABLE public.questions ADD COLUMN image_url TEXT;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Create storage bucket for question images
DO $$ BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);
EXCEPTION
  WHEN unique_violation THEN null;
END $$;

-- Allow admins to upload question images
DO $$ BEGIN
  CREATE POLICY "Admins can upload question images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Allow admins to update question images
DO $$ BEGIN
  CREATE POLICY "Admins can update question images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Allow admins to delete question images
DO $$ BEGIN
  CREATE POLICY "Admins can delete question images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'question-images' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Allow anyone to view question images
DO $$ BEGIN
  CREATE POLICY "Anyone can view question images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'question-images');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
