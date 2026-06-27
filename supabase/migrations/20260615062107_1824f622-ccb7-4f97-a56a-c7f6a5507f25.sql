ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS advance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.salary_records ADD COLUMN IF NOT EXISTS advance_note text;