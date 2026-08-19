import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { violationsQuerySchema } from "@/lib/validators/reports";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

// System-wide violation log (spec §7.1, §8): rejected geofence checks,
// filterable by quiz or student, most recent first.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const query = violationsQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const geofenceViolations = await prisma.geofenceLog.findMany({
      where: {
        isWithinRange: false,
        ...(query.quizId ? { quizId: query.quizId } : {}),
        ...(query.studentRoll ? { studentRoll: query.studentRoll } : {}),
      },
      orderBy: { checkedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });

    const rolls = geofenceViolations.map((g) => g.studentRoll);
    const names = await getStudentNamesByRolls(rolls);

    return ok({
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
