"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { StudentPicker } from "./student-picker";
import { FacultyPicker } from "./faculty-picker";

interface Member {
  roll: string;
  name: string;
  source: "auto" | "manual_added" | "manual_removed";
}

interface SectionSummary {
  id: number;
  name: string;
}

interface Props {
  section: SectionSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/**
 * Students tab: a checkbox roster picker (with Select All / Unselect All,
 * per the 2026-08-10 MOM) pre-checked with current members. "Save changes"
 * diffs the local selection against the server and adds/removes only what
 * changed - unlike the faculty tab's add-by-roll flow, this replaces it
 * rather than sitting alongside it, since picking many students by typing
 * roll numbers one at a time doesn't scale.
 */
function StudentMemberList({ sectionId, onChanged }: { sectionId: number; onChanged: () => void }) {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/sections/${sectionId}/students`,
    (url: string) => apiClient.get<{ items: Member[] }>(url)
  );

  const currentRolls = useMemo(
    () => new Set((data?.items ?? []).filter((m) => m.source !== "manual_removed").map((m) => m.roll)),
    [data]
  );
  const effectiveSelected = selected ?? currentRolls;
  const dirty =
    selected !== null &&
    (selected.size !== currentRolls.size || [...selected].some((r) => !currentRolls.has(r)));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((r) => !currentRolls.has(r));
      const toRemove = [...currentRolls].filter((r) => !selected.has(r));
      await Promise.all([
        ...(toAdd.length ? [apiClient.post(`/api/admin/sections/${sectionId}/students/bulk`, { rolls: toAdd })] : []),
        ...toRemove.map((roll) => apiClient.delete(`/api/admin/sections/${sectionId}/students/${encodeURIComponent(roll)}`)),
      ]);
      setSelected(null);
      mutate();
      onChanged();
      toast.success("Membership updated");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      await apiClient.post(`/api/admin/sections/${sectionId}/resync`);
      setSelected(null);
      mutate();
      onChanged();
      toast.success("Re-synced from rosters");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Re-sync failed");
    } finally {
      setResyncing(false);
    }
  };

  if (isLoading) return <p className="p-2 text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3">
      <StudentPicker selected={effectiveSelected} onChange={setSelected} />
      <div className="flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" onClick={handleResync} disabled={resyncing}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
          Re-sync from rosters
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/** Faculty tab counterpart to StudentMemberList - same checkbox-picker, diff-and-save pattern. */
function FacultyMemberList({ sectionId, onChanged }: { sectionId: number; onChanged: () => void }) {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/sections/${sectionId}/faculty`,
    (url: string) => apiClient.get<{ items: Member[] }>(url)
  );

  const currentRolls = useMemo(
    () => new Set((data?.items ?? []).filter((m) => m.source !== "manual_removed").map((m) => m.roll)),
    [data]
  );
  const effectiveSelected = selected ?? currentRolls;
  const dirty =
    selected !== null &&
    (selected.size !== currentRolls.size || [...selected].some((r) => !currentRolls.has(r)));

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const toAdd = [...selected].filter((r) => !currentRolls.has(r));
      const toRemove = [...currentRolls].filter((r) => !selected.has(r));
      await Promise.all([
        ...(toAdd.length ? [apiClient.post(`/api/admin/sections/${sectionId}/faculty/bulk`, { rolls: toAdd })] : []),
        ...toRemove.map((roll) => apiClient.delete(`/api/admin/sections/${sectionId}/faculty/${encodeURIComponent(roll)}`)),
      ]);
      setSelected(null);
      mutate();
      onChanged();
      toast.success("Membership updated");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      await apiClient.post(`/api/admin/sections/${sectionId}/resync`);
      setSelected(null);
      mutate();
      onChanged();
      toast.success("Re-synced from rosters");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Re-sync failed");
    } finally {
      setResyncing(false);
    }
  };

  if (isLoading) return <p className="p-2 text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-3">
      <FacultyPicker selected={effectiveSelected} onChange={setSelected} />
      <div className="flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" onClick={handleResync} disabled={resyncing}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
          Re-sync from rosters
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!dirty || saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

export function SectionMembersDialog({ section, open, onOpenChange, onChanged }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage members — {section.name}</DialogTitle>
          <DialogDescription>
            Membership auto-syncs from each linked course&apos;s roster. Manual adds/removes persist across re-sync.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="faculty">Faculty</TabsTrigger>
          </TabsList>
          <TabsContent value="students">
            <StudentMemberList sectionId={section.id} onChanged={onChanged} />
          </TabsContent>
          <TabsContent value="faculty">
            <FacultyMemberList sectionId={section.id} onChanged={onChanged} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
