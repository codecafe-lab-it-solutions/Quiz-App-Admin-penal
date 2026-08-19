import { NextRequest } from "next/server";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyUpdateSchema } from "@/lib/validators/directory";
import {
  getFacultyByRoll,
  getFacultyCourseMappings,
  updateFaculty,
  deleteFaculty,
} from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { prisma } from "@/lib/db";

// Faculty master data is sourced live from the legacy isr_* tables. The
// [id] segment is the legacy roll number, not a numeric app-owned id -
// it's immutable, so PATCH only ever touches name/email/password.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const roll = params.id;
    const faculty = await getFacultyByRoll(roll);
    if (!faculty) throw new ApiError(404, "Faculty not found");

    const currentSubList = await getCurrentSubList();
    const { items: courseMappings } = await getFacultyCourseMappings(
      currentSubList,
      {
        facultyRoll: roll,
        page: 1,
        pageSize: 200,
      },
    );
    const sectionRows = await prisma.isrSubAvailableTbl.findMany({
      where: { facRoll: roll, subList: currentSubList, section: { not: null } },
      select: { section: true },
      distinct: ["section"],
      orderBy: { section: "asc" },
    });

    return ok({
      ...faculty,
      currentSubList,
      courseMappings,
      sections: sectionRows.map((s) => ({ name: s.section! })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const body = facultyUpdateSchema.parse(await req.json());
    const faculty = await updateFaculty(params.id, body);

    return ok(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    await deleteFaculty(params.id);

    return ok({ message: "Faculty deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
