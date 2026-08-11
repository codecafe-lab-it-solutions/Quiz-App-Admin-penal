import { z } from "zod";

export const facultyCourseMappingQuerySchema = z.object({
  facultyRoll: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

// Backs the "Add Mapping" dialog's Course search dropdown - real courses
// only, never a typed code.
export const courseCatalogQuerySchema = z.object({
  search: z.string().trim().optional().default(""),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// Backs the same dialog's Branch/Semester dropdowns, scoped to whichever
// course was picked - real (branch, sem) pairs that course is actually
// offered as, never typed free text.
export const branchSemOptionsQuerySchema = z.object({
  subCode: z.string().trim().min(1, "Course is required"),
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
