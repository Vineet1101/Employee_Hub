import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { currency } from "@/lib/format";
import { EmployeeDialog, type EmployeeRow } from "@/components/EmployeeDialog";
import { ListPagination, pageRange, type PageSize } from "@/components/ListPagination";
import { usePaginationState } from "@/lib/pagination-state";
import { Trash2, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
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
    queryKey: ["employees", page, pageSize, debouncedSearch],
    queryFn: async () => {
      const { from, to } = pageRange(page, pageSize);
      let query = supabase
        .from("employees")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      const q = debouncedSearch.trim();
      if (q) {
        const pattern = `%${q}%`;
        query = query.or(`full_name.ilike.${pattern},employee_code.ilike.${pattern},email.ilike.${pattern}`);
      }

      const { data: rows, error, count } = await query.range(from, to);
      if (error) throw error;
      return { rows: (rows ?? []) as EmployeeRow[], total: count ?? 0 };
    },
  });

  const employees = data?.rows ?? [];
  const total = data?.total ?? 0;

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee removed");
      qc.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your team's records and bank details.</p>
        </div>
        <EmployeeDialog />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, ID or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary"><Users className="h-5 w-5" /></div>
            <div>
              <h3 className="font-medium">{debouncedSearch ? "No matches" : "No employees yet"}</h3>
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Try a different search term." : "Add your first employee to start running payroll."}
              </p>
            </div>
            {!debouncedSearch && <EmployeeDialog />}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3 text-right">Base salary</th>
                    <th className="px-4 py-3">Bank</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-3 font-mono text-xs">{e.employee_code}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.full_name}</div>
                        {e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{e.position || "—"}</div>
                        {e.department && <div className="text-xs text-muted-foreground">{e.department}</div>}
                      </td>
                      <td className="px-4 py-3">{new Date(e.joining_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{currency(e.base_salary)}</td>
                      <td className="px-4 py-3 text-xs">
                        {e.bank_account_number ? (
                          <div>
                            <div>{e.bank_name || "—"}</div>
                            <div className="font-mono text-muted-foreground">****{String(e.bank_account_number).slice(-4)}</div>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={e.status === "active" ? "default" : "secondary"}>{e.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <EmployeeDialog employee={e} trigger={<Button size="sm" variant="ghost">Edit</Button>} />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {e.full_name}?</AlertDialogTitle>
                                <AlertDialogDescription>This also deletes their salary records. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(e.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
