import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { resultsReportQuerySchema } from "@/lib/validators/reports";
import { paginationMeta } from "@/lib/validators/common";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "faculty");

    const query = resultsReportQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const where = {
      quiz: {
        facultyRoll: String(user.sub),
        ...(query.courseId ? { courseId: query.courseId } : {}),
        ...(query.sectionId
          ? { sections: { some: { sectionId: query.sectionId } } }
          : {}),
      },
      ...(query.resultStatus ? { status: query.resultStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { studentRoll: { contains: query.search } },
              { quiz: { title: { contains: query.search } } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            publishedAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.result.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { publishedAt: "desc" },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              totalMarks: true,
              course: { select: { id: true, name: true, code: true } },
              sections: {
                include: { section: { select: { id: true, name: true } } },
              },
            },
          },
        },
      }),
      prisma.result.count({ where }),
    ]);

    const names = await getStudentNamesByRolls(
      items.map((item) => item.studentRoll),
    );

    return ok({
      items: items.map((item) => ({
        id: item.id,
        studentRoll: item.studentRoll,
        studentName: names.get(item.studentRoll) ?? item.studentRoll,
        marksObtained: item.marksObtained,
        percentage: item.percentage,
        status: item.status,
        publishedAt: item.publishedAt?.toISOString() ?? null,
        quiz: item.quiz,
      })),
      meta: paginationMeta(total, query.page, query.pageSize),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
