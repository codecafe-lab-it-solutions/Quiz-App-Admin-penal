"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkUploadPanel } from "@/components/admin/bulk-upload-panel";
import { ArrowLeft } from "lucide-react";

export default function FacultyBulkUploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/faculty">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bulk Upload Faculty</h1>
          <p className="text-sm text-muted-foreground">Import multiple faculty accounts from a spreadsheet.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload faculty</CardTitle>
          <CardDescription>
            Download the template, fill in one row per faculty member, then upload it here. Valid rows are
            imported immediately; invalid rows are listed with the reason so you can fix and re-upload them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkUploadPanel
            templateUrl="/api/admin/faculty/template"
            uploadUrl="/api/admin/faculty/bulk-upload"
          />
        </CardContent>
      </Card>
    </div>
  );
}
