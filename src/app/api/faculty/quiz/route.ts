import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { quizCreateSchema } from "@/lib/validators/quiz";
import { isFacultyMappedToCourse } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const body = quizCreateSchema.parse(await req.json());
    const facultyRoll = resolveFacultyRoll(user, body.facultyRoll);

    const course = await prisma.course.findUnique({ where: { id: body.courseId } });
    if (!course) throw new ApiError(404, "Course not found");

    const currentSubList = await getCurrentSubList();
    const mapped = await isFacultyMappedToCourse(facultyRoll, course.code, currentSubList);
    if (!mapped) {
      throw new ApiError(403, "This faculty member is not mapped to teach this course");
    }

    const sections = await prisma.section.findMany({ where: { id: { in: body.sectionIds } } });
    if (sections.length !== body.sectionIds.length) {
      throw new ApiError(404, "One or more selected sections were not found");
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        courseId: body.courseId,
        sections: { create: body.sectionIds.map((sectionId) => ({ sectionId })) },
        sessionId: body.sessionId ?? null,
        buildingId: body.buildingId,
        facultyRoll,
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
