"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Plus, Trash2 } from "lucide-react";

interface Registration {
  roll: string;
  subCode: string;
  batch?: string;
  major: string | null;
  semNow: string | null;
  sections: { id: number; name: string }[];
}

interface ListResponse {
  items: Registration[];
  isDefault: boolean;
}

interface CourseOption {
  id: number;
  name: string;
  code: string;
}
interface SectionOption {
  id: number;
  name: string;
}
interface BatchOption {
  batchName: string;
  isActive: boolean;
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);
const courseFetcher = (url: string) => apiClient.get<{ items: CourseOption[] }>(url);
const sectionFetcher = (url: string) => apiClient.get<{ items: SectionOption[] }>(url);
const semesterConfigFetcher = (url: string) =>
  apiClient.get<{ batchRegistry: BatchOption[] }>(url);

const schema = z.object({
  roll: z.string().trim().min(1, "Student roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
});
type FormValues = z.infer<typeof schema>;

const ALL = "__all__";

export default function StudentMappingPage() {
  const [roll, setRoll] = useState("");
  const [courseCode, setCourseCode] = useState(ALL);
  const [batch, setBatch] = useState(ALL);
  const [sectionId, setSectionId] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: courseData } = useSWR("/api/admin/courses?pageSize=200", courseFetcher);
  const { data: sectionData } = useSWR("/api/admin/sections?pageSize=200", sectionFetcher);
  const { data: semesterConfig } = useSWR("/api/admin/config/semester", semesterConfigFetcher);
  const batches = (semesterConfig?.batchRegistry ?? []).filter((b) => b.isActive);

  // Roll search takes priority - it's an exact student lookup, so it
  // overrides any browse filters. Otherwise the course/batch/section
  // dropdowns combine as filters on a bounded browse. No search or filter
  // still fires - the route returns a bounded "recently registered" default
  // list instead of nothing, so the page shows real, interconnected data
  // immediately.
  const params = new URLSearchParams();
  if (roll.trim()) {
    params.set("roll", roll.trim());
  } else {
    if (courseCode !== ALL) params.set("courseCode", courseCode);
    if (batch !== ALL) params.set("batch", batch);
    if (sectionId !== ALL) params.set("sectionId", sectionId);
  }
  const query = params.toString();

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/mapping/student-course-section?${query}`,
    fetcher,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    reset({ roll: "", subCode: "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/mapping/student-course-section", values);
      toast.success("Mapping added");
      setDialogOpen(false);
      // Show the result: switch the search to the roll just registered.
      setCourseCode(ALL);
      setBatch(ALL);
      setSectionId(ALL);
      setRoll(values.roll);
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Save failed",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: Registration) => {
    try {
      await apiClient.delete(
        `/api/admin/mapping/student-course-section/${encodeURIComponent(r.roll)}/${encodeURIComponent(r.subCode)}`,
      );
      toast.success("Registration deleted");
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Delete failed",
      );
    }
  };

  const columns: DataTableColumn<Registration>[] = [
    { key: "roll", header: "Student roll", render: (r) => r.roll },
    { key: "major", header: "Branch", render: (r) => r.major ?? "—" },
    { key: "semNow", header: "Semester", render: (r) => r.semNow ?? "—" },
    {
      key: "sections",
      header: "Sections",
      render: (r) =>
        r.sections.length > 0
          ? r.sections.map((section) => section.name).join(", ")
          : "—",
    },
    { key: "subCode", header: "Course code", render: (r) => r.subCode },
    ...(!roll.trim()
      ? [
          {
            key: "batch",
            header: "Batch",
            render: (r: Registration) => r.batch ?? "—",
          },
        ]
      : []),
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="icon">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          }
          title="Delete registration?"
          description={`Remove ${r.roll}'s registration for ${r.subCode}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => handleDelete(r)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Student ↔ Course Mapping
          </h1>
          <p className="text-sm text-muted-foreground">
            Live registrations synced from the university system - this spans
            ~60 per-batch tables, so it starts with a bounded recent list
            rather than a full unfiltered dump; search an exact roll, or
            browse by course/batch/section below.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search registrations</CardTitle>
          <CardDescription>
            Search by an exact student roll, or browse by course/batch/section - combine the
            three browse filters freely, or clear them (Any) to see the most recently
            registered mappings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="roll">Student roll</Label>
              <Input
                id="roll"
                value={roll}
                onChange={(e) => {
                  setRoll(e.target.value);
                  if (e.target.value) {
                    setCourseCode(ALL);
                    setBatch(ALL);
                    setSectionId(ALL);
                  }
                }}
                placeholder="e.g. 25PE3001"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select
                value={courseCode}
                onValueChange={(v) => {
                  setCourseCode(v);
                  if (v !== ALL) setRoll("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any course</SelectItem>
                  {(courseData?.items ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.code}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Batch</Label>
              <Select
                value={batch}
                onValueChange={(v) => {
                  setBatch(v);
                  if (v !== ALL) setRoll("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any batch</SelectItem>
                  {batches.map((b) => (
                    <SelectItem key={b.batchName} value={b.batchName}>
                      {b.batchName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select
                value={sectionId}
                onValueChange={(v) => {
                  setSectionId(v);
                  if (v !== ALL) setRoll("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Any section</SelectItem>
                  {(sectionData?.items ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!query && data?.isDefault && (
            <p className="text-sm text-muted-foreground">
              No search or filter yet — showing the most recently registered mappings. Search a
              roll, or pick a course/batch/section, to narrow this down.
            </p>
          )}
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(r) => `${r.roll}-${r.subCode}`}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
            <DialogDescription>
              Registers a student for a course, in the registration table for
              their batch.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="mappingRoll">Student roll</Label>
              <Input
                id="mappingRoll"
                {...register("roll")}
                placeholder="e.g. 25PE3001"
              />
              {errors.roll && (
                <p className="text-sm text-destructive">
                  {errors.roll.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mappingSubCode">Course code</Label>
              <Input
                id="mappingSubCode"
                {...register("subCode")}
                placeholder="e.g. PE202"
              />
              {errors.subCode && (
                <p className="text-sm text-destructive">
                  {errors.subCode.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
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
