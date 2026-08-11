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
    // Major + Semester is this student's default section (e.g. "CE_13") -
    // app-owned, not a legacy column; see assignStudentToDefaultSection. Not
    // a client-supplied field: when `sectionId` (an existing section picked
    // directly) is omitted, the route derives the default section from this
    // same major/semNow instead of a typed code.
    sectionId: z.coerce.number().int().positive().optional(),
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
  // section without touching any section they're already in. `sectionId`
  // picks an existing section directly; `assignDefaultSection` opts into the
  // real-data Major_SemesterNumber default instead of a typed code.
  sectionId: z.coerce.number().int().positive().optional(),
  assignDefaultSection: z.boolean().optional(),
});

export const loginStatusUpdateSchema = z.object({
  active: z.boolean(),
});

// No `sectionId` - the section is always derived from branch + sem (Major +
// Semester, the same default-section convention as students), never a
// manually picked existing section. See assignFacultyToDefaultSection.
export const facultyCourseMappingCreateSchema = z.object({
  facRoll: z.string().trim().min(1, "Faculty roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
  branch: z.string().trim().min(1, "Branch is required"),
  sem: z.string().trim().min(1, "Semester is required"),
});

export const studentCourseMappingCreateSchema = z.object({
  roll: z.string().trim().min(1, "Student roll is required"),
  subCode: z.string().trim().min(1, "Course code is required"),
});
