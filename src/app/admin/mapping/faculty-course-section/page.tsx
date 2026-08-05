"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { Badge } from "@/components/ui/badge";

interface Mapping {
  id: number;
  sem: string;
  subCode: string;
  facRoll: string;
  facultyName: string | null;
  branch: string;
}

interface ListResponse {
  items: Mapping[];
  currentSubList: string;
}

const fetcher = (url: string) => apiClient.get<ListResponse>(url);

export default function FacultyMappingPage() {
  const [facultyRoll, setFacultyRoll] = useState("");

  const params = new URLSearchParams({ pageSize: "100" });
  if (facultyRoll.trim()) params.set("facultyRoll", facultyRoll.trim());
  const { data, isLoading } = useSWR(`/api/admin/mapping/faculty-course-section?${params.toString()}`, fetcher);

  const columns: DataTableColumn<Mapping>[] = [
    { key: "faculty", header: "Faculty", render: (r) => `${r.facultyName ?? "—"} (${r.facRoll})` },
    { key: "subCode", header: "Course code", render: (r) => r.subCode },
    { key: "branch", header: "Branch", render: (r) => r.branch },
    { key: "sem", header: "Semester", render: (r) => r.sem },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Faculty ↔ Course Mapping</h1>
          <p className="text-sm text-muted-foreground">Live directory synced from the university course-allocation system.</p>
        </div>
        {data?.currentSubList && <Badge variant="secondary">Showing: {data.currentSubList}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mappings</CardTitle>
          <CardDescription>Filter by faculty roll number, or leave blank to see all mappings for the current semester.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FilterBar
            search={facultyRoll}
            onSearchChange={setFacultyRoll}
            searchPlaceholder="Filter by faculty roll..."
          />
          <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
