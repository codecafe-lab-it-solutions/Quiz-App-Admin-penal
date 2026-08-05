import { NextRequest } from "next/server";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { getStudentByRoll, getStudentCourses, getCourseRegistrations } from "@/lib/legacy-db";

// Read-only: sourced live from the legacy per-batch isr_reg_<batch>_tbl
// tables. Never returns an unfiltered dump - a roll or course code is
// required so this can't fan out across all ~60 batch tables at once.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const parsed = studentCourseMappingQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return fail(400, "Provide either roll or courseCode to search");
    }
    const { roll, courseCode } = parsed.data;

    if (roll) {
      const student = await getStudentByRoll(roll);
      if (!student || !student.batch) {
        return ok({ items: [] });
      }
      const courses = await getStudentCourses(roll, student.batch);
      return ok({ items: courses.map((c) => ({ roll: c.roll, subCode: c.subCode, batch: student.batch })) });
    }

    const items = await getCourseRegistrations(courseCode!);
    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
