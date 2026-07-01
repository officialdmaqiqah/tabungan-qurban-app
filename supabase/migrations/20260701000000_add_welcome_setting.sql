ALTER TABLE public.whatsapp_settings
ADD COLUMN IF NOT EXISTS send_welcome_on_registration boolean DEFAULT true;
