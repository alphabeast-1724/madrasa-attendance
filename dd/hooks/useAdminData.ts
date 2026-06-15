import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/lib/queryKeys";
import { bulkStudentImportSchema } from "@/lib/schemas";
import { APP_CONFIG } from "@/lib/config";

export function useAllClasses() {
  return useQuery({
    queryKey: QK.allClasses(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name, teacher_id, batch, created_at")
        .order("class_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClassDetail(classId: string | undefined) {
  return useQuery({
    enabled: !!classId,
    queryKey: QK.classDetail(classId ?? ""),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, class_name, teacher_id, batch, created_at")
        .eq("id", classId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useAllStudents() {
  return useQuery({
    queryKey: QK.allStudents(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("reg_no, name, father_name, class_id");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClassStudentCounts() {
  return useQuery({
    queryKey: ["admin", "classes", "student-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("class_id");
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((s) => {
        counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useStudentCount() {
  return useQuery({
    queryKey: ["admin", "students", "count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function usePaginatedStudents(classId: string, page: number, search: string = "") {
  const pageSize = APP_CONFIG.pageSize;
  return useQuery({
    queryKey: [...QK.studentsByClass(classId), page, search],
    queryFn: async () => {
      let query = supabase
        .from("students")
        .select("reg_no, name, father_name, class_id", { count: "exact" })
        .eq("class_id", classId)
        .order("name", { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.or(`name.ilike.%${search}%,reg_no.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });
}

export function useDailyAbsenteesView(date: string) {
  return useQuery({
    queryKey: ["office", "daily_absentees", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_absentees_view" as any)
        .select("*")
        .eq("date", date);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useStaffList() {
  return useQuery({
    queryKey: QK.staffList(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, assigned_class_id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      class_name: string;
      teacher_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("classes")
        .insert({
          class_name: vars.class_name,
          teacher_id: vars.teacher_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.allClasses() }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id: string;
      class_name?: string;
      teacher_id?: string | null;
      batch?: string | null;
    }) => {
      const { id, ...rest } = vars;
      const { error } = await supabase
        .from("classes")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: QK.allClasses() });
      qc.invalidateQueries({ queryKey: QK.classDetail(v.id) });
    },
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.allClasses() });
      qc.invalidateQueries({ queryKey: QK.allStudents() });
    },
  });
}

export function useAssignTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      profileId: string;
      classId: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ assigned_class_id: vars.classId })
        .eq("id", vars.profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.staffList() });
      qc.invalidateQueries({ queryKey: QK.allClasses() });
    },
  });
}

export function useUpdateProfileName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; full_name: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: vars.full_name })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.staffList() }),
  });
}

export function useBatchAssignClasses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { teacherId: string; classIds: string[] }) => {
      // 1. Remove this teacher from any classes they were previously assigned to
      await supabase
        .from("classes")
        .update({ teacher_id: null })
        .eq("teacher_id", vars.teacherId);

      // 2. Assign the teacher to the new selected classes
      if (vars.classIds.length > 0) {
        const { error } = await supabase
          .from("classes")
          .update({ teacher_id: vars.teacherId })
          .in("id", vars.classIds);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.allClasses() });
      qc.invalidateQueries({ queryKey: QK.staffList() });
    },
  });
}

export function useBulkImportStudents(targetClassId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (raw: unknown[]) => {
      const rows = bulkStudentImportSchema.parse(raw);
      const payload = rows.map((s) => ({
        reg_no: s.reg_no,
        name: s.name,
        father_name: s.father_name ?? "",
        class_id: targetClassId,
      }));
      const { data, error } = await supabase
        .from("students")
        .upsert(payload, { onConflict: "reg_no" })
        .select();
      if (error) {
        console.error("Bulk import error:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.studentsByClass(targetClassId) });
      qc.invalidateQueries({ queryKey: QK.allStudents() });
    },
  });
}

export function useAddStudent(targetClassId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      reg_no: string;
      name: string;
      father_name: string;
    }) => {
      const { error } = await supabase.from("students").insert({
        ...vars,
        class_id: targetClassId,
      });
      if (error) {
        console.error("Add student error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.studentsByClass(targetClassId) });
      qc.invalidateQueries({ queryKey: QK.allStudents() });
    },
  });
}

export function useDeleteStudent(targetClassId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reg_no: string) => {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("reg_no", reg_no);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.studentsByClass(targetClassId) });
      qc.invalidateQueries({ queryKey: QK.allStudents() });
    },
  });
}

export function useAbsenceLogsRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: QK.logsRange(startDate, endDate),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_logs")
        .select(
          "id, date, student_id, class_id, students(name, father_name), classes(class_name)"
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
