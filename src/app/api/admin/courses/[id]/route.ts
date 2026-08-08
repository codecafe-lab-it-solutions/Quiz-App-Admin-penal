import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { courseSchema } from "@/lib/validators/master-data";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const course = await prisma.course.findUnique({
      where: { id },
      include: { department: { select: { id: true, name: true } }, sectionCourses: { include: { section: true } } },
    });
    if (!course) throw new ApiError(404, "Course not found");

    return ok(course);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = courseSchema.partial().parse(await req.json());

    const course = await prisma.course.update({ where: { id }, data: body });
    return ok(course);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    await prisma.course.delete({ where: { id } });

    return ok({ message: "Course deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
