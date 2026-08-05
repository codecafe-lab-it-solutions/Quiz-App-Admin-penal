"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface Mapping {
  id: number;
  sem: string;
  subCode: string;
  facRoll: string;
  facultyName: string | null;
  branch: string;
}

interface ListResponse {
  items: Mapping[];
  currentSubList: string;
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);

const schema = z.object({
  facRoll: z.string().trim().min(1, "Faculty roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  sem: z.string().trim().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

export default function FacultyMappingPage() {
  const [facultyRoll, setFacultyRoll] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ pageSize: "100" });
  if (facultyRoll.trim()) params.set("facultyRoll", facultyRoll.trim());
  const { data, isLoading, mutate } = useSWR(`/api/admin/mapping/faculty-course-section?${params.toString()}`, fetcher);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    reset({ facRoll: "", subCode: "", branch: "", sem: "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/mapping/faculty-course-section", values);
      toast.success("Mapping added");
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<Mapping>[] = [
    { key: "faculty", header: "Faculty", render: (r) => `${r.facultyName ?? "—"} (${r.facRoll})` },
    { key: "subCode", header: "Course code", render: (r) => r.subCode },
    { key: "branch", header: "Branch", render: (r) => r.branch },
    { key: "sem", header: "Semester", render: (r) => r.sem },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faculty ↔ Course Mapping</h1>
          <p className="text-sm text-muted-foreground">Live directory synced from the university course-allocation system.</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.currentSubList && <Badge variant="secondary">Showing: {data.currentSubList}</Badge>}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mappings</CardTitle>
          <CardDescription>Filter by faculty roll number, or leave blank to see all mappings for the current semester.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={facultyRoll}
            onSearchChange={setFacultyRoll}
            searchPlaceholder="Filter by faculty roll..."
          />
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
            <DialogDescription>
              Maps a faculty member to a course for the current cycle
              {data?.currentSubList ? ` (${data.currentSubList})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="facRoll">Faculty roll</Label>
              <Input id="facRoll" {...register("facRoll")} placeholder="e.g. F2025001" />
              {errors.facRoll && <p className="text-sm text-destructive">{errors.facRoll.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subCode">Course code</Label>
              <Input id="subCode" {...register("subCode")} placeholder="e.g. CS201" />
              {errors.subCode && <p className="text-sm text-destructive">{errors.subCode.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" {...register("branch")} placeholder="e.g. CSE" />
                {errors.branch && <p className="text-sm text-destructive">{errors.branch.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sem">Semester</Label>
                <Input id="sem" {...register("sem")} placeholder="e.g. 3" />
                {errors.sem && <p className="text-sm text-destructive">{errors.sem.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
