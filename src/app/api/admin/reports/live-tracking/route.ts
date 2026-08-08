import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getFacultyNamesByRolls } from "@/lib/legacy-db";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const liveQuizzes = await prisma.quiz.findMany({
      where: { status: "live" },
      orderBy: { actualStartTime: "asc" },
      include: {
        course: { select: { id: true, name: true, code: true } },
        sections: { include: { section: { select: { id: true, name: true } } } },
        building: { select: { id: true, name: true } },
        _count: { select: { allotments: true } },
      },
    });

    const facultyNames = await getFacultyNamesByRolls(liveQuizzes.map((q) => q.facultyRoll));
    const now = Date.now();

    const items = await Promise.all(
      liveQuizzes.map(async (quiz) => {
        const attemptedCount = await prisma.quizAllotment.count({
          where: { quizId: quiz.id, status: "attempted" },
        });

        const start = quiz.actualStartTime ?? quiz.startTime;
        const scheduledEnd = new Date(start.getTime() + quiz.durationMinutes * 60 * 1000);
        const elapsedSeconds = Math.max(0, Math.floor((now - start.getTime()) / 1000));
        const remainingSeconds = Math.max(0, Math.floor((scheduledEnd.getTime() - now) / 1000));

        return {
          id: quiz.id,
          title: quiz.title,
          course: quiz.course,
          sections: quiz.sections.map((s) => s.section),
          faculty: { roll: quiz.facultyRoll, name: facultyNames.get(quiz.facultyRoll) ?? quiz.facultyRoll },
          building: quiz.building,
          startTime: quiz.startTime,
          actualStartTime: quiz.actualStartTime,
          durationMinutes: quiz.durationMinutes,
          elapsedSeconds,
          remainingSeconds,
          totalAllotted: quiz._count.allotments,
          attemptedCount,
          notAttemptedCount: Math.max(0, quiz._count.allotments - attemptedCount),
        };
      })
    );

    return ok({ runningCount: items.length, items });
  } catch (error) {
    return handleApiError(error);
  }
}
