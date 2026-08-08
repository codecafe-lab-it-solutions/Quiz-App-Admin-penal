import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { allotSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";

async function getSectionDerivedRolls(quizId: number): Promise<Set<string>> {
  const quizSections = await prisma.quizSection.findMany({ where: { quizId } });
  const sectionIds = quizSections.map((qs) => qs.sectionId);
  if (sectionIds.length === 0) return new Set();

  const members = await prisma.sectionStudent.findMany({
    where: { sectionId: { in: sectionIds }, source: { not: "manual_removed" } },
  });
  return new Set(members.map((m) => m.studentRoll));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "completed") throw new ApiError(400, "Cannot allot a completed quiz");

    const body = allotSchema.parse(await req.json());

    const eligibleRolls = await getSectionDerivedRolls(quizId);
    const studentRolls = body.studentRolls.filter((roll) => eligibleRolls.has(roll));

    if (studentRolls.length === 0) {
      throw new ApiError(400, "No eligible students to allot - check the quiz's linked sections have members");
    }

    await prisma.$transaction(
      studentRolls.map((studentRoll) =>
        prisma.quizAllotment.upsert({
          where: { quizId_studentRoll: { quizId, studentRoll } },
          update: {},
          create: { quizId, studentRoll, status: "allotted" },
        })
      )
    );

    const total = await prisma.quizAllotment.count({ where: { quizId } });
    return ok({ message: "Quiz allotted", allottedCount: studentRolls.length, totalAllotted: total });
  } catch (error) {
    return handleApiError(error);
  }
}
