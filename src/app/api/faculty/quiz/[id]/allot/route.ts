import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { allotSchema } from "@/lib/validators/quiz";
import { idParamSchema } from "@/lib/validators/common";
import { getStudentsForRealSections } from "@/lib/section-sync";
import { getCurrentSubList } from "@/lib/config";

// Must use the exact same source the "Allot Students" picker itself used
// (getStudentsForRealSections - real isr_reg_<batch>_tbl registration rows,
// scoped to the quiz's own course+sections), not the cached section_students
// snapshot. That snapshot only refreshes when a section is explicitly
// created/edited/resynced, so it can go stale between when a faculty member
// picks students and when they save - silently dropping real registrants the
// picker had just shown them (confirmed: 2 of 58 real PE312 registrants were
// dropped here while section_students hadn't caught up).
async function getSectionDerivedRolls(quizId: number, facultyRoll: string, courseId: number): Promise<Set<string>> {
  const [course, quizSections] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { code: true } }),
    prisma.quizSection.findMany({ where: { quizId }, include: { section: { select: { name: true } } } }),
  ]);
  if (!course || quizSections.length === 0) return new Set();

  const subList = await getCurrentSubList();
  const sectionNames = quizSections.map((qs) => qs.section.name);
  const students = await getStudentsForRealSections(facultyRoll, course.code, subList, sectionNames);
  return new Set(students.map((s) => s.roll));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id: quizId } = idParamSchema.parse(params);
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz || (user.role === "faculty" && quiz.facultyRoll !== String(user.sub))) throw new ApiError(404, "Quiz not found");
    if (quiz.status === "completed") throw new ApiError(400, "Cannot allot a completed quiz");

    const body = allotSchema.parse(await req.json());

    const eligibleRolls = await getSectionDerivedRolls(quizId, quiz.facultyRoll, quiz.courseId);
    const studentRolls = body.studentRolls.filter((roll) => eligibleRolls.has(roll));

    if (studentRolls.length === 0) {
      throw new ApiError(400, "No eligible students to allot - check the quiz's linked sections have members");
    }

    await prisma.$transaction(
      studentRolls.map((studentRoll) =>
        prisma.quizAllotment.upsert({
          where: { quizId_studentRoll: { quizId, studentRoll } },
          update: {},
          create: { quizId, studentRoll, status: "allotted" },
        })
      )
    );

    const total = await prisma.quizAllotment.count({ where: { quizId } });
    return ok({ message: "Quiz allotted", allottedCount: studentRolls.length, totalAllotted: total });
  } catch (error) {
    return handleApiError(error);
  }
}
