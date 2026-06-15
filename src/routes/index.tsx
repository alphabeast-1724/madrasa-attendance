import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getCookie } from "../server";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ request }: any) => {
    let sessionToken: string | undefined;

    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      sessionToken = data.session?.access_token;
    } else {
      sessionToken = getCookie(request, "sb-auth-token");
    }

    if (!sessionToken) throw redirect({ to: "/login" });

    // On the server, we might need a dummy supabase client if we want to check roles
    // but for now, we just check if token exists. 
    // If it's the client, we can use the real client.
    if (typeof window !== "undefined") {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw redirect({ to: "/login" });
      const uid = session.user.id;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      
      if (roles?.some((r) => r.role === "admin")) {
        throw redirect({ to: "/admin" });
      }
      if (roles?.some((r) => r.role === "office")) {
        throw redirect({ to: "/office" });
      }
      throw redirect({ to: "/teacher" });
    }
  },
  component: () => (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground animate-pulse">Loading...</p>
    </div>
  ),
});
