import { NextRequest } from "next/server";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentUpdateSchema } from "@/lib/validators/directory";
import { getStudentByRoll, getStudentCourses, updateStudent, deleteStudent } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Student master data is sourced live from the legacy isr_* tables. The
// [id] segment is the legacy roll number, not a numeric app-owned id -
// it's immutable, so PATCH only ever touches name/email/password/profile.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const roll = params.id;
    const student = await getStudentByRoll(roll);
    if (!student) throw new ApiError(404, "Student not found");

    const courses = student.batch ? await getStudentCourses(roll, student.batch, await getCurrentSubList()) : [];

    return ok({ ...student, courses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = studentUpdateSchema.parse(await req.json());
    const student = await updateStudent(params.id, body);

    return ok(student);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    await deleteStudent(params.id);

    return ok({ message: "Student deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
