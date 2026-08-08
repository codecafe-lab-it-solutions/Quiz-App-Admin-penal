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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { SectionMembersDialog } from "./section-members-dialog";

interface Course {
  id: number;
  name: string;
  code: string;
}
interface Section {
  id: number;
  name: string;
  courses: { course: Course }[];
  _count: { students: number; faculty: number };
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const schema = z.object({
  name: z.string().trim().min(1, "Section name is required"),
  courseIds: z.array(z.number()).min(1, "Select at least one course"),
});
type FormValues = z.infer<typeof schema>;

const fetcher = (url: string) => apiClient.get<ListResponse<Section>>(url);
const courseFetcher = (url: string) => apiClient.get<ListResponse<Course>>(url);

export default function SectionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [membersSection, setMembersSection] = useState<Section | null>(null);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  const { data, isLoading, mutate } = useSWR(`/api/admin/sections?${params.toString()}`, fetcher);
  const { data: courseData } = useSWR("/api/admin/courses?pageSize=200", courseFetcher);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", courseIds: [] },
  });
  const courseIds = watch("courseIds") ?? [];

  const toggleCourse = (id: number, checked: boolean) => {
    const next = checked ? [...courseIds, id] : courseIds.filter((c) => c !== id);
    setValue("courseIds", next, { shouldValidate: true });
  };

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", courseIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (section: Section) => {
    setEditing(section);
    reset({ name: section.name, courseIds: section.courses.map((c) => c.course.id) });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/admin/sections/${editing.id}`, values);
        toast.success("Section updated");
      } else {
        await apiClient.post("/api/admin/sections", values);
        toast.success("Section created");
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
      await apiClient.delete(`/api/admin/sections/${id}`);
      toast.success("Section deleted");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed");
    }
  };

  const columns: DataTableColumn<Section>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "courses",
      header: "Courses",
      render: (r) => r.courses.map((c) => c.course.code).join(", ") || "—",
    },
    { key: "members", header: "Members", render: (r) => `${r._count.students} students, ${r._count.faculty} faculty` },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMembersSection(r)} title="Manage members">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Delete section?"
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
          <h1 className="text-2xl font-bold tracking-tight">Sections</h1>
          <p className="text-sm text-muted-foreground">
            Sections connect courses, students, and faculty — a section can span multiple courses (e.g. a merged batch).
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <FilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search sections..." />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {data?.meta && (
        <PaginationBar page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={data.meta.pageSize} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Section" : "Add Section"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update this section." : "Create a section. Selecting multiple courses merges their rosters (e.g. combined batches)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Section name</Label>
              <Input id="name" placeholder="e.g. A" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Courses</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {courseData?.items.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={courseIds.includes(c.id)}
                      onCheckedChange={(checked) => toggleCourse(c.id, checked === true)}
                      id={`course-${c.id}`}
                    />
                    <label htmlFor={`course-${c.id}`} className="text-sm">
                      {c.name} ({c.code})
                    </label>
                  </div>
                ))}
              </div>
              {errors.courseIds && <p className="text-sm text-destructive">{errors.courseIds.message}</p>}
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

      {membersSection && (
        <SectionMembersDialog
          section={membersSection}
          open={!!membersSection}
          onOpenChange={(open) => { if (!open) setMembersSection(null); }}
          onChanged={mutate}
        />
      )}
    </div>
  );
}
