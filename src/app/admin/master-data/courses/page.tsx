"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Department {
  id: number;
  name: string;
}
interface Course {
  id: number;
  name: string;
  code: string;
  credits: number;
  department: { id: number; name: string };
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const schema = z.object({
  name: z.string().trim().min(2, "Course name is required"),
  code: z.string().trim().min(1, "Course code is required"),
  departmentId: z.coerce.number().int().positive("Select a department"),
  credits: z.coerce.number().int().min(0),
});
type FormValues = z.infer<typeof schema>;

const fetcher = (url: string) => apiClient.get<ListResponse<Course>>(url);
const deptFetcher = (url: string) => apiClient.get<ListResponse<Department>>(url);

export default function CoursesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  const { data, isLoading, mutate } = useSWR(`/api/admin/courses?${params.toString()}`, fetcher);
  const { data: deptData } = useSWR("/api/admin/departments?pageSize=100", deptFetcher);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credits: 0 },
  });
  const departmentId = watch("departmentId");

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", code: "", departmentId: undefined, credits: 0 });
    setDialogOpen(true);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    reset({ name: course.name, code: course.code, departmentId: course.department.id, credits: course.credits });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/admin/courses/${editing.id}`, values);
        toast.success("Course updated");
      } else {
        await apiClient.post("/api/admin/courses", values);
        toast.success("Course created");
      }
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/admin/courses/${id}`);
      toast.success("Course deleted");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed");
    }
  };

  const columns: DataTableColumn<Course>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "code", header: "Code", render: (r) => r.code },
    { key: "department", header: "Department", render: (r) => r.department?.name ?? "—" },
    { key: "credits", header: "Credits", render: (r) => r.credits },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Delete course?"
            description={`Delete "${r.name}"? This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={() => handleDelete(r.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">Manage courses offered by each department.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      <FilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search courses..." />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {data?.meta && (
        <PaginationBar page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={data.meta.pageSize} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Course" : "Add Course"}</DialogTitle>
            <DialogDescription>{editing ? "Update this course." : "Create a new course."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Course name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Course code</Label>
              <Input id="code" {...register("code")} />
              {errors.code && <p className="text-sm text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <SearchableSelect
                value={departmentId ? String(departmentId) : null}
                onValueChange={(v) => setValue("departmentId", Number(v), { shouldValidate: true })}
                options={(deptData?.items ?? []).map((d) => ({ value: String(d.id), label: d.name }))}
                placeholder="Select department"
                searchPlaceholder="Search departments..."
              />
              {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="credits">Credits</Label>
              <Input id="credits" type="number" min={0} {...register("credits")} />
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
