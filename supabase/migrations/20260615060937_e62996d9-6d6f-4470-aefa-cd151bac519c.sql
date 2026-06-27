
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS aadhaar_url text,
  ADD COLUMN IF NOT EXISTS pan_url text;

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  full_name text NOT NULL,
  description text,
  job_role text,
  current_salary numeric NOT NULL DEFAULT 0,
  expected_salary numeric NOT NULL DEFAULT 0,
  current_location text,
  preferred_locations text[] NOT NULL DEFAULT '{}',
  resume_url text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their candidates"
  ON public.candidates FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER candidates_touch_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
