import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// The section-derived roster a faculty/admin can allot this quiz to, plus
// which of those students are already allotted - powers the "Allot Students"
// checkbox list (default: everyone checked).
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const quizSections = await prisma.quizSection.findMany({ where: { quizId } });
    const sectionIds = quizSections.map((qs) => qs.sectionId);

    const members = sectionIds.length
      ? await prisma.sectionStudent.findMany({
          where: { sectionId: { in: sectionIds }, source: { not: "manual_removed" } },
        })
      : [];
    const rolls = [...new Set(members.map((m) => m.studentRoll))];

    const [names, allotments] = await Promise.all([
      getStudentNamesByRolls(rolls),
      prisma.quizAllotment.findMany({ where: { quizId }, select: { studentRoll: true } }),
    ]);
    const allottedRolls = new Set(allotments.map((a) => a.studentRoll));

    const items = rolls
      .map((roll) => ({ roll, name: names.get(roll) ?? roll, allotted: allottedRolls.has(roll) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
