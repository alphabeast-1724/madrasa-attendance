import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      throw redirect({ to: "/teacher" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const loc = useLocation();
  const tab = (path: string) =>
    loc.pathname === path || loc.pathname.startsWith(path + "/");
  const Tab = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className={cn(
        "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
        tab(to)
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
  return (
    <div className="mx-auto max-w-6xl p-4 space-y-4">
      <div className="flex items-center gap-2 border-b overflow-x-auto">
        <Tab to="/admin" label="Dashboard" />
        <Tab to="/admin/classes" label="Classes" />
        <Tab to="/admin/staff" label="Staff" />
        <Tab to="/admin/reports" label="Reports" />
      </div>
      <Outlet />
    </div>
  );
}
