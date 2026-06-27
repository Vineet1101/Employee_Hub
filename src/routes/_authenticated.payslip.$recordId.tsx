import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency, monthName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Banknote, ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payslip/$recordId")({
  component: Payslip,
});

function Payslip() {
  const { recordId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payslip", recordId],
    queryFn: async () => {
      const { data: rec, error: e1 } = await supabase.from("salary_records").select("*").eq("id", recordId).single();
      if (e1) throw e1;
      const { data: emp, error: e2 } = await supabase.from("employees").select("*").eq("id", rec.employee_id).single();
      if (e2) throw e2;
      return { rec, emp };
    },
  });

  if (isLoading) return <div className="p-10 text-sm text-muted-foreground">Loading payslip…</div>;
  if (error || !data) return <div className="p-10 text-sm text-destructive">Could not load payslip.</div>;

  const { rec, emp } = data;
  const period = `${monthName(rec.period_month)} ${rec.period_year}`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="no-print mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/payroll"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
        </Button>
        <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between p-8 text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
          <div>
            <div className="flex items-center gap-2 font-display text-lg font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15"><Banknote className="h-5 w-5" /></span>
              Payslip
            </div>
            <p className="mt-1 text-sm text-white/80">Pay period — {period}</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-white/70">Status</div>
            <div className="mt-1 inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-medium capitalize">{rec.status}</div>
          </div>
        </div>

        <div className="grid gap-6 p-8 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Employee</div>
            <div className="mt-1 font-display text-lg font-semibold">{emp.full_name}</div>
            <div className="text-sm text-muted-foreground">{emp.position || "—"}{emp.department ? ` · ${emp.department}` : ""}</div>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="Employee ID" value={emp.employee_code} />
              <Row label="Email" value={emp.email || "—"} />
              <Row label="Joined" value={new Date(emp.joining_date).toLocaleDateString()} />
            </dl>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Bank details</div>
            <dl className="mt-3 space-y-1 text-sm">
              <Row label="Bank" value={emp.bank_name || "—"} />
              <Row label="Account holder" value={emp.bank_account_holder || emp.full_name} />
              <Row label="Account no." value={emp.bank_account_number || "—"} />
              <Row label="IFSC" value={emp.bank_ifsc || "—"} />
              <Row label="Method" value={rec.payment_method || "—"} />
              {rec.paid_at && <Row label="Paid on" value={new Date(rec.paid_at).toLocaleDateString()} />}
            </dl>
          </div>
        </div>

        <div className="border-t border-border p-8">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Earnings & deductions</div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              <Line label="Base salary" amount={Number(rec.base_salary)} />
              <Line label={`Bonus${rec.bonus_note ? ` — ${rec.bonus_note}` : ""}`} amount={Number(rec.bonus)} positive />
              <Line label={`Deductions${rec.deductions_note ? ` — ${rec.deductions_note}` : ""}`} amount={-Number(rec.deductions)} />
              {Number(rec.advance) > 0 && (
                <Line label={`Advance${rec.advance_note ? ` — ${rec.advance_note}` : ""}`} amount={-Number(rec.advance)} />
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground/20">
                <td className="pt-3 font-display text-lg font-semibold">Net pay</td>
                <td className="pt-3 text-right font-display text-2xl font-semibold tabular-nums">{currency(rec.net_salary)}</td>
              </tr>
            </tfoot>
          </table>
          {rec.notes && <p className="mt-6 text-xs text-muted-foreground">Note: {rec.notes}</p>}
          <p className="mt-8 text-xs text-muted-foreground">This is a computer-generated payslip and does not require a signature.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Line({ label, amount, positive }: { label: string; amount: number; positive?: boolean }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2">{label}</td>
      <td className={`py-2 text-right tabular-nums ${positive ? "text-accent-foreground" : amount < 0 ? "text-destructive" : ""}`}>
        {amount < 0 ? `− ${currency(Math.abs(amount))}` : currency(amount)}
      </td>
    </tr>
  );
}
