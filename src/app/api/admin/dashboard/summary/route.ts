import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { countFaculty, countStudents } from "@/lib/legacy-db";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [totalFaculty, totalStudents, liveQuizCount, todayAttendance] = await Promise.all([
      countFaculty(),
      countStudents(),
      prisma.quiz.count({ where: { status: "live" } }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: { date: { gte: startOfDay, lte: endOfDay } },
        _count: { _all: true },
      }),
    ]);

    const present = todayAttendance.find((a) => a.status === "present")?._count._all ?? 0;
    const absent = todayAttendance.find((a) => a.status === "absent")?._count._all ?? 0;
    const totalMarked = present + absent;
    const attendancePercentage = totalMarked > 0 ? Math.round((present / totalMarked) * 1000) / 10 : 0;

    return ok({
      totalFaculty,
      totalStudents,
      liveQuizCount,
      todayAttendancePercentage: attendancePercentage,
      todayPresentCount: present,
      todayAbsentCount: absent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
