import { z } from "zod";

export const facultyCourseMappingQuerySchema = z.object({
  facultyRoll: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

// No `.refine` requiring roll/courseCode - when neither is given, the route
// returns a bounded "recently registered" default list instead of erroring,
// so the page shows real data immediately rather than only after a search.
export const studentCourseMappingQuerySchema = z.object({
  roll: z.string().trim().min(1).optional(),
  courseCode: z.string().trim().min(1).optional(),
});
