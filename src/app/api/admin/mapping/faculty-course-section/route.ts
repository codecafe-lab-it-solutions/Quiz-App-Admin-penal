import { NextRequest } from "next/server";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingQuerySchema } from "@/lib/validators/mapping";
import { facultyCourseMappingCreateSchema } from "@/lib/validators/directory";
import { paginationMeta } from "@/lib/validators/common";
import {
  getFacultyCourseMappings,
  createFacultyCourseMapping,
  getRealMajors,
  resolveMajorFromBranch,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Sourced live from the legacy isr_sub_available_tbl, filtered by the
// admin-configurable "current" sub_list (Settings > Semester Config). POST
// writes a new mapping row directly into that table.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { facultyRoll, page, pageSize } =
      facultyCourseMappingQuerySchema.parse(
        Object.fromEntries(req.nextUrl.searchParams),
      );

    const currentSubList = await getCurrentSubList();
    const { items, total } = await getFacultyCourseMappings(currentSubList, {
      facultyRoll,
      page,
      pageSize,
    });

    // Each row's own section is already resolved onto isr_sub_available_tbl.section
    // (see getFacultyCourseMappings) - scoped to that exact course+branch row,
    // not a combined list across every course this faculty teaches.
    const itemsWithSections = items.map((item) => ({
      ...item,
      sections: item.section ? [{ name: item.section }] : [],
    }));

    return ok({
      items: itemsWithSections,
      currentSubList,
      meta: paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = facultyCourseMappingCreateSchema.parse(await req.json());
    const major = resolveMajorFromBranch(body.branch, await getRealMajors());

    const currentSubList = await getCurrentSubList();
    const mapping = await createFacultyCourseMapping({
      ...body,
      major,
      subList: currentSubList,
    });

    return created(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
