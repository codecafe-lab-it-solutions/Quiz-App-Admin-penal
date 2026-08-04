"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm, StudentFormValues } from "@/components/admin/student-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface StudentDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  rollNo: string;
  enrollmentNo: string;
  status: "active" | "inactive";
  courseSectionMaps: {
    id: number;
    course: { id: number; name: string; code: string };
    section: { id: number; name: string };
  }[];
}

const fetcher = (url: string) => apiClient.get<StudentDetail>(url);

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR(`/api/admin/students/${params.id}`, fetcher);
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = async (values: StudentFormValues) => {
    setSubmitting(true);
    try {
      const payload = { ...values, password: values.password || undefined };
      await apiClient.patch(`/api/admin/students/${params.id}`, payload);
      toast.success("Student updated");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="text-sm text-muted-foreground">{data.rollNo}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit details</CardTitle>
            <CardDescription>Update this student's profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentForm
              isEdit
              submitting={submitting}
              defaultValues={{
                name: data.name,
                email: data.email,
                phone: data.phone ?? "",
                rollNo: data.rollNo,
                enrollmentNo: data.enrollmentNo,
                status: data.status,
              }}
              onSubmit={handleUpdate}
              onCancel={() => router.push("/admin/students")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course / Section mappings</CardTitle>
            <CardDescription>Assigned via the Mapping screen.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.courseSectionMaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mappings yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.courseSectionMaps.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.course.name}</TableCell>
                      <TableCell>{m.section.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
