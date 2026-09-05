import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { getCourseRoster, isFacultyMappedToCourse } from "@/lib/legacy-db";
import { getRealSectionsForFacultyCourse } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";
import { resolveFacultyRoll } from "@/lib/quiz-access";

// Real course roster for a faculty's course, sourced live from the legacy
// per-batch isr_reg_<batch>_tbl registration tables (spec §5, §8). Enriches
// each row with attendance % and last-test score computed from this app's
// own quiz/attendance tables, scoped to quizzes for this course code taught
// by this faculty (best-effort - only populated once quizzes exist).
export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const courseCode = params.code;
    const subList = await getCurrentSubList();
    const facultyRoll = resolveFacultyRoll(user, req.nextUrl.searchParams.get("facultyRoll") ?? undefined);

    const mapped = await isFacultyMappedToCourse(facultyRoll, courseCode, subList);
    if (!mapped) throw new ApiError(403, "This faculty member is not mapped to teach this course");

    // Only honor a `section` param that's one of this faculty's own real
    // sections for this course (see getRealSectionsForFacultyCourse) - an
    // unrecognized value is ignored rather than trusted, same "must be a
    // real, verified mapping" rule section-sync.ts applies to quiz allotment.
    const requestedSection = req.nextUrl.searchParams.get("section");
    let section: string | null = null;
    if (requestedSection) {
      const realSections = await getRealSectionsForFacultyCourse(facultyRoll, courseCode, subList);
      if (realSections.some((s) => s.name === requestedSection)) section = requestedSection;
    }

    const roster = await getCourseRoster(courseCode, subList, section);

    const quizzes = await prisma.quiz.findMany({
      where: { facultyRoll, courseCode },
      select: { id: true, startTime: true },
      orderBy: { startTime: "desc" },
    });
    const quizIds = quizzes.map((q) => q.id);

    let attendanceByRoll = new Map<string, { present: number; total: number }>();
    let lastScoreByRoll = new Map<string, number>();

    if (quizIds.length > 0) {
      const attendanceRows = await prisma.attendance.findMany({
        where: { quizId: { in: quizIds }, studentRoll: { in: roster.map((r) => r.roll) } },
        select: { studentRoll: true, status: true },
      });
      for (const row of attendanceRows) {
        const entry = attendanceByRoll.get(row.studentRoll) ?? { present: 0, total: 0 };
        entry.total += 1;
        if (row.status === "present") entry.present += 1;
        attendanceByRoll.set(row.studentRoll, entry);
      }

      const latestQuizId = quizIds[0];
      const latestResults = await prisma.result.findMany({
        where: { quizId: latestQuizId, studentRoll: { in: roster.map((r) => r.roll) } },
        select: { studentRoll: true, marksObtained: true },
      });
      lastScoreByRoll = new Map(latestResults.map((r) => [r.studentRoll, r.marksObtained]));
    }

    const items = roster.map((r) => {
      const attendance = attendanceByRoll.get(r.roll);
      return {
        roll: r.roll,
        name: r.name,
        attendancePercent: attendance && attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null,
        lastScore: lastScoreByRoll.get(r.roll) ?? null,
      };
    });

    return ok({ items, total: items.length });
  } catch (error) {
    return handleApiError(error);
  }
}
