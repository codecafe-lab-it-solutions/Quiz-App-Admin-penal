"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Registration {
  roll: string;
  subCode: string;
  batch?: string;
}

interface ListResponse {
  items: Registration[];
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);

export default function StudentMappingPage() {
  const [roll, setRoll] = useState("");
  const [courseCode, setCourseCode] = useState("");

  // Roll search takes priority if both are somehow filled - mirrors the API contract.
  const query = roll.trim()
    ? `roll=${encodeURIComponent(roll.trim())}`
    : courseCode.trim()
      ? `courseCode=${encodeURIComponent(courseCode.trim())}`
      : null;

  const { data, isLoading } = useSWR(query ? `/api/admin/mapping/student-course-section?${query}` : null, fetcher);

  const columns: DataTableColumn<Registration>[] = [
    { key: "roll", header: "Student roll", render: (r) => r.roll },
    { key: "subCode", header: "Course code", render: (r) => r.subCode },
    ...(courseCode.trim() ? [{ key: "batch", header: "Batch", render: (r: Registration) => r.batch ?? "—" }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student ↔ Course Mapping</h1>
        <p className="text-sm text-muted-foreground">
          Live registrations synced from the university system. Search by student roll or course code -
          this spans ~60 per-batch tables, so an unfiltered list isn't shown.
        </p>
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
    </div>
  );
}
