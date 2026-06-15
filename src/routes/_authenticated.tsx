import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile, useUserRole, signOut } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, ClipboardList, PhoneCall } from "lucide-react";
import { getCookie } from "../server";
import { APP_CONFIG } from "@/lib/config";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Only run auth checks on the client.
    // This allows hash routing to work and Supabase to restore from localStorage.
    if (typeof window === "undefined") return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const { data: session } = useSession();
  const uid = session?.user?.id;
  const { data: profile } = useProfile(uid);
  const { data: role } = useUserRole(uid);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="font-bold text-sm sm:text-base truncate">
            {APP_CONFIG.institutionName}
          </Link>
          <nav className="flex items-center gap-1">
            {(role === "admin" || role === "office") && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/office">
                  <PhoneCall className="size-4" /> Office
                </Link>
              </Button>
            )}
            {role === "admin" && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/admin">
                  <LayoutDashboard className="size-4" /> Admin
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link to="/teacher">
                <ClipboardList className="size-4" /> Teacher
              </Link>
            </Button>
            <span className="hidden md:inline text-xs text-muted-foreground px-2">
              {profile?.full_name} · {role}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline ml-1">Sign out</span>
            </Button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
