"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect, SearchableSelectOption } from "@/components/ui/searchable-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";

interface SectionCourse {
  id: number;
  subCode: string;
  courseTitle: string;
  facRoll: string;
  facultyName: string | null;
}

interface Section {
  name: string;
  major: string;
  sem: string;
  studentCount: number;
  courses: SectionCourse[];
}

interface ListResponse {
  items: Section[];
  currentSubList: string;
}

interface FacultyOption {
  roll: string;
  name: string;
}

interface CourseOption {
  code: string;
  title: string;
}

interface BranchSemOption {
  branch: string;
  sem: string;
  major: string;
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);
const facultyFetcher = (url: string) => apiClient.get<{ items: FacultyOption[] }>(url);
const courseFetcher = (url: string) => apiClient.get<{ items: CourseOption[] }>(url);
const branchSemFetcher = (url: string) => apiClient.get<{ items: BranchSemOption[] }>(url);

const schema = z.object({
  facRoll: z.string().trim().min(1, "Faculty is required"),
  subCode: z.string().trim().min(1, "Course is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  sem: z.string().trim().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

interface AllotmentResult {
  registeredCount: number;
  alreadyRegisteredCount: number;
  skippedNoBatchCount: number;
}

export default function SectionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, mutate } = useSWR("/api/admin/sections", fetcher);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const facRoll = watch("facRoll");
  const subCode = watch("subCode");
  const branch = watch("branch");
  const sem = watch("sem");

  // Faculty dropdown - server-searched, real isr_faculty_tbl rolls only.
  const [facSearch, setFacSearch] = useState("");
  const facSearchDebounced = useDebouncedValue(facSearch, 250);
  const { data: facData, isLoading: facLoading } = useSWR(
    dialogOpen
      ? `/api/admin/faculty?search=${encodeURIComponent(facSearchDebounced)}&pageSize=20`
      : null,
    facultyFetcher,
  );
  const facOptions: SearchableSelectOption[] = (facData?.items ?? []).map((f) => ({
    value: f.roll,
    label: `${f.name} (${f.roll})`,
  }));

  // Course dropdown - server-searched, same real catalog Faculty <-> Course
  // mapping uses.
  const [courseSearch, setCourseSearch] = useState("");
  const courseSearchDebounced = useDebouncedValue(courseSearch, 250);
  const { data: courseData, isLoading: courseLoading } = useSWR(
    dialogOpen
      ? `/api/admin/mapping/faculty-course-section/courses?search=${encodeURIComponent(courseSearchDebounced)}&pageSize=20`
      : null,
    courseFetcher,
  );
  const courseOptions: SearchableSelectOption[] = (courseData?.items ?? []).map((c) => ({
    value: c.code,
    label: c.title === c.code ? c.code : `${c.code} - ${c.title}`,
  }));

  // Branch/Semester dropdowns - scoped to whichever course was picked, so
  // only real (branch, sem) combinations that course is actually offered as
  // are selectable.
  const { data: branchSemData } = useSWR(
    dialogOpen && subCode
      ? `/api/admin/mapping/faculty-course-section/branch-options?subCode=${encodeURIComponent(subCode)}`
      : null,
    branchSemFetcher,
  );
  const branchSemOptions = branchSemData?.items ?? [];

  const [branchSearch, setBranchSearch] = useState("");
  const distinctBranches = [...new Map(branchSemOptions.map((o) => [o.branch, o])).values()];
  const branchOptions: SearchableSelectOption[] = distinctBranches
    .filter((o) => o.branch.toLowerCase().includes(branchSearch.trim().toLowerCase()))
    .map((o) => ({
      value: o.branch,
      label: o.branch,
      description: o.major !== o.branch ? `→ ${o.major}` : undefined,
    }));

  const [semSearch, setSemSearch] = useState("");
  const semOptionsForBranch = branchSemOptions.filter((o) => o.branch === branch);
  const semOptions: SearchableSelectOption[] = semOptionsForBranch
    .filter((o) => o.sem.includes(semSearch.trim()))
    .map((o) => ({ value: o.sem, label: `Semester ${o.sem}` }));

  const selectedMajor = branchSemOptions.find((o) => o.branch === branch && o.sem === sem)?.major ?? null;

  const openCreate = () => {
    reset({ facRoll: "", subCode: "", branch: "", sem: "" });
    setFacSearch("");
    setCourseSearch("");
    setBranchSearch("");
    setSemSearch("");
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const result = await apiClient.post<{ allotment: AllotmentResult }>(
        "/api/admin/sections",
        values,
      );
      const { registeredCount, alreadyRegisteredCount } = result.allotment;
      toast.success(
        `Section created — ${registeredCount} student${registeredCount === 1 ? "" : "s"} allotted` +
          (alreadyRegisteredCount > 0 ? ` (${alreadyRegisteredCount} already registered)` : ""),
      );
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Failed to create section",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<Section>[] = [
    {
      key: "name",
      header: "Section",
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    { key: "major", header: "Major", render: (r) => r.major },
    { key: "sem", header: "Semester", render: (r) => r.sem },
    {
      key: "studentCount",
      header: "Students",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {r.studentCount}
        </span>
      ),
    },
    {
      key: "courses",
      header: "Courses",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.courses.map((c) => (
            <Badge key={c.id} variant="secondary" className="font-normal">
              {c.subCode} · {c.facultyName ?? c.facRoll}
            </Badge>
          ))}
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
            Every real section (Major_Semester) offered this cycle, with how many students belong
            to it and which courses/faculty it's mapped to.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.currentSubList && (
            <Badge variant="secondary">Showing: {data.currentSubList}</Badge>
          )}
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Section
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(r) => r.name}
            loading={isLoading}
            emptyMessage="No sections yet. Create one to get started."
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Section</DialogTitle>
            <DialogDescription>
              Maps a faculty to a course for a branch/semester
              {data?.currentSubList ? ` (${data.currentSubList})` : ""} - every real student in
              that Major_Semester is automatically registered for the course. Every field is
              picked from real data - nothing typed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label>Faculty</Label>
              <SearchableSelect
                value={facRoll || null}
                onValueChange={(v) => setValue("facRoll", v, { shouldValidate: true })}
                options={facOptions}
                search={facSearch}
                onSearchChange={setFacSearch}
                placeholder="Select faculty"
                searchPlaceholder="Search by name, roll, email..."
                loading={facLoading}
                emptyText="No faculty found."
              />
              {errors.facRoll && (
                <p className="text-sm text-destructive">{errors.facRoll.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Course</Label>
              <SearchableSelect
                value={subCode || null}
                onValueChange={(v) => {
                  setValue("subCode", v, { shouldValidate: true });
                  setValue("branch", "");
                  setValue("sem", "");
                  setBranchSearch("");
                  setSemSearch("");
                }}
                options={courseOptions}
                search={courseSearch}
                onSearchChange={setCourseSearch}
                placeholder="Select course"
                searchPlaceholder="Search course code or title..."
                loading={courseLoading}
                emptyText="No matching courses."
              />
              {errors.subCode && (
                <p className="text-sm text-destructive">{errors.subCode.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <SearchableSelect
                  value={branch || null}
                  onValueChange={(v) => {
                    setValue("branch", v, { shouldValidate: true });
                    const matches = branchSemOptions.filter((o) => o.branch === v);
                    setValue("sem", matches.length === 1 ? matches[0].sem : "", {
                      shouldValidate: true,
                    });
                    setSemSearch("");
                  }}
                  options={branchOptions}
                  search={branchSearch}
                  onSearchChange={setBranchSearch}
                  placeholder={subCode ? "Select branch" : "Pick a course first"}
                  searchPlaceholder="Search branch..."
                  disabled={!subCode}
                  emptyText="No branches offered for this course."
                />
                {errors.branch && (
                  <p className="text-sm text-destructive">{errors.branch.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Semester</Label>
                <SearchableSelect
                  value={sem || null}
                  onValueChange={(v) => setValue("sem", v, { shouldValidate: true })}
                  options={semOptions}
                  search={semSearch}
                  onSearchChange={setSemSearch}
                  placeholder={branch ? "Select semester" : "Pick a branch first"}
                  searchPlaceholder="Search semester..."
                  disabled={!branch}
                  emptyText="No semesters found."
                />
                {errors.sem && (
                  <p className="text-sm text-destructive">{errors.sem.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <p className="text-xs text-muted-foreground">
                {selectedMajor && sem
                  ? `Section: "${selectedMajor}_${sem}" - every student in this Major_Semester will be allotted.`
                  : "Pick a Branch (and Semester, if it offers more than one) to determine the section."}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create & Allot Students"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
