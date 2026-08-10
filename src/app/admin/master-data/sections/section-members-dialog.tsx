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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, X, Plus } from "lucide-react";
import { StudentPicker } from "./student-picker";

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

function MemberList({
  kind,
  sectionId,
  onChanged,
}: {
  kind: "students" | "faculty";
  sectionId: number;
  onChanged: () => void;
}) {
  const [newRoll, setNewRoll] = useState("");
  const [adding, setAdding] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/sections/${sectionId}/${kind}`,
    (url: string) => apiClient.get<{ items: Member[] }>(url)
  );

  const members = (data?.items ?? []).filter((m) => m.source !== "manual_removed");

  const handleAdd = async () => {
    const roll = newRoll.trim();
    if (!roll) return;
    setAdding(true);
    try {
      await apiClient.post(`/api/admin/sections/${sectionId}/${kind}`, { roll });
      setNewRoll("");
      mutate();
      onChanged();
      toast.success("Added");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (roll: string) => {
    try {
      await apiClient.delete(`/api/admin/sections/${sectionId}/${kind}/${encodeURIComponent(roll)}`);
      mutate();
      onChanged();
      toast.success("Removed");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Failed to remove");
    }
  };

  const handleResync = async () => {
    setResyncing(true);
    try {
      await apiClient.post(`/api/admin/sections/${sectionId}/resync`);
      mutate();
      onChanged();
      toast.success("Re-synced from rosters");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Re-sync failed");
    } finally {
      setResyncing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add by roll number"
          value={newRoll}
          onChange={(e) => setNewRoll(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        />
        <Button type="button" size="icon" variant="outline" onClick={handleAdd} disabled={adding}>
          <Plus className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handleResync} disabled={resyncing}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${resyncing ? "animate-spin" : ""}`} />
          Re-sync
        </Button>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
        {isLoading && <p className="p-2 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && members.length === 0 && (
          <p className="p-2 text-sm text-muted-foreground">No members yet.</p>
        )}
        {members.map((m) => (
          <div key={m.roll} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted">
            <div className="flex items-center gap-2">
              <span className="text-sm">{m.name}</span>
              <span className="text-xs text-muted-foreground">({m.roll})</span>
              {m.source === "manual_added" && <Badge variant="secondary">manual</Badge>}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(m.roll)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
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
            <MemberList kind="faculty" sectionId={section.id} onChanged={onChanged} />
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
