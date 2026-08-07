import { NextRequest } from "next/server";
import { ok, created, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { studentCourseMappingCreateSchema } from "@/lib/validators/directory";
import {
  getStudentByRoll,
  getStudentCourses,
  getCourseRegistrations,
  createStudentCourseMapping,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Sourced live from the legacy per-batch isr_reg_<batch>_tbl tables. GET
// never returns an unfiltered dump - a roll or course code is required so
// this can't fan out across all ~60 batch tables at once. POST writes a new
// registration row into the table for the student's batch.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const parsed = studentCourseMappingQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      return fail(400, "Provide either roll or courseCode to search");
    }
    const { roll, courseCode } = parsed.data;
    const subList = await getCurrentSubList();

    if (roll) {
      const student = await getStudentByRoll(roll);
      if (!student || !student.batch) {
        return ok({ items: [] });
      }
      const courses = await getStudentCourses(roll, student.batch, subList);
      return ok({ items: courses.map((c) => ({ roll: c.roll, subCode: c.subCode, batch: student.batch })) });
    }

    const items = await getCourseRegistrations(courseCode!, subList);
    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = studentCourseMappingCreateSchema.parse(await req.json());
    const mapping = await createStudentCourseMapping({ ...body, subList: await getCurrentSubList() });

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
