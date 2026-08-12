import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getStudentsForRealSections } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Live "Allot Students" candidate list for a faculty's course, across the
// given section ids - resolved back to their real section names and then
// computed fresh from isr_sub_available_tbl + isr_stu_main_tbl +
// isr_reg_<batch>_tbl (see getStudentsForRealSections), never read from
// section_students. Distinct from GET /api/faculty/sections/students, which
// is unchanged and still backs any other section-membership consumer.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const subCode = req.nextUrl.searchParams.get("subCode");
    if (!subCode) return fail(400, "subCode is required");

    const sectionIds = (req.nextUrl.searchParams.get("sectionIds") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (sectionIds.length === 0) {
      return ok({ items: [] });
    }

    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);
    const subList = await getCurrentSubList();

    const sections = await prisma.section.findMany({
      where: { id: { in: sectionIds } },
      select: { name: true },
    });

    const items = await getStudentsForRealSections(
      facultyRoll,
      subCode,
      subList,
      sections.map((s) => s.name),
    );

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
