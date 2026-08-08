import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// Union of section membership across the given sections - powers the
// "Allot Students" checkbox list shown directly on the quiz-creation form,
// before a quiz (and therefore a QuizAllotment) even exists yet.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const sectionIds = (req.nextUrl.searchParams.get("sectionIds") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (sectionIds.length === 0) {
      return ok({ items: [] });
    }

    const members = await prisma.sectionStudent.findMany({
      where: { sectionId: { in: sectionIds }, source: { not: "manual_removed" } },
    });
    const rolls = [...new Set(members.map((m) => m.studentRoll))];
    const names = await getStudentNamesByRolls(rolls);

    const items = rolls
      .map((roll) => ({ roll, name: names.get(roll) ?? roll }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
