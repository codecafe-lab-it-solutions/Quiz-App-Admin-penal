"use client";

import { useState } from "react";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Department {
  id: number;
  name: string;
  _count: { courses: number };
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const schema = z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters") });
type FormValues = z.infer<typeof schema>;

const fetcher = (url: string) => apiClient.get<ListResponse<Department>>(url);

export default function DepartmentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  const { data, isLoading, mutate } = useSWR(`/api/admin/departments?${params.toString()}`, fetcher);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "" });
    setDialogOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    reset({ name: dept.name });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/admin/departments/${editing.id}`, values);
        toast.success("Department updated");
      } else {
        await apiClient.post("/api/admin/departments", values);
        toast.success("Department created");
      }
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/api/admin/departments/${id}`);
      toast.success("Department deleted");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed");
    }
  };

  const columns: DataTableColumn<Department>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "courses", header: "Courses", render: (r) => r._count?.courses ?? 0 },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            }
            title="Delete department?"
            description={`Delete "${r.name}"? This cannot be undone.`}
            confirmLabel="Delete"
            onConfirm={() => handleDelete(r.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-sm text-muted-foreground">Manage academic departments.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>

      <FilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search departments..." />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {data?.meta && (
        <PaginationBar page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={data.meta.pageSize} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Department" : "Add Department"}</DialogTitle>
            <DialogDescription>{editing ? "Update the department name." : "Create a new department."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Department name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
