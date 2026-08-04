import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { quizCreateSchema } from "@/lib/validators/quiz";

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const body = quizCreateSchema.parse(await req.json());

    const mapping = await prisma.facultyCourseSectionMap.findUnique({
      where: {
        facultyId_courseId_sectionId: {
          facultyId: user.sub,
          courseId: body.courseId,
          sectionId: body.sectionId,
        },
      },
    });
    if (!mapping) {
      throw new ApiError(403, "You are not mapped to teach this course/section combination");
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        courseId: body.courseId,
        sectionId: body.sectionId,
        buildingId: body.buildingId,
        facultyId: user.sub,
        startTime: body.startTime,
        endTime: body.endTime,
        durationMinutes: body.durationMinutes,
        totalMarks: body.totalMarks,
        randomize: body.randomize,
        negativeMarking: body.negativeMarking,
        allowSkipSwitch: body.allowSkipSwitch,
        status: body.status,
      },
    });

    return created(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}
