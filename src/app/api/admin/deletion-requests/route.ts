import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { findLoginByIdentifier, getFacultyByRoll, getStudentByRoll } from "@/lib/legacy-db";

const STATUS_VALUES = ["pending", "completed", "rejected"] as const;

// Best-effort match against the legacy accounts DB so the admin can see
// enough (name, roll, type) to actually go delete the account, without this
// app needing to store any of that itself.
async function resolveMatchedAccount(identifier: string) {
  const student = await findLoginByIdentifier(identifier, "STU");
  if (student) {
    const profile = await getStudentByRoll(student.userRoll);
    return { type: "student" as const, roll: student.userRoll, name: profile?.name ?? null, email: student.userEmail };
  }
  const faculty = await findLoginByIdentifier(identifier, "FAC");
  if (faculty) {
    const profile = await getFacultyByRoll(faculty.userRoll);
    return { type: "faculty" as const, roll: faculty.userRoll, name: profile?.name ?? null, email: faculty.userEmail };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    requireRole(user, "admin");

    const { page, pageSize, search } = paginationSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams)
    );
    const statusParam = req.nextUrl.searchParams.get("status");
    const status = STATUS_VALUES.find((s) => s === statusParam);

    const where = {
      ...(status ? { status } : {}),
      ...(search ? { identifier: { contains: search } } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.accountDeletionRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      prisma.accountDeletionRequest.count({ where }),
    ]);

    const items = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        identifier: row.identifier,
        status: row.status,
        createdAt: row.createdAt,
        reviewedAt: row.reviewedAt,
        matchedAccount: await resolveMatchedAccount(row.identifier),
      }))
    );

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
