"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, CheckCircle2, XCircle } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api-client";

interface FailedRow {
  row: number;
  data: Record<string, unknown>;
  reasons: string[];
}

interface BulkUploadResult {
  insertedCount: number;
  failedCount: number;
  success: Record<string, unknown>[];
  failed: FailedRow[];
}

interface BulkUploadPanelProps {
  templateUrl: string;
  uploadUrl: string;
  onComplete?: () => void;
}

export function BulkUploadPanel({ templateUrl, uploadUrl, onComplete }: BulkUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiClient.post<BulkUploadResult>(uploadUrl, formData);
      setResult(data);
      if (data.insertedCount > 0) {
        toast.success(`${data.insertedCount} record(s) imported successfully`);
        onComplete?.();
      }
      if (data.failedCount > 0) {
        toast.warning(`${data.failedCount} row(s) failed validation`);
      }
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium">1. Download the template</p>
          <p className="text-xs text-muted-foreground">Fill it in and keep the header row unchanged.</p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <a href={templateUrl} download>
            <Download className="mr-2 h-4 w-4" />
            Download template
          </a>
        </Button>
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-2 text-sm font-medium">2. Upload the completed file</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          />
          <Button onClick={handleUpload} disabled={uploading || !file} className="shrink-0">
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {result ? (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 className="h-4 w-4" /> {result.insertedCount} imported
            </span>
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="h-4 w-4" /> {result.failedCount} failed
            </span>
          </div>

          {result.failed.length > 0 && (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Reason(s)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.failed.map((f) => (
                    <TableRow key={f.row}>
                      <TableCell>{f.row}</TableCell>
                      <TableCell className="text-destructive">{f.reasons.join("; ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
