import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currency, monthName } from "@/lib/format";
import { Users, Banknote, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", year, month],
    queryFn: async () => {
      const [activeRes, baseRows, recordsRes, paidRows, recentRes] = await Promise.all([
        supabase.from("employees").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("employees").select("base_salary").eq("status", "active"),
        supabase
          .from("salary_records")
          .select("*", { count: "exact", head: true })
          .eq("period_year", year)
          .eq("period_month", month),
        supabase
          .from("salary_records")
          .select("net_salary, status")
          .eq("period_year", year)
          .eq("period_month", month)
          .eq("status", "paid"),
        supabase
          .from("employees")
          .select("id, full_name, base_salary")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (activeRes.error) throw activeRes.error;
      if (baseRows.error) throw baseRows.error;
      if (recordsRes.error) throw recordsRes.error;
      if (paidRows.error) throw paidRows.error;
      if (recentRes.error) throw recentRes.error;

      const activeCount = activeRes.count ?? 0;
      const monthlyBase = (baseRows.data ?? []).reduce((s, e) => s + Number(e.base_salary || 0), 0);
      const paid = paidRows.data ?? [];
      const paidTotal = paid.reduce((s, r) => s + Number(r.net_salary || 0), 0);
      const paidCount = paid.length;

      return {
        activeCount,
        monthlyBase,
        paidTotal,
        recordCount: recordsRes.count ?? 0,
        paidCount,
        unpaidCount: Math.max(0, activeCount - paidCount),
        recentEmployees: recentRes.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Active employees", value: (data?.activeCount ?? 0).toString(), icon: Users, tint: "bg-secondary text-primary" },
    { label: `${monthName(month)} payroll (base)`, value: currency(data?.monthlyBase ?? 0), icon: Banknote, tint: "bg-secondary text-primary" },
    { label: "Paid this month", value: currency(data?.paidTotal ?? 0), icon: CheckCircle2, tint: "bg-accent/15 text-accent-foreground" },
    { label: "Pending payments", value: (data?.unpaidCount ?? 0).toString(), icon: Clock, tint: "bg-warning/20 text-warning-foreground" },
  ];

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}</p>
          <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
        </div>
        <Button asChild>
          <Link to="/payroll">Go to payroll <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${s.tint}`}>
                <s.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 font-display text-2xl font-semibold tabular-nums">
              {isLoading ? "—" : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-display text-lg font-semibold">Recent employees</h2>
          <div className="mt-4 space-y-2">
            {(data?.recentEmployees ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-secondary">
                <div className="text-sm font-medium">{e.full_name}</div>
                <div className="text-sm tabular-nums text-muted-foreground">{currency(e.base_salary)}</div>
              </div>
            ))}
            {(data?.recentEmployees ?? []).length === 0 && !isLoading && (
              <div className="text-sm text-muted-foreground">No employees yet. <Link to="/employees" className="text-primary underline">Add your first one</Link>.</div>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="font-display text-lg font-semibold">This month at a glance</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Period</span><span className="font-medium">{monthName(month)} {year}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Records created</span><span className="font-medium">{data?.recordCount ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="font-medium text-accent-foreground">{data?.paidCount ?? 0}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Unpaid (active employees not yet paid)</span><span className="font-medium">{data?.unpaidCount ?? 0}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
