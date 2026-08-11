import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentUpdateSchema } from "@/lib/validators/directory";
import { getStudentByRoll, getStudentCourses, updateStudent, deleteStudent } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { assignStudentToDefaultSection, addManualSectionStudent } from "@/lib/section-sync";

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

    const { sectionId, assignDefaultSection, ...rest } = studentUpdateSchema.parse(await req.json());
    const student = await updateStudent(params.id, rest);

    // Optional section change (2026-08-10 MOM) - additive only: adds the
    // student to this section without removing them from any other.
    if (sectionId) {
      const existing = await prisma.section.findUnique({ where: { id: sectionId } });
      if (!existing) throw new ApiError(404, "Section not found");
      await addManualSectionStudent(sectionId, params.id);
    } else if (assignDefaultSection) {
      await assignStudentToDefaultSection(student.major, student.semNow, params.id);
    }

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
