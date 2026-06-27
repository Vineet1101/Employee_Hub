import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Building2, Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { currency } from "@/lib/format";
import { ListPagination, pageRange, type PageSize } from "@/components/ListPagination";
import { usePaginationState } from "@/lib/pagination-state";

export const Route = createFileRoute("/_authenticated/companies")({
  component: CompaniesPage,
});

interface JobOpening {
  id: string;
  company_name: string | null;
  hr_name: string | null;
  contact: string | null;
  staff_position: string | null;
  staff_count: number | null;
  expected_salary: number | null;
  location: string | null;
  bonus: string | null;
  working_hours: string | null;
  note: string | null;
  created_at: string;
}

type FormValues = Omit<JobOpening, "id" | "created_at">;

const empty: FormValues = {
  company_name: "", hr_name: "", contact: "", staff_position: "",
  staff_count: null, expected_salary: null, location: "", bonus: "", working_hours: "", note: "",
};

function CompaniesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { page, setPage, pageSize, setPageSize } = usePaginationState();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, setPage]);

  const { data, isLoading } = useQuery({
    queryKey: ["job_openings", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const { from, to } = pageRange(page, pageSize);
      let query = supabase
        .from("job_openings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      const q = debouncedSearch.trim();
      if (q) {
        const pattern = `%${q}%`;
        query = query.or(
          `company_name.ilike.${pattern},hr_name.ilike.${pattern},staff_position.ilike.${pattern},location.ilike.${pattern}`,
        );
      }

      const { data: rows, error, count } = await query.range(from, to);
      if (error) throw error;
      return { rows: (rows ?? []) as JobOpening[], total: count ?? 0 };
    },
  });

  const openings = data?.rows ?? [];
  const total = data?.total ?? 0;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_openings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["job_openings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = openings;

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Companies & Openings</h1>
          <p className="text-sm text-muted-foreground">Track client companies you're hiring for and their open roles.</p>
        </div>
        <OpeningDialog />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search company, HR, role or location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary"><Building2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-medium">{debouncedSearch ? "No matches" : "No openings yet"}</h3>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Try a different search term." : "Add a company opening to start tracking."}
              </p>
            </div>
            {!debouncedSearch && <OpeningDialog />}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-semibold">{o.company_name || "Untitled company"}</h3>
                    {o.staff_position && <p className="text-sm text-muted-foreground">{o.staff_position}</p>}
                  </div>
                  <div className="flex gap-1">
                    <OpeningDialog opening={o} trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this opening?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del.mutate(o.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Info label="HR" value={o.hr_name} />
                  <Info label="Contact" value={o.contact} />
                  <Info label="No. of staff" value={o.staff_count?.toString() ?? null} />
                  <Info label="Expected salary" value={o.expected_salary != null ? currency(o.expected_salary) : null} />
                  <Info label="Location" value={o.location} />
                  <Info label="Working hours" value={o.working_hours} />
                  <Info label="Bonus" value={o.bonus} />
                </dl>
                {o.note && <p className="mt-3 whitespace-pre-wrap rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">{o.note}</p>}
              </div>
              ))}
            </div>
            <ListPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size: PageSize) => setPageSize(size)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  );
}

function OpeningDialog({ opening, trigger }: { opening?: JobOpening; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const isEdit = !!opening;
  const form = useForm<FormValues>({
    defaultValues: opening
      ? {
          company_name: opening.company_name ?? "", hr_name: opening.hr_name ?? "", contact: opening.contact ?? "",
          staff_position: opening.staff_position ?? "", staff_count: opening.staff_count,
          expected_salary: opening.expected_salary, location: opening.location ?? "",
          bonus: opening.bonus ?? "", working_hours: opening.working_hours ?? "", note: opening.note ?? "",
        }
      : empty,
  });

  const mutation = useMutation({
    mutationFn: async (raw: FormValues) => {
      const { data: userData } = await supabase.auth.getUser();
      const owner_id = userData.user?.id;
      if (!owner_id) throw new Error("Not signed in");
      const values = {
        ...raw,
        staff_count: raw.staff_count === null || (raw.staff_count as unknown as string) === "" ? null : Number(raw.staff_count),
        expected_salary: raw.expected_salary === null || (raw.expected_salary as unknown as string) === "" ? null : Number(raw.expected_salary),
        owner_id,
      };
      if (isEdit) {
        const { error } = await supabase.from("job_openings").update(values).eq("id", opening!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("job_openings").insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Opening updated" : "Opening added");
      qc.invalidateQueries({ queryKey: ["job_openings"] });
      setOpen(false);
      if (!isEdit) form.reset(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button><Plus className="mr-2 h-4 w-4" /> Add opening</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit opening" : "Add opening"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
          <F label="Company name"><Input {...form.register("company_name")} /></F>
          <F label="HR name"><Input {...form.register("hr_name")} /></F>
          <F label="Contact"><Input {...form.register("contact")} placeholder="Phone or email" /></F>
          <F label="Staff position"><Input {...form.register("staff_position")} /></F>
          <F label="No. of staff"><Input type="number" {...form.register("staff_count")} /></F>
          <F label="Expected salary"><Input type="number" step="0.01" {...form.register("expected_salary")} /></F>
          <F label="Location"><Input {...form.register("location")} /></F>
          <F label="Working hours"><Input {...form.register("working_hours")} placeholder="e.g. 9 AM – 6 PM" /></F>
          <div className="sm:col-span-2"><F label="Bonus"><Input {...form.register("bonus")} placeholder="e.g. Performance bonus, festival bonus" /></F></div>
          <div className="sm:col-span-2"><F label="Note"><Textarea rows={3} {...form.register("note")} /></F></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add opening"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
