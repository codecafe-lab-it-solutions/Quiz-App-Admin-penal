"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { dedupeByCourseCode } from "@/lib/course-catalog";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
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
import { Plus, Pencil } from "lucide-react";

interface CourseCatalogEntry {
  subCode: string;
  title: string | null;
  courseId: number | null;
}
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
}

const schema = z.object({
  courseIds: z.array(z.number()).min(1, "Select at least one course"),
});
type FormValues = z.infer<typeof schema>;

const fetcher = (url: string) => apiClient.get<ListResponse<Section>>(url);
const courseFetcher = (url: string) => apiClient.get<ListResponse<CourseCatalogEntry>>(url);

export function FacultySections() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/faculty/sections", fetcher);
  const { data: courseData } = useSWR("/api/faculty/courses", courseFetcher);
  const courses: Course[] = dedupeByCourseCode(
    (courseData?.items ?? []).filter(
      (c): c is CourseCatalogEntry & { courseId: number } => c.courseId !== null,
    ),
  ).map((c) => ({ id: c.courseId, code: c.subCode, name: c.title ?? c.subCode }));

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { courseIds: [] },
  });
  const courseIds = watch("courseIds") ?? [];

  const toggleCourse = (id: number, checked: boolean) => {
    const next = checked ? [...courseIds, id] : courseIds.filter((c) => c !== id);
    setValue("courseIds", next, { shouldValidate: true });
  };

  const openCreate = () => {
    setEditing(null);
    reset({ courseIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (section: Section) => {
    setEditing(section);
    reset({ courseIds: section.courses.map((c) => c.course.id) });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/faculty/sections/${editing.id}`, values);
        toast.success("Section updated");
      } else {
        await apiClient.post("/api/faculty/sections", values);
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

  const items = (data?.items ?? []).filter((s) =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  const columns: DataTableColumn<Section>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    {
      key: "courses",
      header: "Courses",
      render: (r) => r.courses.map((c) => c.course.code).join(", ") || "—",
    },
    {
      key: "members",
      header: "Members",
      render: (r) => `${r._count.students} students, ${r._count.faculty} faculty`,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
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
            Create a section for a course you teach, or edit an existing one. Section deletion
            and member management stay with an admin.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search sections..." />

      <DataTable columns={columns} rows={items} rowKey={(r) => r.id} loading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Section" : "Add Section"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this section."
                : "Create a section. Selecting multiple courses merges their rosters (e.g. combined batches)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {editing ? (
              <div className="space-y-1.5">
                <Label>Section name</Label>
                <Input value={editing.name} disabled />
                <p className="text-xs text-muted-foreground">
                  Derived from real data at creation - not editable directly.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Section name is derived automatically from the first selected course&apos;s
                branch + semester (real data) - not typed.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Courses</Label>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {courses.map((c) => (
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
                {courses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No courses available to link yet.
                  </p>
                )}
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
    </div>
  );
}
