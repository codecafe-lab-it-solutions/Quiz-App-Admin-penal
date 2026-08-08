import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { sectionSchema } from "@/lib/validators/master-data";
import { idParamSchema } from "@/lib/validators/common";
import { syncSection } from "@/lib/section-sync";

// Faculty may edit a section's name/linked courses (same as create), but
// cannot delete one - deleting is admin-only since other faculty/quizzes may
// depend on a section neither of them created.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    const section = await prisma.section.findUnique({
      where: { id },
      include: {
        courses: { include: { course: true } },
        _count: { select: { students: true, faculty: true } },
      },
    });
    if (!section) throw new ApiError(404, "Section not found");

    return ok(section);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty", "admin");

    const { id } = idParamSchema.parse(params);
    const body = sectionSchema.partial().parse(await req.json());
    const { courseIds, ...rest } = body;

    const section = await prisma.$transaction(async (tx) => {
      if (courseIds) {
        const existing = await tx.sectionCourse.findMany({ where: { sectionId: id } });
        const existingIds = new Set(existing.map((c) => c.courseId));
        const nextIds = new Set(courseIds);

        const toAdd = courseIds.filter((cid) => !existingIds.has(cid));
        const toRemove = [...existingIds].filter((cid) => !nextIds.has(cid));

        if (toAdd.length) {
          await tx.sectionCourse.createMany({ data: toAdd.map((courseId) => ({ sectionId: id, courseId })) });
        }
        if (toRemove.length) {
          await tx.sectionCourse.deleteMany({ where: { sectionId: id, courseId: { in: toRemove } } });
        }
      }

      return tx.section.update({ where: { id }, data: rest });
    });

    if (courseIds) await syncSection(id);

    return ok(section);
  } catch (error) {
    return handleApiError(error);
  }
}
