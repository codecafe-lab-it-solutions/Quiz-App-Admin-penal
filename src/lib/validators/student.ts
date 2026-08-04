import { z } from "zod";

export const studentSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional().or(z.literal("")),
  rollNo: z.string().trim().min(1, "Roll number is required"),
  enrollmentNo: z.string().trim().min(1, "Enrollment number is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const studentUpdateSchema = studentSchema.partial();

export const studentBulkRowSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().optional().or(z.literal("")),
  rollNo: z.string().trim().min(1, "Roll number is required"),
  enrollmentNo: z.string().trim().min(1, "Enrollment number is required"),
  password: z.string().trim().optional().or(z.literal("")),
});

export type StudentBulkRow = z.infer<typeof studentBulkRowSchema>;
