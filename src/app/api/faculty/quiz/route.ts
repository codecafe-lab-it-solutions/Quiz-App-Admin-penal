import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { quizCreateSchema } from "@/lib/validators/quiz";
import { isFacultyMappedToCourse, getCourseTitleByCode } from "@/lib/legacy-db";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";
import { getRealSectionsForFacultyCourse } from "@/lib/section-sync";

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const body = quizCreateSchema.parse(await req.json());
    const facultyRoll = resolveFacultyRoll(user, body.facultyRoll);

    const currentSubList = await getCurrentSubList();
    const mapped = await isFacultyMappedToCourse(
      facultyRoll,
      body.courseCode,
      currentSubList,
    );
    if (!mapped) {
      throw new ApiError(
        403,
        "This faculty member is not mapped to teach this course",
      );
    }

    const validSections = await getRealSectionsForFacultyCourse(facultyRoll, body.courseCode, currentSubList);
    const validNames = new Set(validSections.map((s) => s.name));
    if (body.sectionNames.some((name) => !validNames.has(name))) {
      throw new ApiError(404, "One or more selected sections were not found");
    }

    const courseName = await getCourseTitleByCode(body.courseCode, currentSubList);

    const quiz = await prisma.quiz.create({
      data: {
        title: body.title,
        courseCode: body.courseCode,
        courseName,
        sectionNames: body.sectionNames.join(","),
        buildingId: body.buildingId,
        facultyRoll,
        startTime: body.startTime,
        endTime: body.endTime,
        durationMinutes: body.durationMinutes,
        totalMarks: body.totalMarks,
        randomize: body.randomize,
        negativeMarking: body.negativeMarking,
        allowSkipSwitch: body.allowSkipSwitch,
        requireLocation: body.requireLocation,
        status: body.status,
      },
    });

    return created(quiz);
  } catch (error) {
    return handleApiError(error);
  }
}
