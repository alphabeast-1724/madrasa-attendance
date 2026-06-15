import { createFileRoute } from "@tanstack/react-router";
import { useDailyAbsenteesView } from "@/hooks/useAdminData";
import { getLocalYYYYMMDD, formatDateLong } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Users, ChevronLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/office")({
  component: OfficeDashboard,
});

function OfficeDashboard() {
  const date = getLocalYYYYMMDD();
  const { data: absentees, isLoading } = useDailyAbsenteesView(date);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const grouped = useMemo(() => {
    if (!absentees) return {};
    return absentees.reduce((acc: any, curr: any) => {
      const classLabel = `${curr.class_name} ${curr.batch ? `(${curr.batch})` : ""}`;
      if (!acc[classLabel]) acc[classLabel] = [];
      acc[classLabel].push(curr);
      return acc;
    }, {});
  }, [absentees]);

  if (isLoading) return <p className="text-center p-12 text-muted-foreground">Loading absentee list...</p>;

  const classNames = Object.keys(grouped).sort();

  if (selectedClass) {
    const students = grouped[selectedClass] || [];
    return (
      <div className="mx-auto max-w-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClass(null)}>
            <ChevronLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{selectedClass}</h1>
            <p className="text-xs text-muted-foreground">{formatDateLong(date)}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {students.map((s: any) => (
            <Card key={s.reg_no} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground">#{s.reg_no}</p>
                  <p className="font-semibold">{s.student_name}</p>
                  <p className="text-xs text-muted-foreground">S/O {s.father_name}</p>
                </div>
                <Button size="icon" variant="outline" className="rounded-full">
                  <Phone className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Office Dashboard</h1>
          <p className="text-sm text-muted-foreground">{formatDateLong(date)}</p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Users className="size-4 mr-2" /> {absentees?.length || 0} Total
        </Badge>
      </div>

      {classNames.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No absentees reported for today yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classNames.map((className) => (
            <Card 
              key={className} 
              className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
              onClick={() => setSelectedClass(className)}
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{className}</span>
                  <Badge variant={grouped[className].length > 5 ? "destructive" : "secondary"}>
                    {grouped[className].length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Click to view students</p>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
