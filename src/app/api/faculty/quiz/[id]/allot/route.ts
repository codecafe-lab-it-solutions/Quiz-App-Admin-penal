import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { allotSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";
import { getCourseRegistrations } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { course: true } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "completed") throw new ApiError(400, "Cannot allot a completed quiz");

    const body = allotSchema.parse(await req.json());

    let studentRolls: string[];

    if (body.mode === "course") {
      const registrations = await getCourseRegistrations(quiz.course.code, await getCurrentSubList());
      studentRolls = [...new Set(registrations.map((r) => r.roll))];
    } else {
      if (!body.studentRolls || body.studentRolls.length === 0) {
        throw new ApiError(400, "Provide at least one student roll for custom allotment");
      }
      studentRolls = body.studentRolls;
    }

    if (studentRolls.length === 0) {
      throw new ApiError(400, "No students found to allot");
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
