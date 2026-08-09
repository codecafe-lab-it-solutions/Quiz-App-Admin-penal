import { z } from "zod";

export const attendanceReportQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  studentRoll: z.array(z.string()).optional(),
  search: z.string().trim().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  export: z.enum(["excel", "pdf"]).optional(),
});
export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>;

export const resultsReportQuerySchema = attendanceReportQuerySchema.extend({
  resultStatus: z.enum(["pending", "declared", "published"]).optional(),
});
export type ResultsReportQuery = z.infer<typeof resultsReportQuerySchema>;

export const violationsQuerySchema = z.object({
  quizId: z.coerce.number().int().positive().optional(),
  studentRoll: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type ViolationsQuery = z.infer<typeof violationsQuerySchema>;
