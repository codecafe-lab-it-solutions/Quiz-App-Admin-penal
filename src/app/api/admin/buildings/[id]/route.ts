import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { buildingSchema } from "@/lib/validators/master-data";
import { idParamSchema } from "@/lib/validators/common";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const building = await prisma.building.findUnique({ where: { id } });
    if (!building) throw new ApiError(404, "Building not found");

    return ok(building);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const body = buildingSchema.partial().parse(await req.json());

    const building = await prisma.building.update({ where: { id }, data: body });
    return ok(building);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    await prisma.building.delete({ where: { id } });

    return ok({ message: "Building deleted" });
  } catch (error) {
    return handleApiError(error);
  }
}
