import { z } from "zod";

export const facultySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional().or(z.literal("")),
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  departmentId: z.coerce.number().int().positive("Select a department"),
  status: z.enum(["active", "inactive"]).default("active"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type FacultyInput = z.infer<typeof facultySchema>;

export const facultyUpdateSchema = facultySchema.partial();

export const facultyBulkRowSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().optional().or(z.literal("")),
  employeeCode: z.string().trim().min(1, "Employee code is required"),
  department: z.string().trim().min(1, "Department is required"),
  password: z.string().trim().optional().or(z.literal("")),
});

export type FacultyBulkRow = z.infer<typeof facultyBulkRowSchema>;
