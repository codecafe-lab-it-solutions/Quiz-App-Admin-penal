import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";

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
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar name={user.name} email={user.email} role={user.adminRole ?? "admin"} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  );
}
