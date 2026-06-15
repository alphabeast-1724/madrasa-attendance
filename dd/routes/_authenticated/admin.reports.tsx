import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { useAbsenceLogsRange, useAllClasses } from "@/hooks/useAdminData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalYYYYMMDD } from "@/lib/date";
import { Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const today = useMemo(() => getLocalYYYYMMDD(), []);
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalYYYYMMDD(d);
  }, []);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);
  const { data: logs, isLoading } = useAbsenceLogsRange(start, end);
  const { data: classes } = useAllClasses();

  const className = (id: string) =>
    classes?.find((c) => c.id === id)?.class_name ?? "—";

  const exportCsv = () => {
    if (!logs || logs.length === 0) {
      toast.info("No absence records in this range");
      return;
    }
    const rows = logs.map((l) => {
      const stu = (l.students as { name?: string; father_name?: string } | null) ?? null;
      return {
        Date: l.date,
        Class: className(l.class_id),
        Reg_No: l.student_id,
        Student_Name: stu?.name ?? "",
        Father_Name: stu?.father_name ?? "",
        Status: "Absent",
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${start}_to_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dailyReports = useMemo(() => {
    if (!classes || !logs) return [];
    
    const targetDate = end; // Use the 'To' date as the reference for daily reports
    const dateLogs = logs.filter(l => l.date === targetDate);
    
    return classes.map(c => {
      const absentees = dateLogs
        .filter(l => l.class_id === c.id)
        .map(l => (l.students as { name?: string } | null)?.name || `#${l.student_id}`)
        .join(", ");
        
      const text = `Madrasa-E-Usmaniya, ${targetDate} absentees, of class ${c.class_name} :- ${absentees || "Nil"}.`;
      return {
        classId: c.id,
        className: c.class_name,
        text,
        count: dateLogs.filter(l => l.class_id === c.id).length
      };
    });
  }, [classes, logs, end]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-3 pb-8">
      <h1 className="text-2xl font-bold">Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Absence Ledger Export</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <Label>To</Label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={exportCsv} disabled={isLoading}>
            <Download className="size-4 mr-1" />
            Download CSV
          </Button>
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `${logs?.length ?? 0} absence records in range.`}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <h2 className="text-lg font-semibold mt-2">WhatsApp Reports ({end})</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        ) : dailyReports.length > 0 ? (
          dailyReports.map((report) => (
            <Card key={report.classId}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium">{report.className}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    "{report.text}"
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="shrink-0"
                  onClick={() => copyToClipboard(report.text)}
                >
                  <Copy className="size-3 mr-1" />
                  Copy
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No data available for this date.</p>
        )}
      </div>

      {logs && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview (latest 50)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded divide-y text-sm">
              {logs.slice(0, 50).map((l) => {
                const stu = (l.students as { name?: string } | null) ?? null;
                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{stu?.name ?? `#${l.student_id}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {className(l.class_id)} · #{l.student_id}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {l.date}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
