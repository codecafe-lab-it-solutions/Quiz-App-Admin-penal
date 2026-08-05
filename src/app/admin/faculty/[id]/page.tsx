"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface FacultyDetail {
  roll: string;
  name: string;
  email: string;
  currentSubList: string;
  courseMappings: { id: number; subCode: string; branch: string; sem: string }[];
}

const fetcher = (url: string) => apiClient.get<FacultyDetail>(url);

export default function FacultyDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useSWR(`/api/admin/faculty/${params.id}`, fetcher);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/faculty">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.roll} · {data.email}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Course mappings</CardTitle>
            <CardDescription>From the legacy course-allocation table.</CardDescription>
          </div>
          <Badge variant="secondary">Showing: {data.currentSubList}</Badge>
        </CardHeader>
        <CardContent>
          {data.courseMappings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course mappings for the current semester.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course code</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Semester</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courseMappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.subCode}</TableCell>
                    <TableCell>{m.branch}</TableCell>
                    <TableCell>{m.sem}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
