import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, created, handleApiError, ApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { idParamSchema } from "@/lib/validators/common";
import { sectionMemberSchema } from "@/lib/validators/master-data";
import { addManualSectionStudent } from "@/lib/section-sync";
import { getStudentNamesByRolls } from "@/lib/legacy-db";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const rows = await prisma.sectionStudent.findMany({
      where: { sectionId: id },
      orderBy: { studentRoll: "asc" },
    });

    const names = await getStudentNamesByRolls(rows.map((r) => r.studentRoll));
    const items = rows.map((r) => ({
      roll: r.studentRoll,
      name: names.get(r.studentRoll) ?? r.studentRoll,
      source: r.source,
    }));

    return ok({ items });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { id } = idParamSchema.parse(params);
    const section = await prisma.section.findUnique({ where: { id } });
    if (!section) throw new ApiError(404, "Section not found");

    const { roll } = sectionMemberSchema.parse(await req.json());
    const row = await addManualSectionStudent(id, roll);

    return created(row);
  } catch (error) {
    return handleApiError(error);
  }
}
