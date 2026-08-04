import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { facultyMappingCreateSchema, mappingQuerySchema, mappingDeleteSchema } from "@/lib/validators/mapping";
import { paginationMeta } from "@/lib/validators/common";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { facultyId, courseId, sectionId, page, pageSize } = mappingQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );

    const where = {
      ...(facultyId ? { facultyId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(sectionId ? { sectionId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.facultyCourseSectionMap.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          faculty: { select: { id: true, name: true, employeeCode: true } },
          course: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
        },
      }),
      prisma.facultyCourseSectionMap.count({ where }),
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

    const body = facultyMappingCreateSchema.parse(await req.json());

    const created_ = await prisma.$transaction(
      body.mappings.map((m) =>
        prisma.facultyCourseSectionMap.upsert({
          where: {
            facultyId_courseId_sectionId: {
              facultyId: body.facultyId,
              courseId: m.courseId,
              sectionId: m.sectionId,
            },
          },
          update: {},
          create: { facultyId: body.facultyId, courseId: m.courseId, sectionId: m.sectionId },
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

    const mapping = await prisma.facultyCourseSectionMap.findUnique({ where: { id } });
    if (!mapping) throw new ApiError(404, "Mapping not found");

    await prisma.facultyCourseSectionMap.delete({ where: { id } });
    return ok({ message: "Mapping removed" });
  } catch (error) {
    return handleApiError(error);
  }
}
