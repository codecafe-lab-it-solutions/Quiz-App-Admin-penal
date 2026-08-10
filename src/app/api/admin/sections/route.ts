import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { sectionSchema } from "@/lib/validators/master-data";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { syncSection, addManualSectionStudent } from "@/lib/section-sync";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { page, pageSize, search } = paginationSchema.parse(params);
    const courseId = params.courseId ? Number(params.courseId) : undefined;

    const where = {
      ...(search ? { name: { contains: search } } : {}),
      ...(courseId ? { courses: { some: { courseId } } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.section.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { name: "asc" },
        include: {
          courses: { include: { course: { select: { id: true, name: true, code: true } } } },
          _count: { select: { students: true, faculty: true } },
        },
      }),
      prisma.section.count({ where }),
    ]);

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { name, courseIds, studentRolls } = sectionSchema.parse(await req.json());
    const section = await prisma.section.create({
      data: {
        name,
        courses: { create: courseIds.map((courseId) => ({ courseId })) },
      },
    });

    await syncSection(section.id);
    // Direct student selection at creation time (2026-08-10 MOM) - added as
    // manual members, so a later course-roster resync never drops them.
    await Promise.all(studentRolls.map((roll) => addManualSectionStudent(section.id, roll)));

    return created(section);
  } catch (error) {
    return handleApiError(error);
  }
}
