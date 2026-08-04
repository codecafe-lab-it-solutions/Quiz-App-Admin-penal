"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

const facultyFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  departmentId: z.coerce.number().int().positive("Select a department"),
  status: z.enum(["active", "inactive"]),
  password: z.string().optional(),
});

export type FacultyFormValues = z.infer<typeof facultyFormSchema>;

interface Department {
  id: number;
  name: string;
}

interface FacultyFormProps {
  defaultValues?: Partial<FacultyFormValues>;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: FacultyFormValues) => void;
  onCancel?: () => void;
}

const deptFetcher = (url: string) => apiClient.get<{ items: Department[] }>(url);

export function FacultyForm({ defaultValues, isEdit, submitting, onSubmit, onCancel }: FacultyFormProps) {
  const { data: deptData } = useSWR("/api/admin/departments?pageSize=100", deptFetcher);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FacultyFormValues>({
    resolver: zodResolver(facultyFormSchema),
    defaultValues: { status: "active", ...defaultValues },
  });

  const departmentId = watch("departmentId");
  const status = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" {...register("name")} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employeeCode">Employee code</Label>
          <Input id="employeeCode" {...register("employeeCode")} />
          {errors.employeeCode && <p className="text-sm text-destructive">{errors.employeeCode.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Department</Label>
          <Select
            value={departmentId ? String(departmentId) : undefined}
            onValueChange={(v) => setValue("departmentId", Number(v), { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {deptData?.items.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setValue("status", v as "active" | "inactive")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="password">{isEdit ? "Reset password (optional)" : "Password"}</Label>
          <Input id="password" type="password" {...register("password")} placeholder={isEdit ? "Leave blank to keep current password" : ""} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create faculty"}
        </Button>
      </div>
    </form>
  );
}
