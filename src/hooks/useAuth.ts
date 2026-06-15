import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Session } from "@supabase/supabase-js";

const syncCookieToSession = (session: Session | null) => {
  if (typeof document === "undefined") return;

  if (session) {
    const isSecure = window.location.protocol === "https:";
    // Use max-age (seconds) for more reliable persistence
    const maxAge = session.expires_in;
    document.cookie = `sb-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
  } else {
    // Clear cookie
    document.cookie = "sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }
};

export function useSession() {
  const qc = useQueryClient();

  useEffect(() => {
    // 1. Immediate sync on mount
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      syncCookieToSession(session);
    };
    init();

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(QK.session(), session);
      syncCookieToSession(session);

      if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
        qc.invalidateQueries({ queryKey: ["auth"] });
        qc.invalidateQueries({ queryKey: ["admin"] });
        qc.invalidateQueries({ queryKey: ["students"] });
        qc.invalidateQueries({ queryKey: ["logs"] });
      }
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  return useQuery({
    queryKey: QK.session(),
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: QK.profile(userId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, assigned_class_id, created_at")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUserRole(userId: string | undefined) {
  return useQuery({
    enabled: !!userId,
    queryKey: QK.role(userId ?? ""),
    queryFn: async (): Promise<"admin" | "staff" | "office"> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      if (data?.some((r) => r.role === "admin")) return "admin";
      if (data?.some((r) => r.role === "office")) return "office";
      return "staff";
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}
