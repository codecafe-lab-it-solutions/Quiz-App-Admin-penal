import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { violationsQuerySchema } from "@/lib/validators/reports";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// System-wide violation log (spec §7.1, §8): auto-submit-triggering anti-cheat
// events (screen switch / overlay / backgrounded) plus rejected geofence
// checks, filterable by quiz or student, most recent first.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const query = violationsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const attemptWhere = {
      ...(query.quizId ? { quizId: query.quizId } : {}),
      ...(query.studentRoll ? { studentRoll: query.studentRoll } : {}),
    };

    const [antiCheatEvents, geofenceViolations] = await Promise.all([
      prisma.antiCheatEvent.findMany({
        where: { attempt: attemptWhere },
        include: {
          attempt: {
            select: { id: true, quizId: true, studentRoll: true, quiz: { select: { title: true } } },
          },
        },
        orderBy: { eventTime: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.geofenceLog.findMany({
        where: {
          isWithinRange: false,
          ...(query.quizId ? { quizId: query.quizId } : {}),
          ...(query.studentRoll ? { studentRoll: query.studentRoll } : {}),
        },
        orderBy: { checkedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    const rolls = [
      ...antiCheatEvents.map((e) => e.attempt.studentRoll),
      ...geofenceViolations.map((g) => g.studentRoll),
    ];
    const names = await getStudentNamesByRolls(rolls);

    return ok({
      antiCheatEvents: antiCheatEvents.map((e) => ({
        id: e.id,
        type: e.eventType,
        occurredAt: e.eventTime,
        actionTaken: e.actionTaken,
        quizId: e.attempt.quizId,
        quizTitle: e.attempt.quiz.title,
        studentRoll: e.attempt.studentRoll,
        studentName: names.get(e.attempt.studentRoll) ?? e.attempt.studentRoll,
      })),
      geofenceViolations: geofenceViolations.map((g) => ({
        id: g.id,
        type: "OUT_OF_GEOFENCE",
        occurredAt: g.checkedAt,
        distanceMeters: g.distanceMeters,
        quizId: g.quizId,
        studentRoll: g.studentRoll,
        studentName: names.get(g.studentRoll) ?? g.studentRoll,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
