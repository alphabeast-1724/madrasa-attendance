import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import Papa from "papaparse";
import {
  useClassDetail,
  useUpdateClass,
  useStaffList,
  useBulkImportStudents,
  useAddStudent,
  useDeleteStudent,
  usePaginatedStudents,
} from "@/hooks/useAdminData";
import {
  bulkStudentImportSchema,
  studentFormSchema,
} from "@/lib/schemas";
import { APP_CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Upload, UserPlus, Trash2, Search, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_authenticated/admin/classes/$classId"
)({
  component: ClassDetailPage,
});

function ClassDetailPage() {
  const { classId } = Route.useParams();
  const { data: classInfo, isLoading } = useClassDetail(classId);
  const { data: staff } = useStaffList();
  
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: rosterData, isLoading: rosterLoading } = usePaginatedStudents(classId, page, debouncedSearch);
  const roster = rosterData?.data ?? [];
  const totalCount = rosterData?.count ?? 0;
  const totalPages = Math.ceil(totalCount / APP_CONFIG.pageSize);

  const updateClass = useUpdateClass();
  const importMut = useBulkImportStudents(classId);
  const addOne = useAddStudent(classId);
  const deleteOne = useDeleteStudent(classId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ reg_no: "", name: "", father_name: "" });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          // Normalize and map keys to schema expected fields
          const normalized = (res.data as any[]).map((row) => {
            const obj: any = {};
            for (const key in row) {
              const k = key.toLowerCase().trim();
              let target = k.replace(/[\s-]+/g, "_");
              
              // Map common synonyms
              if (k.includes("reg") || k.includes("id") || k.includes("number")) target = "reg_no";
              if (k.includes("student") || k.includes("full name")) target = "name";
              if (k.includes("father") || k.includes("parent")) target = "father_name";
              
              obj[target] = row[key];
            }
            return obj;
          });

          const parsed = bulkStudentImportSchema.safeParse(normalized);
          if (!parsed.success) {
            const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(", ");
            toast.error(`CSV Validation Error: ${issues.slice(0, 100)}...`);
            return;
          }

          importMut.mutate(parsed.data, {
            onSuccess: (d) =>
              toast.success(`Imported ${d?.length ?? 0} students`),
            onError: (err) =>
              toast.error(err instanceof Error ? err.message : "Import failed"),
          });
        } catch (err: unknown) {
          toast.error("An unexpected error occurred during import");
          console.error(err);
        } finally {
          if (fileRef.current) fileRef.current.value = "";
        }
      },
      error: (err) => toast.error(err.message),
    });
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!classInfo)
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Class not found.{" "}
          <Link to="/admin/classes" className="underline">
            Back
          </Link>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/classes">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{classInfo.class_name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Teacher</Label>
            <Select
              value={classInfo.teacher_id ?? "none"}
              onValueChange={(v) => {
                updateClass.mutate(
                  {
                    id: classInfo.id,
                    teacher_id: v === "none" ? null : v,
                  },
                  {
                    onSuccess: () => toast.success("Teacher updated"),
                    onError: (e) =>
                      toast.error(e instanceof Error ? e.message : "Failed"),
                  }
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— No teacher —</SelectItem>
                {staff?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Batch / Session</Label>
            <Input
              placeholder="e.g. 4:30 - 5:30"
              defaultValue={classInfo.batch ?? ""}
              onBlur={(e) => {
                if (e.target.value !== (classInfo.batch ?? "")) {
                  updateClass.mutate(
                    { id: classInfo.id, batch: e.target.value },
                    {
                      onSuccess: () => toast.success("Batch updated"),
                      onError: (e) =>
                        toast.error(e instanceof Error ? e.message : "Failed"),
                    }
                  );
                }
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Specify the time or batch name. Teachers assigned to this class
              will see it in their dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>Roster</span>
              <Badge variant="secondary" className="ml-1 text-[10px]">{totalCount}</Badge>
            </div>
            
            <div className="flex flex-1 items-center gap-2 max-w-sm">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name or ID..."
                  className="pl-8 h-8 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={onFile}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => fileRef.current?.click()}
                  disabled={importMut.isPending}
                  title="Import CSV"
                >
                  <Upload className="size-4" />
                </Button>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" className="size-8" title="Add Student">
                      <UserPlus className="size-4" />
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add student</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <div>
                      <Label>Reg No</Label>
                      <Input
                        value={form.reg_no}
                        onChange={(e) =>
                          setForm({ ...form, reg_no: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={form.name}
                        onChange={(e) =>
                          setForm({ ...form, name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Father name</Label>
                      <Input
                        value={form.father_name}
                        onChange={(e) =>
                          setForm({ ...form, father_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const parsed = studentFormSchema.safeParse(form);
                        if (!parsed.success)
                          return toast.error("Check the fields");
                        addOne.mutate(parsed.data, {
                          onSuccess: () => {
                            toast.success("Student added");
                            setForm({ reg_no: "", name: "", father_name: "" });
                            setAddOpen(false);
                          },
                          onError: (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Failed"
                            ),
                        });
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            CSV columns: <code>reg_no,name,father_name</code> (header row
            required).
          </p>
          {!roster || roster.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No students yet.
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              {roster.map((s) => (
                <div
                  key={s.reg_no}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">
                      #{s.reg_no}
                    </p>
                    <p className="font-medium">{s.name}</p>
                    {s.father_name && (
                      <p className="text-xs text-muted-foreground">
                        S/O {s.father_name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Remove ${s.name} (#${s.reg_no})?`)) {
                        deleteOne.mutate(s.reg_no, {
                          onSuccess: () => toast.success("Removed"),
                          onError: (e) =>
                            toast.error(
                              e instanceof Error ? e.message : "Failed"
                            ),
                        });
                      }
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {totalPages > 1 && (
          <div className="border-t p-3 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
