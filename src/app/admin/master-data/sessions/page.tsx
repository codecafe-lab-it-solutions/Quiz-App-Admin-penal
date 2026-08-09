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
import { format } from "@/lib/format-date";

interface Session {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  subListCode: string | null;
}
interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const schema = z
  .object({
    name: z.string().trim().min(2, "Session name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });
type FormValues = z.infer<typeof schema>;

const fetcher = (url: string) => apiClient.get<ListResponse<Session>>(url);

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });
  const { data, isLoading, mutate } = useSWR(`/api/admin/sessions?${params.toString()}`, fetcher);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", startDate: "", endDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (session: Session) => {
    setEditing(session);
    reset({
      name: session.name,
      startDate: session.startDate.slice(0, 10),
      endDate: session.endDate.slice(0, 10),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        await apiClient.patch(`/api/admin/sessions/${editing.id}`, values);
        toast.success("Session updated");
      } else {
        await apiClient.post("/api/admin/sessions", values);
        toast.success("Session created");
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
      await apiClient.delete(`/api/admin/sessions/${id}`);
      toast.success("Session deleted");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Delete failed");
    }
  };

  const columns: DataTableColumn<Session>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "startDate", header: "Start Date", render: (r) => format(r.startDate) },
    { key: "endDate", header: "End Date", render: (r) => format(r.endDate) },
    { key: "semester", header: "Semester", render: (r) => r.subListCode ?? "—" },
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
            title="Delete session?"
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
          <h1 className="text-2xl font-bold tracking-tight">Academic Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Manage academic sessions/terms. Each session is tagged with the semester (sub-list code) active in
            Semester Configuration at the time it was created.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Session
        </Button>
      </div>

      <FilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Search sessions..." />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.id} loading={isLoading} />

      {data?.meta && (
        <PaginationBar page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} pageSize={data.meta.pageSize} onPageChange={setPage} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Session" : "Add Session"}</DialogTitle>
            <DialogDescription>{editing ? "Update this academic session." : "Create a new academic session."}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">Session name</Label>
              <Input id="name" placeholder="e.g. 2025-26 Odd Semester" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
              </div>
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
