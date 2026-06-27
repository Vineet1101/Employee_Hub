
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS police_verification_urls text[] NOT NULL DEFAULT '{}'::text[];

CREATE TABLE IF NOT EXISTS public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text,
  hr_name text,
  contact text,
  staff_position text,
  staff_count integer,
  expected_salary numeric,
  location text,
  bonus text,
  working_hours text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their job openings"
ON public.job_openings FOR ALL
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER job_openings_touch_updated_at
BEFORE UPDATE ON public.job_openings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
