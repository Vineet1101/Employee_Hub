-- Run this ONCE in Supabase Dashboard → SQL Editor (your own test project)
-- Order: tables → storage buckets → policies → indexes

-- ============ CORE TABLES ============

CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  department TEXT,
  joining_date DATE NOT NULL,
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_ifsc TEXT,
  bank_account_holder TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  aadhaar_url TEXT,
  pan_url TEXT,
  fitness_certificate_url TEXT,
  company TEXT,
  police_verification_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  vendor TEXT,
  vendor_commission NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, employee_code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their employees"
  ON public.employees FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.salary_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  advance NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus_note TEXT,
  deductions_note TEXT,
  advance_note TEXT,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, period_year, period_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their salary records"
  ON public.salary_records FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  description TEXT,
  job_role TEXT,
  current_salary NUMERIC NOT NULL DEFAULT 0,
  expected_salary NUMERIC NOT NULL DEFAULT 0,
  current_location TEXT,
  preferred_locations TEXT[] NOT NULL DEFAULT '{}',
  resume_url TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their candidates"
  ON public.candidates FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.job_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  hr_name TEXT,
  contact TEXT,
  staff_position TEXT,
  staff_count INTEGER,
  expected_salary NUMERIC,
  location TEXT,
  bonus TEXT,
  working_hours TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their job openings"
  ON public.job_openings FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.whatsapp_settings (
  owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'meta_cloud',
  access_token TEXT,
  phone_number_id TEXT,
  from_number TEXT,
  account_sid TEXT,
  auth_token TEXT,
  webhook_url TEXT,
  webhook_headers JSONB NOT NULL DEFAULT '{}'::JSONB,
  webhook_body_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their whatsapp settings"
  ON public.whatsapp_settings FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_salary_records_updated_at
  BEFORE UPDATE ON public.salary_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER candidates_touch_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER job_openings_touch_updated_at
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER whatsapp_settings_touch_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STORAGE BUCKETS ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-docs', 'employee-docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-resumes', 'candidate-resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users manage own employee docs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'employee-docs' AND auth.uid()::TEXT = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'employee-docs' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Users manage own candidate resumes"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'candidate-resumes' AND auth.uid()::TEXT = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'candidate-resumes' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ============ PERFORMANCE INDEXES ============

CREATE INDEX IF NOT EXISTS idx_employees_owner_id ON public.employees (owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_owner_created_at ON public.employees (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_salary_records_owner_id ON public.salary_records (owner_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_employee_id ON public.salary_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_owner_period ON public.salary_records (owner_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_candidates_owner_id ON public.candidates (owner_id);
CREATE INDEX IF NOT EXISTS idx_candidates_owner_created_at ON public.candidates (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_openings_owner_id ON public.job_openings (owner_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_owner_created_at ON public.job_openings (owner_id, created_at DESC);
