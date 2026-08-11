import { z } from "zod";

export const facultyCourseMappingQuerySchema = z.object({
  facultyRoll: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

// No `.refine` requiring roll/courseCode - when neither is given, the route
// returns a bounded "recently registered" default list instead of erroring,
// so the page shows real data immediately rather than only after a search.
// `batch`/`sectionId` are browse filters (pick from a dropdown instead of
// typing an exact roll/course code) - they narrow whichever of the above
// branches runs, and on their own drive a bounded per-batch/per-section
// browse instead of falling back to the generic recent list.
export const studentCourseMappingQuerySchema = z.object({
  roll: z.string().trim().min(1).optional(),
  courseCode: z.string().trim().min(1).optional(),
  batch: z.string().trim().min(1).optional(),
  sectionId: z.coerce.number().int().positive().optional(),
});
