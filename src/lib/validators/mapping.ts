import { z } from "zod";

export const facultyMappingCreateSchema = z.object({
  facultyId: z.coerce.number().int().positive(),
  mappings: z
    .array(
      z.object({
        courseId: z.coerce.number().int().positive(),
        sectionId: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Select at least one course/section pair"),
});
export type FacultyMappingCreateInput = z.infer<typeof facultyMappingCreateSchema>;

export const studentMappingCreateSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  mappings: z
    .array(
      z.object({
        courseId: z.coerce.number().int().positive(),
        sectionId: z.coerce.number().int().positive(),
      })
    )
    .min(1, "Select at least one course/section pair"),
});
export type StudentMappingCreateInput = z.infer<typeof studentMappingCreateSchema>;

export const mappingQuerySchema = z.object({
  facultyId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  courseId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const mappingDeleteSchema = z.object({
  id: z.coerce.number().int().positive(),
});
