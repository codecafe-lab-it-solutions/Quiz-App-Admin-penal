import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentNamesByRolls, narrowToCourseRegistrants } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

// The section-derived roster a faculty/admin can allot this quiz to, plus
// which of those students are already allotted - powers the "Allot Students"
// checkbox list (default: everyone checked). Narrowed to students actually
// registered for the quiz's own course where that can be verified (see
// narrowToCourseRegistrants and the same fix + rationale in
// /api/faculty/sections/students) - section membership alone can include
// students registered for a different course sharing the same merged
// section.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: { select: { code: true } } } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");

    const quizSections = await prisma.quizSection.findMany({ where: { quizId } });
    const sectionIds = quizSections.map((qs) => qs.sectionId);

    const subList = await getCurrentSubList();
    const members = sectionIds.length
      ? await prisma.sectionStudent.findMany({
          where: { sectionId: { in: sectionIds }, source: { not: "manual_removed" } },
        })
      : [];
    const memberRolls = [...new Set(members.map((m) => m.studentRoll))];
    const rolls = await narrowToCourseRegistrants(memberRolls, quiz.course.code, subList);

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
