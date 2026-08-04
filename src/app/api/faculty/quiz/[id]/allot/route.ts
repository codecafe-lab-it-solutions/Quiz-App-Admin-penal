import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { allotSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || quiz.facultyId !== user.sub) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "completed") throw new ApiError(400, "Cannot allot a completed quiz");

    const body = allotSchema.parse(await req.json());

    let studentIds: number[];

    if (body.mode === "section") {
      const mapped = await prisma.studentCourseSectionMap.findMany({
        where: { courseId: quiz.courseId, sectionId: quiz.sectionId },
        select: { studentId: true },
      });
      studentIds = mapped.map((m) => m.studentId);
    } else {
      if (!body.studentIds || body.studentIds.length === 0) {
        throw new ApiError(400, "Provide at least one student id for custom allotment");
      }
      studentIds = body.studentIds;
    }

    if (studentIds.length === 0) {
      throw new ApiError(400, "No students found to allot");
    }

    await prisma.$transaction(
      studentIds.map((studentId) =>
        prisma.quizAllotment.upsert({
          where: { quizId_studentId: { quizId, studentId } },
          update: {},
          create: { quizId, studentId, status: "allotted" },
        })
      )
    );

    const total = await prisma.quizAllotment.count({ where: { quizId } });
    return ok({ message: "Quiz allotted", allottedCount: studentIds.length, totalAllotted: total });
  } catch (error) {
    return handleApiError(error);
  }
}
