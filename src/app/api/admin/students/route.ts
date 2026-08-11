import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { studentCreateSchema } from "@/lib/validators/directory";
import { listStudents, createStudent } from "@/lib/legacy-db";
import { assignStudentToDefaultSection, addManualSectionStudent } from "@/lib/section-sync";

// Student master data is sourced live from the legacy isr_login_tbl /
// isr_stu_data_tbl / isr_stu_main_tbl tables. POST writes directly into
// those tables, per an explicit product decision to let admins add students
// from this panel.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const major = params.major || undefined;
    const batch = params.batch || undefined;
    const semNow = params.semNow || undefined;

    const { items, total } = await listStudents({ search, major, batch, semNow, page, pageSize });

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { sectionId, ...studentData } = studentCreateSchema.parse(await req.json());
    const student = await createStudent(studentData);

    let sectionName: string;
    if (sectionId) {
      const existing = await prisma.section.findUnique({ where: { id: sectionId } });
      if (!existing) throw new ApiError(404, "Section not found");
      await addManualSectionStudent(sectionId, studentData.roll);
      sectionName = existing.name;
    } else {
      // No sectionId picked - derive the default section from this student's
      // own real Major + Semester, not a typed code.
      const section = await assignStudentToDefaultSection(studentData.major, studentData.semNow, studentData.roll);
      sectionName = section.name;
    }

    return created({ ...student, section: sectionName });
  } catch (error) {
    return handleApiError(error);
  }
}
