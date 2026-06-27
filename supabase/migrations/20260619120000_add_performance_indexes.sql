-- Speed up RLS-filtered queries (auth.uid() = owner_id) and common sort/filter patterns.

CREATE INDEX IF NOT EXISTS idx_employees_owner_id ON public.employees (owner_id);
CREATE INDEX IF NOT EXISTS idx_employees_owner_created_at ON public.employees (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_salary_records_owner_id ON public.salary_records (owner_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_employee_id ON public.salary_records (employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_records_owner_period ON public.salary_records (owner_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_candidates_owner_id ON public.candidates (owner_id);
CREATE INDEX IF NOT EXISTS idx_candidates_owner_created_at ON public.candidates (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_openings_owner_id ON public.job_openings (owner_id);
CREATE INDEX IF NOT EXISTS idx_job_openings_owner_created_at ON public.job_openings (owner_id, created_at DESC);
