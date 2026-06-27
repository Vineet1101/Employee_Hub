import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { Database } from "@/integrations/supabase/types";

type CandidateQuery = PostgrestFilterBuilder<
  Database["public"],
  Database["public"]["Tables"]["candidates"]["Row"],
  Database["public"]["Tables"]["candidates"]["Row"][],
  "candidates",
  unknown
>;

export interface CandidateFilters {
  search: string;
  jobRole: string;
  location: string;
  minCurrent: string;
  maxCurrent: string;
  minExpected: string;
  maxExpected: string;
}

export function applyCandidateFilters(query: CandidateQuery, filters: CandidateFilters) {
  const q = filters.search.trim();
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(`full_name.ilike.${pattern},description.ilike.${pattern},email.ilike.${pattern}`);
  }

  const role = filters.jobRole.trim();
  if (role) query = query.ilike("job_role", `%${role}%`);

  const loc = filters.location.trim();
  if (loc) query = query.ilike("current_location", `%${loc}%`);

  if (filters.minCurrent) query = query.gte("current_salary", Number(filters.minCurrent));
  if (filters.maxCurrent) query = query.lte("current_salary", Number(filters.maxCurrent));
  if (filters.minExpected) query = query.gte("expected_salary", Number(filters.minExpected));
  if (filters.maxExpected) query = query.lte("expected_salary", Number(filters.maxExpected));

  return query;
}
