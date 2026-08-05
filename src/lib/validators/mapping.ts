import { z } from "zod";

export const facultyCourseMappingQuerySchema = z.object({
  facultyRoll: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

export const studentCourseMappingQuerySchema = z
  .object({
    roll: z.string().trim().min(1).optional(),
    courseCode: z.string().trim().min(1).optional(),
  })
  .refine((v) => v.roll || v.courseCode, {
    message: "Provide either roll or courseCode to search",
  });
