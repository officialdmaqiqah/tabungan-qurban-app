-- 1. Add wa_opt_in to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wa_opt_in boolean DEFAULT true;

-- 2. Update handle_new_user trigger to read wa_opt_in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, address, role, wa_opt_in)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    'jamaah',
    COALESCE((NEW.raw_user_meta_data->>'wa_opt_in')::boolean, true)
  );
  RETURN NEW;
END;
$$;

-- 3. Create whatsapp_notifications table
CREATE TABLE IF NOT EXISTS public.whatsapp_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type text NOT NULL,
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  recipient_name text NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  provider text,
  provider_response jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable RLS on whatsapp_notifications
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can read
CREATE POLICY "Admins can read whatsapp logs" ON public.whatsapp_notifications 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- (Backend service role can insert bypassing RLS)
