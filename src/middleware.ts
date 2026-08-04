import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "dev-access-secret-change-me"
);

type RouteGroup = "admin" | "faculty" | "student";

function resolveRouteGroup(pathname: string): RouteGroup | null {
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return "admin";
  if (pathname.startsWith("/api/faculty")) return "faculty";
  if (pathname.startsWith("/api/student")) return "student";
  return null;
}

function extractToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return req.cookies.get("accessToken")?.value ?? null;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApiRoute = pathname.startsWith("/api/");
  const group = resolveRouteGroup(pathname);

  if (!group) return NextResponse.next();

  const token = extractToken(req);

  const unauthorized = (message: string, status: number) => {
    if (isApiRoute) {
      return NextResponse.json({ success: false, error: { message } }, { status });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  };

  if (!token) {
    return unauthorized("Authentication required", 401);
  }

  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    const role = payload.role as string;

    if (role !== group) {
      return unauthorized("You do not have permission to access this resource", 403);
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", String(payload.sub ?? ""));
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-user-email", String(payload.email ?? ""));

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return unauthorized("Invalid or expired session", 401);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/faculty/:path*", "/api/student/:path*"],
};
