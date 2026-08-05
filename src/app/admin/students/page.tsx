"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { DataTable, DataTableColumn } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { PaginationBar } from "@/components/admin/pagination-bar";
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
import { ChevronRight, Plus } from "lucide-react";

interface Student {
  roll: string;
  name: string;
  email: string;
  major: string;
  batch: string;
  semNow: string;
}

interface ListResponse<T> {
  items: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

const fetcher = (url: string) => apiClient.get<ListResponse<Student>>(url);

const schema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  major: z.string().trim().min(1, "Major is required"),
  batch: z.string().trim().min(1, "Batch is required"),
  semNow: z.string().trim().min(1, "Semester is required"),
});
type FormValues = z.infer<typeof schema>;

export default function StudentListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams({ page: String(page), pageSize: "10", search });

  const { data, isLoading, mutate } = useSWR(`/api/admin/students?${params.toString()}`, fetcher);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    reset({ roll: "", name: "", email: "", password: "", major: "", batch: "", semNow: "" });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await apiClient.post("/api/admin/students", values);
      toast.success("Student added");
      setDialogOpen(false);
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<Student>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", render: (r) => r.email },
    { key: "roll", header: "Roll", render: (r) => r.roll },
    { key: "major", header: "Major", render: (r) => r.major || "—" },
    { key: "batch", header: "Batch", render: (r) => r.batch || "—" },
    { key: "semNow", header: "Semester", render: (r) => r.semNow || "—" },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Button asChild variant="ghost" size="icon">
          <Link href={`/admin/students/${r.roll}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Live directory synced from the university system.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search by name, email, roll..."
      />

      <DataTable columns={columns} rows={data?.items ?? []} rowKey={(r) => r.roll} loading={isLoading} />

      {data?.meta && (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          total={data.meta.total}
          pageSize={data.meta.pageSize}
          onPageChange={setPage}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Creates a new student login and profile directly in the university directory.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="roll">Roll</Label>
                <Input id="roll" {...register("roll")} placeholder="e.g. R2025001" />
                {errors.roll && <p className="text-sm text-destructive">{errors.roll.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="major">Major</Label>
                <Input id="major" {...register("major")} placeholder="e.g. CSE" />
                {errors.major && <p className="text-sm text-destructive">{errors.major.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch">Batch</Label>
                <Input id="batch" {...register("batch")} placeholder="e.g. 2025" />
                {errors.batch && <p className="text-sm text-destructive">{errors.batch.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="semNow">Semester</Label>
                <Input id="semNow" {...register("semNow")} placeholder="e.g. 3" />
                {errors.semNow && <p className="text-sm text-destructive">{errors.semNow.message}</p>}
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
