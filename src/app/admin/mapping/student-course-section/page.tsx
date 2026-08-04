"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, X } from "lucide-react";

interface StudentOption {
  id: number;
  name: string;
  rollNo: string;
}
interface Course {
  id: number;
  name: string;
  code: string;
}
interface Section {
  id: number;
  name: string;
  courseId: number;
}
interface Mapping {
  id: number;
  student: { id: number; name: string; rollNo: string };
  course: { id: number; name: string; code: string };
  section: { id: number; name: string };
}

const listFetcher = <T,>(url: string) => apiClient.get<{ items: T[] }>(url);

export default function StudentMappingPage() {
  const [studentId, setStudentId] = useState<string>("");
  const [courseId, setCourseId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [pending, setPending] = useState<{ courseId: number; sectionId: number; courseLabel: string; sectionLabel: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: studentData } = useSWR("/api/admin/students?pageSize=200&status=active", listFetcher<StudentOption>);
  const { data: courseData } = useSWR("/api/admin/courses?pageSize=200", listFetcher<Course>);
  const { data: sectionData } = useSWR(
    courseId ? `/api/admin/sections?pageSize=200&courseId=${courseId}` : null,
    listFetcher<Section>
  );

  const mappingParams = new URLSearchParams({ pageSize: "100" });
  if (studentId) mappingParams.set("studentId", studentId);
  const { data: mappingData, mutate } = useSWR(
    `/api/admin/mapping/student-course-section?${mappingParams.toString()}`,
    listFetcher<Mapping>
  );

  const courseLabel = useMemo(
    () => courseData?.items.find((c) => String(c.id) === courseId),
    [courseData, courseId]
  );
  const sectionLabel = useMemo(
    () => sectionData?.items.find((s) => String(s.id) === sectionId),
    [sectionData, sectionId]
  );

  const addPending = () => {
    if (!courseId || !sectionId || !courseLabel || !sectionLabel) {
      toast.error("Select a course and section first");
      return;
    }
    if (pending.some((p) => p.courseId === Number(courseId) && p.sectionId === Number(sectionId))) {
      toast.error("Already added to the pending list");
      return;
    }
    setPending((prev) => [
      ...prev,
      {
        courseId: Number(courseId),
        sectionId: Number(sectionId),
        courseLabel: `${courseLabel.name} (${courseLabel.code})`,
        sectionLabel: sectionLabel.name,
      },
    ]);
    setCourseId("");
    setSectionId("");
  };

  const handleSave = async () => {
    if (!studentId) {
      toast.error("Select a student first");
      return;
    }
    if (pending.length === 0) {
      toast.error("Add at least one course/section pair");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/api/admin/mapping/student-course-section", {
        studentId: Number(studentId),
        mappings: pending.map(({ courseId, sectionId }) => ({ courseId, sectionId })),
      });
      toast.success("Mappings saved");
      setPending([]);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to save mappings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await apiClient.delete(`/api/admin/mapping/student-course-section?id=${id}`);
      toast.success("Mapping removed");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to remove mapping");
    }
  };

  const columns: DataTableColumn<Mapping>[] = [
    { key: "student", header: "Student", render: (r) => `${r.student.name} (${r.student.rollNo})` },
    { key: "course", header: "Course", render: (r) => `${r.course.name} (${r.course.code})` },
    { key: "section", header: "Section", render: (r) => r.section.name },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Remove mapping?"
            description={`Remove ${r.student.name} from ${r.course.name} / ${r.section.name}.`}
            confirmLabel="Remove"
            onConfirm={() => handleRemove(r.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student ↔ Course / Section Mapping</h1>
        <p className="text-sm text-muted-foreground">Enroll students into the course/section combinations they attend.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create mapping</CardTitle>
          <CardDescription>Pick a student, then add one or more course/section pairs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {studentData?.items.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.rollNo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSectionId(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courseData?.items.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!courseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                {sectionData?.items.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addPending}>
              <Plus className="mr-2 h-4 w-4" />
              Add pair
            </Button>
          </div>

          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((p, idx) => (
                <Badge key={`${p.courseId}-${p.sectionId}`} variant="secondary" className="gap-1 pr-1">
                  {p.courseLabel} / {p.sectionLabel}
                  <button
                    type="button"
                    onClick={() => setPending((prev) => prev.filter((_, i) => i !== idx))}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || pending.length === 0}>
            {saving ? "Saving..." : "Save mappings"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current mappings</CardTitle>
          <CardDescription>
            {studentId ? "Showing mappings for the selected student." : "Showing all student mappings."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} rows={mappingData?.items ?? []} rowKey={(r) => r.id} />
        </CardContent>
      </Card>
    </div>
  );
}
