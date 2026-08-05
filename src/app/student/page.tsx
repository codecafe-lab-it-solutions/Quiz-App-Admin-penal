import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@/lib/auth";
import { PortalComingSoon } from "@/components/portal-coming-soon";

export default function StudentPortalPage() {
  const token = cookies().get("accessToken")?.value;

  let user: { name: string; email: string } | null = null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "student") {
        user = { name: payload.name, email: payload.email };
      }
    } catch {
      user = null;
    }
  }

  if (!user) redirect("/login?redirect=/student");

  return <PortalComingSoon roleLabel="Student" name={user.name} email={user.email} />;
}
