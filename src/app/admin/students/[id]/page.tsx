"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface StudentDetail {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
  courses: { roll: string; subCode: string }[];
}

const fetcher = (url: string) => apiClient.get<StudentDetail>(url);

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useSWR(`/api/admin/students/${params.id}`, fetcher);

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/students">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.name}</h1>
          <p className="text-sm text-muted-foreground">
            {data.roll} · {data.email} · {data.major || "—"} · Batch {data.batch || "—"} · Sem {data.semNow || "—"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course registrations</CardTitle>
          <CardDescription>From the legacy per-batch registration table.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No course registrations found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.courses.map((c, i) => (
                  <TableRow key={`${c.subCode}-${i}`}>
                    <TableCell>{c.subCode}</TableCell>
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
