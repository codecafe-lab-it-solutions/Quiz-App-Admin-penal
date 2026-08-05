import { NextRequest } from "next/server";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getFacultyByRoll, getFacultyCourseMappings } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// Read-only: faculty master data is sourced live from the legacy isr_* tables.
// The [id] segment is the legacy roll number, not a numeric app-owned id.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const roll = params.id;
    const faculty = await getFacultyByRoll(roll);
    if (!faculty) throw new ApiError(404, "Faculty not found");

    const currentSubList = await getCurrentSubList();
    const { items: courseMappings } = await getFacultyCourseMappings(currentSubList, {
      facultyRoll: roll,
      page: 1,
      pageSize: 200,
    });

    return ok({ ...faculty, currentSubList, courseMappings });
  } catch (error) {
    return handleApiError(error);
  }
}
