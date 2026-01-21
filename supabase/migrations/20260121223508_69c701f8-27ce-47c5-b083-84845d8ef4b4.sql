-- Add foreign key relationships for joins to work
-- time_entries.user_id -> profiles.user_id
ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- incidents.user_id -> profiles.user_id  
ALTER TABLE public.incidents
ADD CONSTRAINT incidents_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;