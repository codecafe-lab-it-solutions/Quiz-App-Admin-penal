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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface Registration {
  roll: string;
  subCode: string;
  batch?: string;
}

interface ListResponse {
  items: Registration[];
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);

const schema = z.object({
  roll: z.string().trim().min(1, "Student roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
});
type FormValues = z.infer<typeof schema>;

export default function StudentMappingPage() {
  const [roll, setRoll] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Roll search takes priority if both are somehow filled - mirrors the API contract.
  const query = roll.trim()
    ? `roll=${encodeURIComponent(roll.trim())}`
    : courseCode.trim()
      ? `courseCode=${encodeURIComponent(courseCode.trim())}`
      : null;

  const { data, isLoading, mutate } = useSWR(query ? `/api/admin/mapping/student-course-section?${query}` : null, fetcher);

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
      setCourseCode("");
      setRoll(values.roll);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<Registration>[] = [
    { key: "roll", header: "Student roll", render: (r) => r.roll },
    { key: "subCode", header: "Course code", render: (r) => r.subCode },
    ...(courseCode.trim() ? [{ key: "batch", header: "Batch", render: (r: Registration) => r.batch ?? "—" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Student ↔ Course Mapping</h1>
          <p className="text-sm text-muted-foreground">
            Live registrations synced from the university system. Search by student roll or course code -
            this spans ~60 per-batch tables, so an unfiltered list isn't shown.
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
          <CardDescription>Provide a student roll to see their courses, or a course code to see who's registered.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="roll">Student roll</Label>
              <Input
                id="roll"
                value={roll}
                onChange={(e) => {
                  setRoll(e.target.value);
                  if (e.target.value) setCourseCode("");
                }}
                placeholder="e.g. R2025001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseCode">Course code</Label>
              <Input
                id="courseCode"
                value={courseCode}
                onChange={(e) => {
                  setCourseCode(e.target.value);
                  if (e.target.value) setRoll("");
                }}
                placeholder="e.g. CS201"
              />
            </div>
          </div>

          {query ? (
            <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => `${r.roll}-${r.subCode}`} loading={isLoading} />
          ) : (
            <p className="text-sm text-muted-foreground">Enter a roll or course code to see registrations.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Mapping</DialogTitle>
            <DialogDescription>Registers a student for a course, in the registration table for their batch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="mappingRoll">Student roll</Label>
              <Input id="mappingRoll" {...register("roll")} placeholder="e.g. R2025001" />
              {errors.roll && <p className="text-sm text-destructive">{errors.roll.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mappingSubCode">Course code</Label>
              <Input id="mappingSubCode" {...register("subCode")} placeholder="e.g. CS201" />
              {errors.subCode && <p className="text-sm text-destructive">{errors.subCode.message}</p>}
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
