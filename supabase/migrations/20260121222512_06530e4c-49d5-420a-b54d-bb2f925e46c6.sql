-- Add active column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(active);