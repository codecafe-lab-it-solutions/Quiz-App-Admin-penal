"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Pencil, Plus, Power, PowerOff, Trash2, X } from "lucide-react";

interface SectionOption {
  id: number;
  name: string;
}

const NEW_SECTION = "__new__";

interface Student {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
  status: number; // 1-Active, 2-Inactive
  category: string | null;
  section: string | null;
  sections: { id: number; name: string }[];
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const fetcher = (url: string) => apiClient.get<ListResponse<Student>>(url);

const schema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().optional(),
  major: z.string().trim().min(1, "Major is required"),
  batch: z.string().trim().min(1, "Batch is required"),
  semNow: z.string().trim().regex(/^\d+$/, "Semester must be a whole number"),
});
type FormValues = z.infer<typeof schema>;

export default function StudentListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sectionChoice, setSectionChoice] = useState<string>(NEW_SECTION);
  // Only meaningful on edit - on create, the default section always applies
  // (matches the old "section required" behavior); on edit it's opt-in so a
  // routine profile edit doesn't silently move the student into a section.
  const [assignDefaultSection, setAssignDefaultSection] = useState(false);
  // Sections queued for removal on Save - lets an edit properly reassign a
  // student's section (remove the old one, add the new one) instead of only
  // ever adding more.
  const [removedSectionIds, setRemovedSectionIds] = useState<Set<number>>(new Set());
  const currentSections = (editing?.sections ?? []).filter((s) => !removedSectionIds.has(s.id));

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });

  const { data, isLoading, mutate } = useSWR(`/api/admin/students?${params.toString()}`, fetcher);
  const { data: sectionsData } = useSWR(
    dialogOpen ? "/api/admin/sections?pageSize=200" : null,
    (url: string) => apiClient.get<{ items: SectionOption[] }>(url)
  );
  const sections = sectionsData?.items ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // The default section is always Major_SemesterNumber, derived live from
  // real data already on the form - never a typed/invented label.
  const majorValue = watch("major");
  const semNowValue = watch("semNow");
  const derivedSectionName =
    majorValue?.trim() && semNowValue?.trim() ? `${majorValue.trim()}_${semNowValue.trim()}` : null;

  const openCreate = () => {
    setEditing(null);
    setSectionChoice(NEW_SECTION);
    setAssignDefaultSection(true);
    reset({ roll: "", name: "", email: "", password: "", major: "", batch: "", semNow: "" });
    setDialogOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    // Left unchanged unless the admin actively opts in below - a student can
    // belong to more than one section, so there's no single "current" value
    // to preselect here.
    setSectionChoice(NEW_SECTION);
    setAssignDefaultSection(false);
    setRemovedSectionIds(new Set());
    reset({
      roll: student.roll,
      name: student.name,
      email: student.email,
      password: "",
      major: student.major,
      batch: student.batch,
      semNow: student.semNow,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const sectionFields =
      sectionChoice !== NEW_SECTION
        ? { sectionId: Number(sectionChoice) }
        : editing
          ? { assignDefaultSection }
          : {};

    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/admin/students/${editing.roll}`, {
          name: values.name,
          email: values.email,
          password: values.password || undefined,
          major: values.major,
          batch: values.batch,
          semNow: values.semNow,
          ...sectionFields,
        });
        await Promise.all(
          [...removedSectionIds].map((id) =>
            apiClient.delete(`/api/admin/sections/${id}/students/${encodeURIComponent(editing.roll)}`)
          )
        );
        toast.success("Student updated");
      } else {
        if (!values.password || values.password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setSubmitting(false);
          return;
        }
        await apiClient.post("/api/admin/students", { ...values, ...sectionFields });
        toast.success("Student added");
      }
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (roll: string) => {
    try {
      await apiClient.delete(`/api/admin/students/${roll}`);
      toast.success("Student deleted");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed");
    }
  };

  const handleToggleStatus = async (student: Student) => {
    const active = student.status !== 1;
    try {
      await apiClient.patch(`/api/admin/students/${student.roll}/status`, { active });
      toast.success(active ? "Student activated" : "Student deactivated");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Status update failed");
    }
  };

  const columns: DataTableColumn<Student>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "roll", header: "Roll", render: (r) => r.roll },
    { key: "major", header: "Major", render: (r) => r.major || "—" },
    { key: "batch", header: "Batch", render: (r) => r.batch || "—" },
    { key: "semNow", header: "Semester", render: (r) => r.semNow || "—" },
    { key: "section", header: "Section", render: (r) => r.section || "—" },
    { key: "category", header: "Category", render: (r) => r.category || "—" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.status === 1 ? "success" : "destructive"}>{r.status === 1 ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleStatus(r)}
            title={r.status === 1 ? "Deactivate login" : "Activate login"}
          >
            {r.status === 1 ? <PowerOff className="h-4 w-4 text-destructive" /> : <Power className="h-4 w-4 text-green-600" />}
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
            title="Delete student?"
            description={`Delete "${r.name}" (${r.roll})? This removes their login and course registrations. This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={() => handleDelete(r.roll)}
          />
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/students/${r.roll}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Live directory synced from the university system.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, roll..."
      />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.roll} loading={isLoading} />

      {data?.meta && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this student's profile, or reset their password."
                : "Creates a new student login and profile directly in the university directory."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="roll">Roll</Label>
                <Input id="roll" {...register("roll")} placeholder="e.g. 25PE3001" disabled={!!editing} />
                {errors.roll && <p className="text-sm text-destructive">{errors.roll.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{editing ? "Reset password (optional)" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder={editing ? "Leave blank to keep current password" : ""}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="major">Major</Label>
                <Input id="major" {...register("major")} placeholder="e.g. PE" />
                {errors.major && <p className="text-sm text-destructive">{errors.major.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" {...register("batch")} placeholder="e.g. btechpeg25" />
                {errors.batch && <p className="text-sm text-destructive">{errors.batch.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="semNow">Semester</Label>
                <Input id="semNow" {...register("semNow")} placeholder="e.g. 3" />
                {errors.semNow && <p className="text-sm text-destructive">{errors.semNow.message}</p>}
              </div>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label>Current sections</Label>
                {currentSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not in any section yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentSections.map((s) => (
                      <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => setRemovedSectionIds((prev) => new Set(prev).add(s.id))}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20"
                          aria-label={`Remove from ${s.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{editing ? "Add a section" : "Section"}</Label>
              <Select value={sectionChoice} onValueChange={setSectionChoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_SECTION}>Default section (from Major + Semester)</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sectionChoice === NEW_SECTION && (
                <>
                  {editing && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="assignDefaultSection"
                        checked={assignDefaultSection}
                        onCheckedChange={(checked) => setAssignDefaultSection(checked === true)}
                      />
                      <label htmlFor="assignDefaultSection" className="text-sm">
                        Add to this section
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {derivedSectionName
                      ? `Section: "${derivedSectionName}" - derived from Major + Semester, real data only.`
                      : "Enter Major and Semester above to determine the section."}
                  </p>
                </>
              )}
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
