import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useProfile } from "@/hooks/useAuth";
import {
  useClassRoster,
  useDailyAbsenceLogs,
  useSubmitAttendance,
  draftKey,
} from "@/hooks/useAttendance";
import { useClassDetail, useAllClasses } from "@/hooks/useAdminData";
import { getLocalYYYYMMDD, formatDateLong } from "@/lib/date";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Check, X, ClipboardCheck, WifiOff, CheckCircle2, ChevronRight, School, MessageSquare, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { APP_CONFIG } from "@/lib/config";

const copyWhatsAppReport = (institution: string, date: string, className: string, batch: string, absentees: any[]) => {
  const names = absentees.length > 0 ? absentees.map(s => s.name).join(", ") : "Nil";
  const template = APP_CONFIG.whatsappTemplate;
  const message = template
    .replace("{institution}", institution)
    .replace("{date}", formatDateLong(date))
    .replace("{class}", className)
    .replace("{batch}", batch ? `(${batch})` : "")
    .replace("{names}", names);
  
  navigator.clipboard.writeText(message);
  toast.success("WhatsApp report copied to clipboard");
};

export const Route = createFileRoute("/_authenticated/teacher")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: TeacherConsole,
});

type StateMap = Record<string, "present" | "absent">;

function TeacherConsole() {
  const { data: session } = useSession();
  const uid = session?.user?.id;
  const { data: profile, isLoading: profLoading } = useProfile(uid);
  const { data: allClasses } = useAllClasses();
  
  const myClasses = useMemo(() => {
    if (!allClasses || !uid) return [];
    // Filter classes where this user is the assigned teacher
    return allClasses.filter(c => c.teacher_id === uid);
  }, [allClasses, uid]);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Auto-select if only one class and not yet selected
  useEffect(() => {
    if (selectedClassId || myClasses.length === 0) return;
    if (myClasses.length === 1) {
      setSelectedClassId(myClasses[0].id);
    }
  }, [myClasses, selectedClassId]);

  const { data: classInfo } = useClassDetail(selectedClassId ?? undefined);
  const date = useMemo(() => getLocalYYYYMMDD(), []);

  const { data: students, isLoading: rosterLoading } = useClassRoster(selectedClassId ?? undefined);
  const { data: existingLogs } = useDailyAbsenceLogs(selectedClassId ?? undefined, date);
  const submit = useSubmitAttendance(selectedClassId ?? "");

  const [state, setState] = useState<StateMap>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const [hasUnsyncedData, setHasUnsyncedData] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    
    // Check for unsynced data periodically or on load
    const checkSync = () => {
      if (!selectedClassId) return;
      const cached = localStorage.getItem(draftKey(selectedClassId, date));
      setHasUnsyncedData(!!cached);
    };
    checkSync();
    
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [selectedClassId, date]);

  // Hydrate state: prefer local draft → otherwise present + server absences
  useEffect(() => {
    if (!selectedClassId || !students) return;
    const initial: StateMap = {};
    students.forEach((s) => {
      initial[s.reg_no] = "present";
    });
    try {
      const cached = localStorage.getItem(draftKey(selectedClassId, date));
      if (cached) {
        const parsed = JSON.parse(cached) as StateMap;
        for (const s of students) {
          if (parsed[s.reg_no]) initial[s.reg_no] = parsed[s.reg_no];
        }
        setState(initial);
        return;
      }
    } catch {
      /* ignore */
    }
    if (existingLogs) {
      existingLogs.forEach((log) => {
        if (initial[log.student_id] !== undefined)
          initial[log.student_id] = "absent";
      });
    }
    setState(initial);
  }, [selectedClassId, students, existingLogs, date]);

  const setStatus = (regNo: string, value: "present" | "absent") => {
    setState((prev) => {
      const next = { ...prev, [regNo]: value };
      if (selectedClassId) {
        try {
          localStorage.setItem(draftKey(selectedClassId, date), JSON.stringify(next));
        } catch {
          /* quota — ignore */
        }
      }
      return next;
    });
  };

  if (profLoading) {
    return (
      <p className="text-center p-12 text-muted-foreground">Loading…</p>
    );
  }

  if (isSuccess) {
    const roster = students ?? [];
    const absentees = roster.filter((s) => state[s.reg_no] === "absent");
    return (
      <div className="mx-auto max-w-md p-6 mt-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-emerald-100 p-3 animate-in zoom-in duration-300">
            <CheckCircle2 className="size-12 text-emerald-600" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Attendance Submitted!</h2>
          <p className="text-muted-foreground text-sm">
            Attendance for <strong>{classInfo?.class_name}</strong> has been recorded successfully.
          </p>
        </div>
        
        <Card className="p-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{roster.length - absentees.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Absent</p>
            <p className="text-2xl font-bold text-destructive">{absentees.length}</p>
          </div>
        </Card>

        <div className="space-y-2">
          <Button 
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={() => copyWhatsAppReport(
              APP_CONFIG.institutionName,
              date,
              classInfo?.class_name ?? "Class",
              classInfo?.batch ?? "",
              absentees
            )}
          >
            <MessageSquare className="size-4" />
            Copy WhatsApp Report
          </Button>
          <Button onClick={() => {
            setIsSuccess(false);
            setSelectedClassId(null);
            setState({});
            setHasUnsyncedData(false);
          }} className="w-full py-6 text-lg">
            Back to Classes
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedClassId) {
    return (
      <div className="mx-auto max-w-md p-4 space-y-4">
        <div className="space-y-1 mb-6">
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name?.split(' ')[0]}</h1>
          <p className="text-sm text-muted-foreground">Select a class to start attendance</p>
        </div>

        {myClasses.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <div className="mx-auto bg-muted rounded-full size-12 flex items-center justify-center">
              <School className="size-6 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold">No classes assigned</h2>
              <p className="text-xs text-muted-foreground px-4">
                Please ask an administrator to assign you to a class.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-3">
            {myClasses.map((c) => (
              <Card 
                key={c.id} 
                className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedClassId(c.id)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <School className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold">{c.class_name}</h3>
                      {c.batch && (
                        <p className="text-xs text-primary font-medium">{c.batch}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">Tap to open roster</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (rosterLoading) {
    return (
      <p className="text-center p-12 text-muted-foreground">
        Loading roster…
      </p>
    );
  }

  const roster = students ?? [];
  const absentees = roster.filter((s) => state[s.reg_no] === "absent");
  const presentCount = roster.length - absentees.length;

  return (
    <div className="mx-auto max-w-md p-4 pb-28 space-y-3">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="-ml-2 size-8"
              onClick={() => setSelectedClassId(null)}
            >
              <X className="size-4" />
            </Button>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                {classInfo?.class_name ?? "Your Class"}
              </h1>
              {classInfo?.batch && (
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  {classInfo.batch}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateLong(date)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Strength</p>
            <p className="font-bold text-2xl leading-none">{roster.length}</p>
          </div>
        </div>
        {!online ? (
          <div className="mt-3 flex items-center gap-2 text-xs rounded-md bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1.5">
            <WifiOff className="size-3.5" />
            Offline — changes saved locally. Sync on submission.
          </div>
        ) : hasUnsyncedData ? (
          <div className="mt-3 flex items-center gap-2 text-xs rounded-md bg-blue-50 text-blue-900 border border-blue-200 px-2 py-1.5">
            <AlertCircle className="size-3.5" />
            Pending Sync — click 'Review' to submit local changes.
          </div>
        ) : null}
      </Card>

      {roster.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground space-y-3">
          <p>No students in this class yet.</p>
          <Button variant="outline" size="sm" onClick={() => setSelectedClassId(null)}>
            Go Back
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {roster.map((s) => {
            const isAbsent = state[s.reg_no] === "absent";
            return (
              <Card
                key={s.reg_no}
                className={`p-3 transition-colors ${
                  isAbsent
                    ? "bg-destructive/5 border-destructive/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus(s.reg_no, isAbsent ? "present" : "absent")}
                    className="flex-1 text-left min-h-[48px]"
                  >
                    <p className="text-[10px] font-bold text-muted-foreground tracking-wider">
                      #{s.reg_no}
                    </p>
                    <p
                      className={`font-semibold leading-tight ${
                        isAbsent ? "text-destructive" : ""
                      }`}
                    >
                      {s.name}
                    </p>
                    {s.father_name && (
                      <p className="text-xs text-muted-foreground">
                        S/O {s.father_name}
                      </p>
                    )}
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant={!isAbsent ? "default" : "outline"}
                      className={
                        !isAbsent
                          ? "bg-emerald-600 hover:bg-emerald-600/90 text-white"
                          : ""
                      }
                      onClick={() => setStatus(s.reg_no, "present")}
                      aria-label="Mark present"
                    >
                      <Check className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isAbsent ? "destructive" : "outline"}
                      onClick={() => setStatus(s.reg_no, "absent")}
                      aria-label="Mark absent"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-md p-3 flex gap-2">
          <div className="flex-1 text-xs text-muted-foreground self-center px-2">
            <span className="text-emerald-600 font-semibold">
              {presentCount}
            </span>{" "}
            present ·{" "}
            <span className="text-destructive font-semibold">
              {absentees.length}
            </span>{" "}
            absent
          </div>
          <Button
            disabled={roster.length === 0}
            onClick={() => setReviewOpen(true)}
          >
            <ClipboardCheck className="size-4 mr-1" />
            Review
          </Button>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {formatDateLong(date)} · {classInfo?.class_name}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2">
                <p className="text-[10px] font-bold text-muted-foreground">
                  TOTAL
                </p>
                <p className="text-xl font-bold">{roster.length}</p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                <p className="text-[10px] font-bold text-emerald-700">
                  PRESENT
                </p>
                <p className="text-xl font-bold text-emerald-700">
                  {presentCount}
                </p>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <p className="text-[10px] font-bold text-destructive">
                  ABSENT
                </p>
                <p className="text-xl font-bold text-destructive">
                  {absentees.length}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">
                Absentees
              </p>
              {absentees.length === 0 ? (
                <p className="text-sm rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-center">
                  Perfect attendance.
                </p>
              ) : (
                <div className="max-h-48 overflow-auto space-y-1 pr-1">
                  {absentees.map((s) => (
                    <div
                      key={s.reg_no}
                      className="flex justify-between text-sm rounded border bg-destructive/5 px-2 py-1.5"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        #{s.reg_no}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={submit.isPending}
            >
              Back
            </Button>
            <Button
              disabled={submit.isPending}
              onClick={() => {
                submit.mutate(
                  {
                    date,
                    absenteeIds: absentees.map((s) => s.reg_no),
                  },
                  {
                    onSuccess: () => {
                      setIsSuccess(true);
                      setReviewOpen(false);
                      toast.success("Attendance submitted successfully");
                    },
                    onError: (err: any) => {
                      console.error("Full submission error:", err);
                      
                      // Handle Supabase errors which might be objects
                      let msg = "Submission failed";
                      if (err?.message) msg = err.message;
                      if (err?.error_description) msg = err.error_description;
                      
                      toast.error(`Submission Failed: ${msg}`, {
                        description: err?.details || "Please check your internet connection or try logging out and back in.",
                        duration: 8000,
                      });
                    },
                  }
                );
              }}
            >
              {submit.isPending ? "Submitting…" : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
