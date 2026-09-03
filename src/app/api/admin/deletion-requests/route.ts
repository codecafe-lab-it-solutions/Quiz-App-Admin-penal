import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { getAuthUser, requireRole } from "@/lib/auth";
import { paginationSchema, paginationMeta } from "@/lib/validators/common";
import { resolveAccountByIdentifier } from "@/lib/legacy-db";

const STATUS_VALUES = ["pending", "completed", "rejected"] as const;

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
        matchedAccount: await resolveAccountByIdentifier(row.identifier),
      }))
    );

    return ok({ items, meta: paginationMeta(total, page, pageSize) });
  } catch (error) {
    return handleApiError(error);
  }
}
