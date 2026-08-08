import { NextRequest } from "next/server";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { facultyCourseMappingCreateSchema } from "@/lib/validators/directory";
import { paginationMeta } from "@/lib/validators/common";
import { getFacultyCourseMappings, createFacultyCourseMapping } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { prisma } from "@/lib/db";
import { addManualSectionFaculty } from "@/lib/section-sync";

// Sourced live from the legacy isr_sub_available_tbl, filtered by the
// admin-configurable "current" sub_list (Settings > Semester Config). POST
// writes a new mapping row directly into that table.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { facultyRoll, page, pageSize } = facultyCourseMappingQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const currentSubList = await getCurrentSubList();
    const { items, total } = await getFacultyCourseMappings(currentSubList, { facultyRoll, page, pageSize });

    return ok({ items, currentSubList, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { sectionId, ...rest } = facultyCourseMappingCreateSchema.parse(await req.json());
    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) throw new ApiError(404, "Section not found");

    const currentSubList = await getCurrentSubList();
    const mapping = await createFacultyCourseMapping({ ...rest, subList: currentSubList });
    await addManualSectionFaculty(sectionId, rest.facRoll);

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
