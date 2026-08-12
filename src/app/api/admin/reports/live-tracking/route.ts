import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getFacultyNamesByRolls } from "@/lib/legacy-db";
import { paginationMeta } from "@/lib/validators/common";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { page, pageSize } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const [liveQuizzes, runningCount] = await Promise.all([
      prisma.quiz.findMany({
        where: { status: "live" },
        orderBy: { actualStartTime: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          course: { select: { id: true, name: true, code: true } },
          sections: { include: { section: { select: { id: true, name: true } } } },
          building: { select: { id: true, name: true } },
          _count: { select: { allotments: true } },
        },
      }),
      prisma.quiz.count({ where: { status: "live" } }),
    ]);

    const facultyNames = await getFacultyNamesByRolls(liveQuizzes.map((q) => q.facultyRoll));
    const now = Date.now();

    const items = await Promise.all(
      liveQuizzes.map(async (quiz) => {
        const attemptedCount = await prisma.quizAllotment.count({
          where: { quizId: quiz.id, status: "attempted" },
        });

        const start = quiz.actualStartTime ?? quiz.startTime;
        const scheduledEnd = new Date(start.getTime() + quiz.durationMinutes * 60 * 1000);
        const remainingSeconds = Math.max(0, Math.floor((scheduledEnd.getTime() - now) / 1000));

        const totalAllotted = quiz._count.allotments;

        // Test duration = time from the 1st submission to the submission that
        // crosses 80% of allotted students - this reflects how long the bulk
        // of the class actually took, rather than start-to-stop wall time
        // (faculty routinely forget to stop the test, so stop time isn't meaningful).
        const submissions = await prisma.quizAttempt.findMany({
          where: { quizId: quiz.id, status: { in: ["submitted", "auto_submitted"] } },
          orderBy: { endTime: "asc" },
          select: { endTime: true },
        });

        const thresholdCount = Math.max(1, Math.ceil(totalAllotted * 0.8));
        const durationSeconds =
          submissions.length >= thresholdCount && submissions[0].endTime
            ? Math.max(
                0,
                Math.floor(
                  (submissions[thresholdCount - 1].endTime!.getTime() -
                    submissions[0].endTime!.getTime()) /
                    1000
                )
              )
            : null;

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
          durationSeconds,
          submittedCount: submissions.length,
          thresholdCount,
          remainingSeconds,
          totalAllotted,
          attemptedCount,
          notAttemptedCount: Math.max(0, totalAllotted - attemptedCount),
        };
      })
    );

    return ok({ runningCount, items, meta: paginationMeta(runningCount, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
