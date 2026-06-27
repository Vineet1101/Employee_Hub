import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { currency, monthName, months } from "@/lib/format";
import { ListPagination, pageRange, type PageSize } from "@/components/ListPagination";
import { usePaginationState } from "@/lib/pagination-state";
import { toast } from "sonner";
import { CheckCircle2, FileText, ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/payroll")({
  component: PayrollPage,
});

interface SalaryRecord {
  id: string;
  employee_id: string;
  period_year: number;
  period_month: number;
  base_salary: number;
  bonus: number;
  deductions: number;
  advance: number;
  bonus_note: string | null;
  deductions_note: string | null;
  advance_note: string | null;
  net_salary: number;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  base_salary: number;
  status: string;
}

function PayrollPage() {
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const { page, setPage, pageSize, setPageSize } = usePaginationState();

  useEffect(() => {
    setPage(1);
  }, [year, month, setPage]);

  const { data: stats } = useQuery({
    queryKey: ["payroll-stats", year, month],
    queryFn: async () => {
      const [activeRes, recordsRes] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("salary_records")
          .select("net_salary, status", { count: "exact" })
          .eq("period_year", year)
          .eq("period_month", month),
      ]);
      if (activeRes.error) throw activeRes.error;
      if (recordsRes.error) throw recordsRes.error;

      const rows = recordsRes.data ?? [];
      let totalNet = 0;
      let paidTotal = 0;
      let paidCount = 0;
      for (const row of rows) {
        const net = Number(row.net_salary || 0);
        totalNet += net;
        if (row.status === "paid") {
          paidTotal += net;
          paidCount++;
        }
      }

      return {
        activeCount: activeRes.count ?? 0,
        recordCount: recordsRes.count ?? rows.length,
        totalNet,
        paidTotal,
        paidCount,
      };
    },
  });

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["payroll-page", year, month, page, pageSize],
    queryFn: async () => {
      const { from, to } = pageRange(page, pageSize);
      const { data: employees, error: empErr, count } = await supabase
        .from("employees")
        .select("id, employee_code, full_name, base_salary, status", { count: "exact" })
        .eq("status", "active")
        .order("full_name")
        .range(from, to);
      if (empErr) throw empErr;
      if (!employees?.length) return { employees: [] as Employee[], records: [] as SalaryRecord[], total: count ?? 0 };

      const ids = employees.map((e) => e.id);
      const { data: records, error: recErr } = await supabase
        .from("salary_records")
        .select("*")
        .eq("period_year", year)
        .eq("period_month", month)
        .in("employee_id", ids);
      if (recErr) throw recErr;

      return {
        employees: employees as Employee[],
        records: (records ?? []) as SalaryRecord[],
        total: count ?? 0,
      };
    },
  });

  const activeEmployees = pageData?.employees ?? [];
  const records = pageData?.records ?? [];
  const total = pageData?.total ?? 0;

  const recordByEmployee = useMemo(() => {
    const m = new Map<string, SalaryRecord>();
    for (const r of records) m.set(r.employee_id, r);
    return m;
  }, [records]);

  const recordCount = stats?.recordCount ?? 0;
  const totalNet = stats?.totalNet ?? 0;
  const paidTotal = stats?.paidTotal ?? 0;

  function shiftMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
  }

  const togglePaid = useMutation({
    mutationFn: async (rec: SalaryRecord) => {
      const newStatus = rec.status === "paid" ? "unpaid" : "paid";
      const { error } = await supabase.from("salary_records").update({
        status: newStatus,
        paid_at: newStatus === "paid" ? new Date().toISOString() : null,
      }).eq("id", rec.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payroll-stats"] });
      qc.invalidateQueries({ queryKey: ["payroll-page"] });
      qc.invalidateQueries({ queryKey: ["salary_records"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Payroll</h1>
          <p className="text-sm text-muted-foreground">Run salaries with bonuses and deductions for any month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <Input className="w-24" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Records" value={recordCount.toString()} />
        <Stat label="Total payroll" value={currency(totalNet)} />
        <Stat label="Paid" value={currency(paidTotal)} accent />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="border-b border-border px-5 py-4">
          <div className="font-display text-lg font-semibold">{monthName(month)} {year}</div>
          <p className="text-xs text-muted-foreground">Net = base + bonus − deductions. Click an employee to create or edit their record.</p>
        </div>
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : total === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No active employees. <Link to="/employees" className="text-primary underline">Add some first</Link>.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Base</th>
                  <th className="px-4 py-3 text-right">Bonus</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Advance</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.map((e) => {
                  const rec = recordByEmployee.get(e.id);
                  return (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.full_name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{e.employee_code}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{currency(rec?.base_salary ?? e.base_salary)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-accent-foreground">{rec ? currency(rec.bonus) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">{rec ? currency(rec.deductions) : "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">{rec ? currency(rec.advance) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{rec ? currency(rec.net_salary) : currency(e.base_salary)}</td>
                      <td className="px-4 py-3">
                        {rec ? (
                          <Badge variant={rec.status === "paid" ? "default" : "secondary"} className={rec.status === "paid" ? "bg-accent text-accent-foreground" : ""}>
                            {rec.status}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">Not created</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <SalaryDialog
                            employee={e}
                            year={year}
                            month={month}
                            record={rec}
                            trigger={
                              <Button size="sm" variant="ghost">
                                {rec ? "Edit" : (<><Plus className="mr-1 h-3.5 w-3.5" />Create</>)}
                              </Button>
                            }
                          />
                          {rec && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => togglePaid.mutate(rec)} title={rec.status === "paid" ? "Mark unpaid" : "Mark paid"}>
                                <CheckCircle2 className={`h-4 w-4 ${rec.status === "paid" ? "text-accent" : ""}`} />
                              </Button>
                              <Button asChild size="sm" variant="ghost" title="Payslip">
                                <Link to="/payslip/$recordId" params={{ recordId: rec.id }}><FileText className="h-4 w-4" /></Link>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-semibold tabular-nums ${accent ? "text-accent-foreground" : ""}`}>{value}</div>
    </div>
  );
}

function SalaryDialog({ employee, year, month, record, trigger }: {
  employee: Employee;
  year: number;
  month: number;
  record?: SalaryRecord;
  trigger: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState<number>(Number(record?.base_salary ?? employee.base_salary));
  const [bonus, setBonus] = useState<number>(Number(record?.bonus ?? 0));
  const [deductions, setDeductions] = useState<number>(Number(record?.deductions ?? 0));
  const [advance, setAdvance] = useState<number>(Number(record?.advance ?? 0));
  const [bonusNote, setBonusNote] = useState(record?.bonus_note ?? "");
  const [deductionsNote, setDeductionsNote] = useState(record?.deductions_note ?? "");
  const [advanceNote, setAdvanceNote] = useState(record?.advance_note ?? "");
  const [status, setStatus] = useState(record?.status ?? "unpaid");
  const [paymentMethod, setPaymentMethod] = useState(record?.payment_method ?? "Bank transfer");
  const [notes, setNotes] = useState(record?.notes ?? "");

  const net = Number(base || 0) + Number(bonus || 0) - Number(deductions || 0) - Number(advance || 0);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user?.id;
      if (!owner_id) throw new Error("Not signed in");
      const payload = {
        owner_id,
        employee_id: employee.id,
        period_year: year,
        period_month: month,
        base_salary: base,
        bonus,
        deductions,
        advance,
        bonus_note: bonusNote || null,
        deductions_note: deductionsNote || null,
        advance_note: advanceNote || null,
        net_salary: net,
        status,
        paid_at: status === "paid" ? (record?.paid_at ?? new Date().toISOString()) : null,
        payment_method: paymentMethod || null,
        notes: notes || null,
      };
      if (record) {
        const { error } = await supabase.from("salary_records").update(payload).eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("salary_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Salary saved");
      qc.invalidateQueries({ queryKey: ["payroll-stats"] });
      qc.invalidateQueries({ queryKey: ["payroll-page"] });
      qc.invalidateQueries({ queryKey: ["salary_records"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee.full_name} — {monthName(month)} {year}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Base salary</Label>
              <Input type="number" step="0.01" value={base} onChange={(e) => setBase(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bonus</Label>
              <Input type="number" step="0.01" value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deductions</Label>
              <Input type="number" step="0.01" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bonus reason</Label>
              <Input value={bonusNote} onChange={(e) => setBonusNote(e.target.value)} placeholder="Performance, festival…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deduction reason</Label>
              <Input value={deductionsNote} onChange={(e) => setDeductionsNote(e.target.value)} placeholder="Tax, leave…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Advance taken</Label>
              <Input type="number" step="0.01" value={advance} onChange={(e) => setAdvance(Number(e.target.value))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Advance reason</Label>
              <Input value={advanceNote} onChange={(e) => setAdvanceNote(e.target.value)} placeholder="Medical, travel…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Payment method</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
            <span className="text-sm text-muted-foreground">Net salary</span>
            <span className="font-display text-xl font-semibold tabular-nums">{currency(net)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
