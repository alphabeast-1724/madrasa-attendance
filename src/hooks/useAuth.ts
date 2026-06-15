import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { Session } from "@supabase/supabase-js";

export function useSession() {
  const qc = useQueryClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      qc.setQueryData(QK.session(), session);

      // Sync session to cookie for SSR
      if (typeof document !== "undefined") {
        if (session) {
          const expires = new Date(session.expires_at! * 1000).toUTCString();
          document.cookie = `sb-auth-token=${session.access_token}; path=/; expires=${expires}; SameSite=Lax; Secure`;
        } else {
          document.cookie = "sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      }

      // Invalidate user-scoped caches on sign-in/out/refresh
      qc.invalidateQueries({ queryKey: ["auth"] });
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["logs"] });
    });
    return () => subscription.unsubscribe();
  }, [qc]);

  return useQuery({
    queryKey: QK.session(),
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: Infinity,
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
