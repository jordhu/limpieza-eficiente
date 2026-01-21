-- Create storage bucket for verification photos
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-photos', 'verification-photos', false);

-- Allow authenticated users to upload their own verification photos
CREATE POLICY "Users can upload verification photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'verification-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can view their own photos
CREATE POLICY "Users can view their own verification photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'verification-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all verification photos
CREATE POLICY "Admins can view all verification photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'verification-photos' AND EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
));

-- Add verification photo URL to time_entries
ALTER TABLE public.time_entries 
ADD COLUMN start_photo_url text,
ADD COLUMN end_photo_url text;