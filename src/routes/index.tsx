import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowRight, Banknote, Users, FileText, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-brand)" }}>
              <Banknote className="h-4 w-4" />
            </span>
            Payroll
          </div>
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Built for small teams
          </span>
          <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Run payroll for your team <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-money)" }}>without the spreadsheets.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            One dashboard for employees, joining dates, bank details, monthly salaries, bonuses, deductions and printable payslips.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/auth">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            { icon: Users, title: "Employee directory", desc: "Names, IDs, joining dates, positions and bank details all in one place." },
            { icon: Banknote, title: "Monthly payroll", desc: "Run salaries with bonuses & deductions. Mark paid, track unpaid." },
            { icon: FileText, title: "Instant payslips", desc: "Generate clean, printable payslips for any month with one click." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-accent" />
          Your data is private — only you can see your employees and salary records.
        </div>
      </main>
    </div>
  );
}
