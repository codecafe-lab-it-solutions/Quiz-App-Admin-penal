import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get("accessToken")?.value;

  let user: { name: string; email: string; adminRole?: string } | null = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "admin") {
        user = { name: payload.name, email: payload.email, adminRole: payload.adminRole };
      }
    } catch {
      user = null;
    }
  }

  if (!user) redirect("/login");

  return (
    <AdminShell name={user.name} email={user.email} role={user.adminRole ?? "admin"}>
      {children}
    </AdminShell>
  );
}
