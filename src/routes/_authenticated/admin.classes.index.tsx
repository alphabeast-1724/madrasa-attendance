import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAllClasses,
  useCreateClass,
  useDeleteClass,
  useStaffList,
  useClassStudentCounts,
} from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/classes/")({
  component: ClassesPage,
});

function ClassCard({ 
  classItem, 
  staff, 
  studentCount,
  onDelete 
}: { 
  classItem: any, 
  staff: any[], 
  studentCount: number,
  onDelete: (id: string, name: string) => void 
}) {
  const teacherName = staff?.find((s) => s.id === classItem.teacher_id)?.full_name ?? "—";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{classItem.class_name}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(classItem.id, classItem.class_name)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-1">
        <p>
          Teacher:{" "}
          <span className="text-foreground font-medium">
            {teacherName}
          </span>
        </p>
        {classItem.batch && (
          <p>
            Batch:{" "}
            <span className="text-foreground font-medium">
              {classItem.batch}
            </span>
          </p>
        )}
        <p>
          Students:{" "}
          <span className="text-foreground font-medium">
            {studentCount}
          </span>
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link
            to="/admin/classes/$classId"
            params={{ classId: classItem.id }}
          >
            Open <ChevronRight className="size-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ClassesPage() {
  const { data: classes, isLoading: classesLoading } = useAllClasses();
  const { data: staff } = useStaffList();
  const { data: counts, isLoading: countsLoading } = useClassStudentCounts();
  const create = useCreateClass();
  const del = useDeleteClass();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const isLoading = classesLoading || countsLoading;

  const handleDelete = (id: string, className: string) => {
    if (confirm(`Delete "${className}"? This will fail if students exist.`)) {
      del.mutate(id, {
        onSuccess: () => toast.success("Class deleted"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-1" /> New class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create class</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cname">Class name</Label>
              <Input
                id="cname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Class 3"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!name.trim() || create.isPending}
                onClick={() => {
                  create.mutate(
                    { class_name: name.trim() },
                    {
                      onSuccess: () => {
                        toast.success("Class created");
                        setName("");
                        setOpen(false);
                      },
                      onError: (e) =>
                        toast.error(
                          e instanceof Error ? e.message : "Failed"
                        ),
                    }
                  );
                }}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : classes?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No classes yet. Create your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {classes?.map((c) => (
            <ClassCard 
              key={c.id} 
              classItem={c} 
              staff={staff || []} 
              studentCount={counts?.[c.id] || 0}
              onDelete={handleDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
