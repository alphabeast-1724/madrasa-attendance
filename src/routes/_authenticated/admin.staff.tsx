import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useStaffList,
  useAllClasses,
  useUpdateProfileName,
  useBatchAssignClasses,
} from "@/hooks/useAdminData";
import { useSession } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { UserCog, Save, School } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  component: StaffPage,
});

function useAllUserRoles() {
  return useQuery({
    queryKey: ["admin", "user_roles", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useToggleRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { userId: string; role: "admin" | "office"; active: boolean }) => {
      if (vars.active) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: vars.userId, role: vars.role });
        if (error && !`${error.message}`.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", vars.userId)
          .eq("role", vars.role);
        if (error) throw error;
      }
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "user_roles"] }),
  });
}

function StaffCard({ profile, roles, classes, meId }: { 
  profile: any, 
  roles: any[], 
  classes: any[], 
  meId?: string 
}) {
  const updateName = useUpdateProfileName();
  const toggleRole = useToggleRole();
  const batchAssign = useBatchAssignClasses();
  
  const [name, setName] = useState(profile.full_name);
  const [isEditingName, setIsEditingName] = useState(false);
  
  // Find classes where this person is the teacher
  const assignedClasses = classes.filter(c => c.teacher_id === profile.id);
  
  const [class1, setClass1] = useState(assignedClasses[0]?.id ?? "none");
  const [class2, setClass2] = useState(assignedClasses[1]?.id ?? "none");

  const admin = roles?.some((r) => r.user_id === profile.id && r.role === "admin") ?? false;
  const office = roles?.some((r) => r.user_id === profile.id && r.role === "office") ?? false;
  const isSelf = profile.id === meId;

  const handleSaveClasses = () => {
    const ids = [class1, class2].filter(id => id !== "none");
    batchAssign.mutate({ teacherId: profile.id, classIds: ids }, {
      onSuccess: () => toast.success("Class assignments updated"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update classes")
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1 flex-1">
              <Input 
                size={1}
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="h-8 text-sm"
              />
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-emerald-600"
                onClick={() => {
                  updateName.mutate({ id: profile.id, full_name: name }, {
                    onSuccess: () => {
                      setIsEditingName(false);
                      toast.success("Name updated");
                    }
                  });
                }}
              >
                <Save className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate flex-1">
              <span className="truncate">{profile.full_name}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={() => setIsEditingName(true)}
              >
                <UserCog className="size-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-1">
            {admin && <Badge>admin</Badge>}
            {office && <Badge variant="outline" className="border-blue-500 text-blue-500">office</Badge>}
            {!admin && !office && <Badge variant="secondary">staff</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <School className="size-3" /> Assign Classes (Max 2)
          </p>
          <div className="grid grid-cols-1 gap-2">
            <Select value={class1} onValueChange={setClass1}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="First Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {classes.filter(c => c.id !== class2 || c.id === class1).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name} {c.batch && `(${c.batch})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={class2} onValueChange={setClass2}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Second Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {classes.filter(c => c.id !== class1 || c.id === class2).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name} {c.batch && `(${c.batch})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              size="sm" 
              className="w-full mt-1 h-8" 
              variant="outline"
              disabled={batchAssign.isPending}
              onClick={handleSaveClasses}
            >
              Update Assignments
            </Button>
          </div>
        </div>

        <div className="pt-2 border-t flex flex-wrap items-center gap-2">
          <Button
            variant={admin ? "outline" : "default"}
            size="sm"
            className="h-8 flex-1"
            disabled={isSelf}
            onClick={() =>
              toggleRole.mutate(
                { userId: profile.id, role: "admin", active: !admin },
                {
                  onSuccess: () => toast.success(admin ? "Admin role revoked" : "Admin role granted"),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
                }
              )
            }
          >
            {admin ? "Revoke admin" : "Make admin"}
          </Button>

          <Button
            variant={office ? "outline" : "default"}
            size="sm"
            className="h-8 flex-1"
            onClick={() =>
              toggleRole.mutate(
                { userId: profile.id, role: "office", active: !office },
                {
                  onSuccess: () => toast.success(office ? "Office role revoked" : "Office role granted"),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Failed")
                }
              )
            }
          >
            {office ? "Revoke office" : "Make office"}
          </Button>
        </div>
        {isSelf && <p className="text-[10px] text-muted-foreground italic text-center">You (Self)</p>}
      </CardContent>
    </Card>
  );
}

function StaffPage() {
  const { data: staff, isLoading: staffLoading } = useStaffList();
  const { data: roles, isLoading: rolesLoading } = useAllUserRoles();
  const { data: classes, isLoading: classesLoading } = useAllClasses();
  const { data: session } = useSession();
  const meId = session?.user?.id;

  if (staffLoading || rolesLoading || classesLoading) {
    return <p className="text-center p-12 text-muted-foreground">Loading staff data...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <p className="text-sm text-muted-foreground">
          Rename staff, assign batches, and manage permissions.
        </p>
      </div>

      {!staff || staff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-sm text-muted-foreground text-center">
            No staff members found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.map((p) => (
            <StaffCard 
              key={p.id} 
              profile={p} 
              roles={roles || []} 
              classes={classes || []} 
              meId={meId} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
