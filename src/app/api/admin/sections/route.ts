import { NextRequest } from "next/server";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyCourseMappingCreateSchema } from "@/lib/validators/directory";
import {
  getAllSections,
  createFacultyCourseMapping,
  bulkRegisterStudentsForSection,
  getRealMajors,
  resolveMajorFromBranch,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Section-first view: GET lists every real section for the current cycle
// (grouped isr_sub_available_tbl.section values). POST creates a section -
// which, since a section has no identity of its own, means creating the
// faculty/course/branch/sem mapping row that resolves to it (same write
// Faculty <-> Course mapping does) - and then bulk-registers every real
// student in that major+sem into the course, so the section arrives with its
// real membership already allotted instead of needing each student added
// one at a time.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const currentSubList = await getCurrentSubList();
    const items = await getAllSections(currentSubList);

    return ok({ items, currentSubList });
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

    const allotment = await bulkRegisterStudentsForSection({
      subCode: body.subCode,
      subList: currentSubList,
      major,
      sem: body.sem,
    });

    return created({ mapping, allotment });
  } catch (error) {
    return handleApiError(error);
  }
}
