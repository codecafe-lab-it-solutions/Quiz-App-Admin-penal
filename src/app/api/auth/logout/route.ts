import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api-response";
import { logoutSchema } from "@/lib/validators/auth";
import { verifyRefreshToken } from "@/lib/auth";
import { clearAuthCookies } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cookieRefreshToken = req.cookies.get("refreshToken")?.value;
    const { refreshToken } = logoutSchema.parse({
      refreshToken: body.refreshToken ?? cookieRefreshToken,
    });

    try {
      const decoded = verifyRefreshToken(refreshToken);
      // Only admin sessions have a server-side refresh-token hash to clear -
      // faculty/student identity lives in the read-only legacy tables, so
      // their logout is purely a client-side cookie clear (relies on JWT expiry).
      if (decoded.role === "admin") {
        await prisma.admin.update({ where: { id: Number(decoded.sub) }, data: { refreshTokenHash: null } });
      }
    } catch {
      // token already invalid/expired - nothing to invalidate, still clear cookies below
    }

    const response = ok({ message: "Logged out" });
    clearAuthCookies(response);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
