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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FacultyForm, FacultyFormValues } from "@/components/admin/faculty-form";
import { Plus, Upload, Pencil, UserX, UserCheck } from "lucide-react";

interface Faculty {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  employeeCode: string;
  status: "active" | "inactive";
  department: { id: number; name: string };
}

interface Department {
  id: number;
  name: string;
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const fetcher = (url: string) => apiClient.get<ListResponse<Faculty>>(url);
const deptFetcher = (url: string) => apiClient.get<ListResponse<Department>>(url);

export default function FacultyListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  if (departmentId !== "all") params.set("departmentId", departmentId);
  if (status !== "all") params.set("status", status);

  const { data, isLoading, mutate } = useSWR(`/api/admin/faculty?${params.toString()}`, fetcher);
  const { data: deptData } = useSWR("/api/admin/departments?pageSize=100", deptFetcher);

  const handleCreate = async (values: FacultyFormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/faculty", values);
      toast.success("Faculty created");
      setCreateOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to create faculty");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (faculty: Faculty) => {
    try {
      if (faculty.status === "active") {
        await apiClient.delete(`/api/admin/faculty/${faculty.id}`);
      } else {
        await apiClient.patch(`/api/admin/faculty/${faculty.id}`, { status: "active" });
      }
      toast.success(`Faculty ${faculty.status === "active" ? "deactivated" : "activated"}`);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Action failed");
    }
  };

  const columns: DataTableColumn<Faculty>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "employeeCode", header: "Employee Code", render: (r) => r.employeeCode },
    { key: "department", header: "Department", render: (r) => r.department?.name ?? "—" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.status === "active" ? "success" : "secondary"}>{r.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/admin/faculty/${r.id}`}>
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                {r.status === "active" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </Button>
            }
            title={r.status === "active" ? "Deactivate faculty?" : "Activate faculty?"}
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
          <h1 className="text-2xl font-bold tracking-tight">Faculty</h1>
          <p className="text-sm text-muted-foreground">Manage faculty accounts and departments.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/faculty/bulk-upload">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, employee code..."
      >
        <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {deptData?.items.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <DialogTitle>Add Faculty</DialogTitle>
            <DialogDescription>Create a new faculty account.</DialogDescription>
          </DialogHeader>
          <FacultyForm submitting={submitting} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
