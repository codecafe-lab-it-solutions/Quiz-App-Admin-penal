import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { studentUpdateSchema } from "@/lib/validators/student";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rollNo: true,
        enrollmentNo: true,
        status: true,
        createdAt: true,
        courseSectionMaps: {
          include: {
            course: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!student) throw new ApiError(404, "Student not found");

    return ok(student);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = studentUpdateSchema.parse(await req.json());

    const data: Record<string, unknown> = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.rollNo ? { rollNo: body.rollNo } : {}),
      ...(body.enrollmentNo ? { enrollmentNo: body.enrollmentNo } : {}),
      ...(body.status ? { status: body.status } : {}),
    };
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const student = await prisma.student.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rollNo: true,
        enrollmentNo: true,
        status: true,
      },
    });

    return ok(student);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    await prisma.student.update({ where: { id }, data: { status: "inactive" } });

    return ok({ message: "Student deactivated" });
  } catch (error) {
    return handleApiError(error);
  }
}
