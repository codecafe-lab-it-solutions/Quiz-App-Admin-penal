"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CourseOption {
  subCode: string;
  title: string | null;
  courseId: number | null;
}

interface BuildingOption {
  id: number;
  name: string;
  radiusMeters: number;
}

interface FacultyOption {
  roll: string;
  name: string;
}

interface SectionOption {
  id: number;
  name: string;
}

interface SessionOption {
  id: number;
  name: string;
}

const fetcher = <T,>(url: string) => apiClient.get<T>(url);

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function QuizCreateForm({ role }: { role: "faculty" | "admin" }) {
  const router = useRouter();
  const [facultyRoll, setFacultyRoll] = useState("");
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [sectionIds, setSectionIds] = useState<number[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [startTime, setStartTime] = useState(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [endTime, setEndTime] = useState(toLocalInputValue(new Date(Date.now() + 90 * 60 * 1000)));
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [randomize, setRandomize] = useState(true);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [allowSkipSwitch, setAllowSkipSwitch] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: facultyData } = useSWR(
    role === "admin" ? `/api/admin/faculty?page=1&pageSize=200` : null,
    (url: string) => fetcher<{ items: FacultyOption[] }>(url)
  );

  const coursesUrl =
    role === "admin"
      ? facultyRoll
        ? `/api/faculty/courses?facultyRoll=${encodeURIComponent(facultyRoll)}`
        : null
      : `/api/faculty/courses`;
  const { data: coursesData, isLoading: coursesLoading } = useSWR(coursesUrl, (url: string) =>
    fetcher<{ items: CourseOption[] }>(url)
  );
  const { data: buildingsData } = useSWR(`/api/faculty/buildings`, (url: string) =>
    fetcher<{ items: BuildingOption[] }>(url)
  );
  const { data: sessionsData } = useSWR(`/api/faculty/sessions`, (url: string) =>
    fetcher<{ items: SessionOption[] }>(url)
  );

  const courses = (coursesData?.items ?? []).filter((c) => c.courseId !== null);
  const buildings = buildingsData?.items ?? [];
  const selectedCourse = courses.find((c) => c.subCode === courseCode);

  const { data: sectionsData } = useSWR(
    selectedCourse?.courseId ? `/api/faculty/sections?courseId=${selectedCourse.courseId}` : null,
    (url: string) => fetcher<{ items: SectionOption[] }>(url)
  );
  const sections = sectionsData?.items ?? [];

  useEffect(() => {
    setCourseCode("");
  }, [facultyRoll]);

  useEffect(() => {
    setSectionIds([]);
  }, [courseCode]);

  const toggleSection = (id: number, checked: boolean) => {
    setSectionIds((prev) => (checked ? [...prev, id] : prev.filter((s) => s !== id)));
  };

  const handleSubmit = async () => {
    if (role === "admin" && !facultyRoll) {
      toast.error("Select which faculty member this quiz is for");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const course = courses.find((c) => c.subCode === courseCode);
    if (!course || course.courseId === null) {
      toast.error("Select a course");
      return;
    }
    if (sectionIds.length === 0) {
      toast.error("Select at least one section");
      return;
    }
    if (!buildingId) {
      toast.error("Select a building");
      return;
    }
    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Duration must be a positive number of minutes");
      return;
    }

    setSubmitting(true);
    try {
      const quiz = await apiClient.post<{ id: number }>("/api/faculty/quiz", {
        ...(role === "admin" ? { facultyRoll } : {}),
        title: title.trim(),
        courseId: course.courseId,
        sectionIds,
        ...(sessionId ? { sessionId: Number(sessionId) } : {}),
        buildingId: Number(buildingId),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMinutes: duration,
        totalMarks: 1,
        randomize,
        negativeMarking,
        allowSkipSwitch,
        status: "draft",
      });
      toast.success("Quiz created - now add questions and allot students");
      router.push(`${role === "faculty" ? "/faculty/quizzes" : "/admin/tests"}/${quiz.id}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to create quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {role === "admin" && (
          <div className="space-y-1.5">
            <Label>Faculty</Label>
            <Select value={facultyRoll} onValueChange={setFacultyRoll}>
              <SelectTrigger>
                <SelectValue placeholder="Select the faculty member this quiz is for" />
              </SelectTrigger>
              <SelectContent>
                {(facultyData?.items ?? []).map((f) => (
                  <SelectItem key={f.roll} value={f.roll}>
                    {f.name} ({f.roll})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 1 Quiz" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Select value={courseCode} onValueChange={setCourseCode} disabled={role === "admin" && !facultyRoll}>
              <SelectTrigger>
                <SelectValue placeholder={coursesLoading ? "Loading..." : "Select a course"} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.subCode} value={c.subCode}>
                    {c.title ?? c.subCode} ({c.subCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {coursesData && courses.length === 0 && !coursesLoading && (
              <p className="text-xs text-muted-foreground">
                No courses with a catalog entry yet - ask an admin to add one under Master Data → Courses.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Building / Geofence</Label>
            <Select value={buildingId} onValueChange={setBuildingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Sections</Label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
              {!courseCode && <p className="text-xs text-muted-foreground">Select a course first.</p>}
              {courseCode && sections.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No sections linked to this course yet - ask an admin to add one under Master Data → Sections.
                </p>
              )}
              {sections.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={sectionIds.includes(s.id)}
                    onCheckedChange={(checked) => toggleSection(s.id, checked === true)}
                    id={`section-${s.id}`}
                  />
                  <label htmlFor={`section-${s.id}`} className="text-sm">
                    {s.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Session (optional)</Label>
            <Select value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Map to an upcoming session" />
              </SelectTrigger>
              <SelectContent>
                {(sessionsData?.items ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="startTime">Start Time</Label>
            <Input id="startTime" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endTime">End Time</Label>
            <Input id="endTime" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Duration (minutes)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="randomize" className="cursor-pointer">Randomize order</Label>
            <Switch id="randomize" checked={randomize} onCheckedChange={setRandomize} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="negativeMarking" className="cursor-pointer">Negative marking</Label>
            <Switch id="negativeMarking" checked={negativeMarking} onCheckedChange={setNegativeMarking} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="allowSkipSwitch" className="cursor-pointer">Allow skip/switch</Label>
            <Switch id="allowSkipSwitch" checked={allowSkipSwitch} onCheckedChange={setAllowSkipSwitch} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Total marks are calculated automatically as questions are added on the next step.
        </p>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Quiz & Add Questions"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
