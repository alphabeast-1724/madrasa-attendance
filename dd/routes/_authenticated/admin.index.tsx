import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAllClasses, useStudentCount, useStaffList } from "@/hooks/useAdminData";
import { useDailyAbsenceLogs } from "@/hooks/useAttendance";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getLocalYYYYMMDD, formatDateLong } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QK } from "@/lib/queryKeys";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function computeMetrics(total: number, absent: number) {
  if (total <= 0) return { present: 0, rate: "0.0" };
  const present = total - absent;
  return { present, rate: ((present / total) * 100).toFixed(1) };
}

function AdminDashboard() {
  const date = useMemo(() => getLocalYYYYMMDD(), []);
  const { data: classes } = useAllClasses();
  const { data: totalStudents } = useStudentCount();
  const { data: staff } = useStaffList();

  const { data: todayAbsences } = useQuery({
    queryKey: QK.todayAbsenceCount(date),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("date", date);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const total = totalStudents ?? 0;
  const absent = todayAbsences ?? 0;
  const { present, rate } = computeMetrics(total, absent);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{formatDateLong(date)}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard title="Classes" value={classes?.length ?? 0} />
        <StatCard title="Students" value={total} />
        <StatCard title="Staff" value={staff?.length ?? 0} />
        <StatCard title="Today's Attendance" value={`${rate}%`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="Present Today" value={present} accent="emerald" />
        <StatCard title="Absent Today" value={absent} accent="destructive" />
        <StatCard
          title="Avg / Class"
          value={
            classes?.length
              ? Math.round(total / classes.length).toString()
              : "0"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick start</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1.5">
          <p>1. Create classes in the <b>Classes</b> tab.</p>
          <p>2. Import students from CSV inside each class.</p>
          <p>3. Assign teachers to classes in the <b>Staff</b> tab.</p>
          <p>4. Teachers mark attendance from the <b>Teacher</b> view.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string | number;
  accent?: "emerald" | "destructive";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {title}
        </p>
        <p className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
