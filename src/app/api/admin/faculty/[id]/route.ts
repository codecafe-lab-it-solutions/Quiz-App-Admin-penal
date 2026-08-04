import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole, hashPassword } from "@/lib/auth";
import { facultyUpdateSchema } from "@/lib/validators/faculty";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const faculty = await prisma.faculty.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeCode: true,
        status: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        courseSectionMaps: {
          include: {
            course: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!faculty) throw new ApiError(404, "Faculty not found");

    return ok(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = facultyUpdateSchema.parse(await req.json());

    const data: Record<string, unknown> = {
      ...(body.name ? { name: body.name } : {}),
      ...(body.email ? { email: body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      ...(body.employeeCode ? { employeeCode: body.employeeCode } : {}),
      ...(body.departmentId ? { departmentId: body.departmentId } : {}),
      ...(body.status ? { status: body.status } : {}),
    };
    if (body.password) data.passwordHash = await hashPassword(body.password);

    const faculty = await prisma.faculty.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeCode: true,
        status: true,
        department: { select: { id: true, name: true } },
      },
    });

    return ok(faculty);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    await prisma.faculty.update({ where: { id }, data: { status: "inactive" } });

    return ok({ message: "Faculty deactivated" });
  } catch (error) {
    return handleApiError(error);
  }
}
