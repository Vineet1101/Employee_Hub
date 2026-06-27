
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  owner_id uuid PRIMARY KEY,
  provider text NOT NULL DEFAULT 'meta_cloud',
  access_token text,
  phone_number_id text,
  from_number text,
  account_sid text,
  auth_token text,
  webhook_url text,
  webhook_headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_body_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their whatsapp settings"
ON public.whatsapp_settings FOR ALL
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER whatsapp_settings_touch_updated_at
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
