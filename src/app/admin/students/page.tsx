"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentForm, StudentFormValues } from "@/components/admin/student-form";
import { Plus, Upload, Pencil, UserX, UserCheck } from "lucide-react";

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  rollNo: string;
  enrollmentNo: string;
  status: "active" | "inactive";
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const fetcher = (url: string) => apiClient.get<ListResponse<Student>>(url);

export default function StudentListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  if (status !== "all") params.set("status", status);

  const { data, isLoading, mutate } = useSWR(`/api/admin/students?${params.toString()}`, fetcher);

  const handleCreate = async (values: StudentFormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/students", values);
      toast.success("Student created");
      setCreateOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (student: Student) => {
    try {
      if (student.status === "active") {
        await apiClient.delete(`/api/admin/students/${student.id}`);
      } else {
        await apiClient.patch(`/api/admin/students/${student.id}`, { status: "active" });
      }
      toast.success(`Student ${student.status === "active" ? "deactivated" : "activated"}`);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Action failed");
    }
  };

  const columns: DataTableColumn<Student>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "rollNo", header: "Roll No", render: (r) => r.rollNo },
    { key: "enrollmentNo", header: "Enrollment No", render: (r) => r.enrollmentNo },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/students/${r.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                {r.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </Button>
            }
            title={r.status === "active" ? "Deactivate student?" : "Activate student?"}
            description={`This will ${r.status === "active" ? "deactivate" : "activate"} ${r.name}'s account.`}
            confirmLabel={r.status === "active" ? "Deactivate" : "Activate"}
            onConfirm={() => handleToggleStatus(r)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">Manage student accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/students/bulk-upload">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, roll no..."
      >
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {data?.meta && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>Create a new student account.</DialogDescription>
          </DialogHeader>
          <StudentForm submitting={submitting} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
