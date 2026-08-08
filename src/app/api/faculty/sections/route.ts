import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";

// Read-only section list for the quiz-creation section picker. Sections are
// admin-managed (Master Data > Sections); faculty just pick which one(s) a
// quiz is given to, optionally narrowed to the sections linked to a course.
export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const courseId = req.nextUrl.searchParams.get("courseId");

    const sections = await prisma.section.findMany({
      where: courseId ? { courses: { some: { courseId: Number(courseId) } } } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return ok({ items: sections });
  } catch (error) {
    return handleApiError(error);
  }
}
