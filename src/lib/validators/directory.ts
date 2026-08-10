import { z } from "zod";

export const facultyCreateSchema = z.object({
  roll: z.string().trim().min(1, "Roll is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const studentCreateSchema = z
  .object({
    roll: z.string().trim().min(1, "Roll is required"),
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    major: z.string().trim().min(1, "Major is required"),
    batch: z.string().trim().min(1, "Batch is required"),
    // isr_stu_main_tbl.sem_now is a real INT column in the legacy database, so
    // this must be a plain numeric string (no "Final", "III", etc.).
    semNow: z.string().trim().regex(/^\d+$/, "Semester must be a whole number"),
    // Major + Section is this student's default section (2026-08-10 MOM) -
    // app-owned, not a legacy column; see assignStudentToDefaultSection.
    // Exactly one of these is expected: `section` (a new code, composed with
    // major) from the dropdown's "+ Create new section" path, or `sectionId`
    // (an existing section picked directly).
    section: z.string().trim().optional(),
    sectionId: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => !!data.section?.trim() || !!data.sectionId, {
    message: "Section is required",
    path: ["section"],
  });

export const facultyUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

export const studentUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().trim().email("Enter a valid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  major: z.string().trim().min(1, "Major is required").optional(),
  batch: z.string().trim().min(1, "Batch is required").optional(),
  semNow: z.string().trim().regex(/^\d+$/, "Semester must be a whole number").optional(),
  // Optional section change (2026-08-10 MOM) - adds the student to this
  // section without touching any section they're already in.
  section: z.string().trim().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
});

export const loginStatusUpdateSchema = z.object({
  active: z.boolean(),
});

export const facultyCourseMappingCreateSchema = z.object({
  facRoll: z.string().trim().min(1, "Faculty roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  sem: z.string().trim().min(1, "Semester is required"),
  sectionId: z.coerce.number().int().positive("Select a section"),
});

export const studentCourseMappingCreateSchema = z.object({
  roll: z.string().trim().min(1, "Student roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
});
