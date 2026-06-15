import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import type { AttendanceBatchSubmission } from "@/lib/schemas";

export function useClassRoster(classId: string | undefined) {
  return useQuery({
    enabled: !!classId,
    queryKey: QK.studentsByClass(classId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("reg_no, name, father_name, class_id")
        .eq("class_id", classId!)
        .order("reg_no", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDailyAbsenceLogs(
  classId: string | undefined,
  date: string
) {
  return useQuery({
    enabled: !!classId,
    queryKey: QK.logsByDate(classId ?? "", date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("student_id")
        .eq("class_id", classId!)
        .eq("date", date);
      if (error) throw error;
      return (data ?? []) as { student_id: string }[];
    },
  });
}

export function draftKey(classId: string, date: string) {
  return `madrasa_attendance_draft__${classId}__${date}`;
}

export function useSubmitAttendance(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (submission: AttendanceBatchSubmission) => {
      // Ensure all IDs are strings to match the new schema
      const stringIds = submission.absenteeIds.map(id => String(id));
      
      console.log("Submitting attendance:", {
        p_class_id: classId,
        p_date: submission.date,
        p_absentee_ids: stringIds,
      });

      const { error } = await supabase.rpc("submit_daily_attendance", {
        p_class_id: classId,
        p_date: submission.date,
        p_absentee_ids: stringIds,
      });

      if (error) {
        console.error("Supabase RPC error:", error);
        throw error;
      }
      
      // Successful sync → drop the offline draft
      try {
        localStorage.removeItem(draftKey(classId, submission.date));
      } catch {
        /* no-op */
      }
      return { count: submission.absenteeIds.length };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: QK.logsByDate(classId, variables.date),
      });
      qc.invalidateQueries({ queryKey: ["logs"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
