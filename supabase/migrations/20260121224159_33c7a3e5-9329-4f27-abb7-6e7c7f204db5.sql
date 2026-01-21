-- Update the handle_new_user function to reject signups without valid invitation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  is_first_user BOOLEAN;
BEGIN
  -- Check if this is the first user (will be admin)
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) INTO is_first_user;
  
  -- If not the first user, check for valid invitation
  IF NOT is_first_user THEN
    SELECT * INTO invitation_record
    FROM public.invitations
    WHERE email = NEW.email
      AND used = false
      AND expires_at > now()
    LIMIT 1;
    
    -- Reject if no valid invitation found
    IF invitation_record.id IS NULL THEN
      RAISE EXCEPTION 'No valid invitation found for this email. Please request an invitation from an administrator.';
    END IF;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  
  -- Assign role
  IF is_first_user THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'worker');
    UPDATE public.invitations SET used = true, used_at = now() WHERE id = invitation_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;