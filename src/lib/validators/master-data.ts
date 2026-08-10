import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required"),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const courseSchema = z.object({
  name: z.string().trim().min(2, "Course name is required"),
  code: z.string().trim().min(1, "Course code is required"),
  departmentId: z.coerce.number().int().positive("Select a department"),
  credits: z.coerce.number().int().min(0).default(0),
});
export type CourseInput = z.infer<typeof courseSchema>;

const sessionBaseSchema = z.object({
  name: z.string().trim().min(2, "Session name is required"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export const sessionSchema = sessionBaseSchema.refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});
export type SessionInput = z.infer<typeof sessionSchema>;
export const sessionUpdateSchema = sessionBaseSchema.partial();

export const sectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required"),
  courseIds: z.array(z.coerce.number().int().positive()).min(1, "Select at least one course"),
  // Direct student selection at section-creation time (2026-08-10 MOM) -
  // optional so existing callers (and section edits) are unaffected.
  studentRolls: z.array(z.string().trim().min(1)).optional().default([]),
});
export type SectionInput = z.infer<typeof sectionSchema>;

export const sectionMemberSchema = z.object({
  roll: z.string().trim().min(1, "Roll number is required"),
});
export type SectionMemberInput = z.infer<typeof sectionMemberSchema>;

export const sectionBulkMemberSchema = z.object({
  rolls: z.array(z.string().trim().min(1)).min(1, "Select at least one student"),
});
export type SectionBulkMemberInput = z.infer<typeof sectionBulkMemberSchema>;

export const buildingSchema = z.object({
  name: z.string().trim().min(2, "Building name is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().int().min(10).max(1000),
});
export type BuildingInput = z.infer<typeof buildingSchema>;

export const adminUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["super_admin", "admin"]).default("admin"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});
export type AdminUserInput = z.infer<typeof adminUserSchema>;
