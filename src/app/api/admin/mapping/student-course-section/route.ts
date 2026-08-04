import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { studentMappingCreateSchema, mappingQuerySchema, mappingDeleteSchema } from "@/lib/validators/mapping";
import { paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { studentId, courseId, sectionId, page, pageSize } = mappingQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const where = {
      ...(studentId ? { studentId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(sectionId ? { sectionId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.studentCourseSectionMap.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          student: { select: { id: true, name: true, rollNo: true } },
          course: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
        },
      }),
      prisma.studentCourseSectionMap.count({ where }),
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

    const body = studentMappingCreateSchema.parse(await req.json());

    const created_ = await prisma.$transaction(
      body.mappings.map((m) =>
        prisma.studentCourseSectionMap.upsert({
          where: {
            studentId_courseId_sectionId: {
              studentId: body.studentId,
              courseId: m.courseId,
              sectionId: m.sectionId,
            },
          },
          update: {},
          create: { studentId: body.studentId, courseId: m.courseId, sectionId: m.sectionId },
        })
      )
    );

    return created(created_);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = mappingDeleteSchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const mapping = await prisma.studentCourseSectionMap.findUnique({ where: { id } });
    if (!mapping) throw new ApiError(404, "Mapping not found");

    await prisma.studentCourseSectionMap.delete({ where: { id } });
    return ok({ message: "Mapping removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
