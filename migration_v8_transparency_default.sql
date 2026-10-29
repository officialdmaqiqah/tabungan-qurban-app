-- Migration v8: Transparency Default to Full Name
-- Set default value for is_anonymous to false
ALTER TABLE IF EXISTS public.profiles 
ALTER COLUMN is_anonymous SET DEFAULT false;

-- Reset existing profiles to false so they display full name by default
UPDATE public.profiles 
SET is_anonymous = false;
