"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Trash2, Plus } from "lucide-react";

interface BatchRegistryEntry {
  id: number;
  batchName: string;
  tableName: string;
  isActive: boolean;
}

interface SemesterConfigResponse {
  currentSubList: string;
  batchRegistry: BatchRegistryEntry[];
}

const fetcher = (url: string) => apiClient.get<SemesterConfigResponse>(url);

export default function SemesterConfigPage() {
  const { data, isLoading, mutate } = useSWR("/api/admin/config/semester", fetcher);

  const [subListInput, setSubListInput] = useState("");
  const [savingSubList, setSavingSubList] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [addingBatch, setAddingBatch] = useState(false);

  useEffect(() => {
    if (data?.currentSubList) setSubListInput(data.currentSubList);
  }, [data?.currentSubList]);

  const saveSubList = async () => {
    if (!subListInput.trim()) return;
    setSavingSubList(true);
    try {
      await apiClient.put("/api/admin/config/semester", { currentSubList: subListInput.trim() });
      toast.success("Current subject list updated");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to update");
    } finally {
      setSavingSubList(false);
    }
  };

  const addBatchEntry = async () => {
    if (!newBatchName.trim() || !newTableName.trim()) {
      toast.error("Batch name and table name are required");
      return;
    }
    setAddingBatch(true);
    try {
      await apiClient.put("/api/admin/config/semester", {
        upsertBatch: { batchName: newBatchName.trim(), tableName: newTableName.trim(), isActive: true },
      });
      toast.success("Batch table added");
      setNewBatchName("");
      setNewTableName("");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to add batch table");
    } finally {
      setAddingBatch(false);
    }
  };

  const toggleActive = async (entry: BatchRegistryEntry) => {
    try {
      await apiClient.put("/api/admin/config/semester", {
        toggleBatch: { batchName: entry.batchName, isActive: !entry.isActive },
      });
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to update");
    }
  };

  const removeEntry = async (batchName: string) => {
    try {
      await apiClient.put("/api/admin/config/semester", { removeBatch: batchName });
      toast.success("Batch table removed");
      mutate();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Semester Configuration</h1>
        <p className="text-sm text-muted-foreground">
          Controls which legacy course-allocation cycle is "current" and which per-batch registration
          tables are safe to query.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Subject List Code</CardTitle>
          <CardDescription>
            The active isr_sub_available_tbl.sub_list value (e.g. "C2") - drives Faculty ↔ Course Mapping.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="subList">Sub list code</Label>
            <Input id="subList" value={subListInput} onChange={(e) => setSubListInput(e.target.value)} disabled={isLoading} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={saveSubList} disabled={savingSubList || !subListInput.trim()}>
            {savingSubList ? "Saving..." : "Save"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Table Registry</CardTitle>
          <CardDescription>
            Allow-list of batch → physical isr_reg_&lt;batch&gt;_tbl table names. Only tables listed here
            (and active) can be queried for student-course registrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="batchName">Batch name</Label>
              <Input
                id="batchName"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g. 2023B1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tableName">Physical table name</Label>
              <Input
                id="tableName"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. isr_reg_2023B1_tbl"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={addBatchEntry} disabled={addingBatch}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Table name</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.batchRegistry ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No batch tables registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                data!.batchRegistry.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.batchName}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.tableName}</TableCell>
                    <TableCell>
                      <Switch checked={entry.isActive} onCheckedChange={() => toggleActive(entry)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Remove batch table?"
                        description={`Remove "${entry.batchName}" (${entry.tableName}) from the allow-list?`}
                        confirmLabel="Remove"
                        onConfirm={() => removeEntry(entry.batchName)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
