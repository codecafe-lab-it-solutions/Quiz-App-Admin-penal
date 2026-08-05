"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { GraduationCap, LogOut } from "lucide-react";

interface PortalComingSoonProps {
  roleLabel: string;
  name: string;
  email: string;
}

export function PortalComingSoon({ roleLabel, name, email }: PortalComingSoonProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // ignore - cookies are cleared server-side regardless
    } finally {
      toast.success("Signed out");
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto bg-muted/40 px-4 py-8">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Welcome, {name}</CardTitle>
          <CardDescription>
            {email} · {roleLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            The {roleLabel.toLowerCase()} portal is coming soon. You&apos;re signed in, but there&apos;s nothing to
            show here yet.
          </p>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
