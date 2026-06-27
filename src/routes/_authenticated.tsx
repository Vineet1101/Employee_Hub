import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, LayoutDashboard, Users, ReceiptText, LogOut, UserSearch, Building2, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/payroll", label: "Payroll", icon: ReceiptText },
  { to: "/candidates", label: "Candidates", icon: UserSearch },
  { to: "/companies", label: "Companies", icon: Building2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-6 py-5 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Banknote className="h-4 w-4" />
          </span>
          Payroll
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 text-xs">
            <div className="font-medium text-sidebar-foreground">{user.user_metadata?.full_name || "Signed in"}</div>
            <div className="truncate text-sidebar-foreground/60">{user.email}</div>
          </div>
          <Button onClick={signOut} variant="outline" size="sm" className="w-full bg-transparent text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="no-print flex items-center justify-between border-b border-border bg-card px-6 py-3 md:hidden">
          <span className="font-display font-semibold">Payroll</span>
          <Button onClick={signOut} variant="ghost" size="sm"><LogOut className="h-4 w-4" /></Button>
        </div>
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
            return (
              <Link key={n.to} to={n.to} className={cn("flex items-center gap-2 rounded-md px-3 py-1.5 text-sm", active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground")}>
                <n.icon className="h-4 w-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <Outlet />
      </main>
    </div>
  );
}
