"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const studentFormSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  rollNo: z.string().trim().min(1, "Roll number is required"),
  enrollmentNo: z.string().trim().min(1, "Enrollment number is required"),
  status: z.enum(["active", "inactive"]),
  password: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  defaultValues?: Partial<StudentFormValues>;
  isEdit?: boolean;
  submitting?: boolean;
  onSubmit: (values: StudentFormValues) => void;
  onCancel?: () => void;
}

export function StudentForm({ defaultValues, isEdit, submitting, onSubmit, onCancel }: StudentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { status: "active", ...defaultValues },
  });

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
          <Label htmlFor="rollNo">Roll number</Label>
          <Input id="rollNo" {...register("rollNo")} />
          {errors.rollNo && <p className="text-sm text-destructive">{errors.rollNo.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="enrollmentNo">Enrollment number</Label>
          <Input id="enrollmentNo" {...register("enrollmentNo")} />
          {errors.enrollmentNo && <p className="text-sm text-destructive">{errors.enrollmentNo.message}</p>}
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
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Create student"}
        </Button>
      </div>
    </form>
  );
}
