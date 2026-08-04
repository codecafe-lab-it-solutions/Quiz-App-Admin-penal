import { z } from "zod";

export const attendanceReportQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().optional(),
  sectionId: z.coerce.number().int().positive().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  export: z.enum(["excel", "pdf"]).optional(),
});
export type AttendanceReportQuery = z.infer<typeof attendanceReportQuerySchema>;
