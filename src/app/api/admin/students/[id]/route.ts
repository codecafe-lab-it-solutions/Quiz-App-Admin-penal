import { NextRequest } from "next/server";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getStudentByRoll, getStudentCourses } from "@/lib/legacy-db";

// Read-only: student master data is sourced live from the legacy isr_* tables.
// The [id] segment is the legacy roll number, not a numeric app-owned id.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const roll = params.id;
    const student = await getStudentByRoll(roll);
    if (!student) throw new ApiError(404, "Student not found");

    const courses = student.batch ? await getStudentCourses(roll, student.batch) : [];

    return ok({ ...student, courses });
  } catch (error) {
    return handleApiError(error);
  }
}
