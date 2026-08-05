import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Quiz & Attendance Management System",
  description: "Admin panel for the Quiz & Attendance Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full overflow-hidden">
      <body className="h-full overflow-hidden antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
