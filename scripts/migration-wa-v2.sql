-- 1. Update Profiles Table
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS wa_opt_in;

ALTER TABLE public.profiles 
  ADD COLUMN wa_opt_in boolean DEFAULT false,
  ADD COLUMN wa_opt_in_at timestamp with time zone,
  ADD COLUMN wa_opt_in_source text,
  ADD COLUMN phone_normalized text;

-- 2. Update handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, phone, address, role, 
    wa_opt_in, wa_opt_in_at, wa_opt_in_source, phone_normalized
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    'jamaah',
    COALESCE((NEW.raw_user_meta_data->>'wa_opt_in')::boolean, false),
    (NEW.raw_user_meta_data->>'wa_opt_in_at')::timestamp with time zone,
    NEW.raw_user_meta_data->>'wa_opt_in_source',
    NEW.raw_user_meta_data->>'phone_normalized'
  );
  RETURN NEW;
END;
$$;

-- 3. Create whatsapp_settings table
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider text DEFAULT 'xsender',
  is_enabled boolean DEFAULT false,
  dry_run boolean DEFAULT true,
  admin_notification_phone text,
  send_to_admin_on_deposit_reported boolean DEFAULT true,
  send_to_jamaah_on_deposit_approved boolean DEFAULT true,
  send_to_jamaah_on_deposit_rejected boolean DEFAULT true,
  send_manual_reminder_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default settings row
INSERT INTO public.whatsapp_settings (id, provider, is_enabled, dry_run) 
SELECT uuid_generate_v4(), 'xsender', false, true
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_settings);

-- 4. Re-create whatsapp_notifications table
DROP TABLE IF EXISTS public.whatsapp_notifications;

CREATE TABLE public.whatsapp_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_phone text NOT NULL,
  recipient_name text,
  event_type text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text DEFAULT 'xsender',
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  attempts integer DEFAULT 0,
  related_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  sent_at timestamp with time zone
);

-- 5. Enable RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;

-- Settings Policies
CREATE POLICY "Admins can manage whatsapp settings" ON public.whatsapp_settings 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Notifications Policies
CREATE POLICY "Jamaah can view own logs" ON public.whatsapp_notifications 
FOR SELECT USING (
  auth.uid() = recipient_user_id
);

CREATE POLICY "Admins can view all logs" ON public.whatsapp_notifications 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
