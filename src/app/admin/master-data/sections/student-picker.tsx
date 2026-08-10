"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface StudentRow {
  roll: string;
  name: string;
  major: string;
  batch: string;
}
interface ListResponse<T> {
  items: T[];
}

const fetcher = (url: string) => apiClient.get<ListResponse<StudentRow>>(url);

/**
 * Checkbox roster picker with a Select All / Unselect All toggle (2026-08-10
 * MOM). Purely controlled - callers own the selected-roll set and decide what
 * happens with it (submit on section create, diff-and-save in Manage Members).
 * "Select All" only affects the currently loaded/searched rows, matching the
 * same pageSize=200 convention used elsewhere in this admin panel (e.g. the
 * course picker in this same dialog).
 */
export function StudentPicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");
  const params = new URLSearchParams({ page: "1", pageSize: "200", search });
  const { data, isLoading } = useSWR(`/api/admin/students?${params.toString()}`, fetcher);
  const students = data?.items ?? [];

  const allVisibleSelected = students.length > 0 && students.every((s) => selected.has(s.roll));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      students.forEach((s) => next.delete(s.roll));
    } else {
      students.forEach((s) => next.add(s.roll));
    }
    onChange(next);
  };

  const toggleOne = (roll: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(roll);
    else next.delete(roll);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search students by name or roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={students.length === 0}>
          {allVisibleSelected ? "Unselect All" : "Select All"}
        </Button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
        {isLoading && <p className="p-2 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && students.length === 0 && (
          <p className="p-2 text-sm text-muted-foreground">No students found.</p>
        )}
        {students.map((s) => (
          <div key={s.roll} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
            <Checkbox
              id={`student-${s.roll}`}
              checked={selected.has(s.roll)}
              onCheckedChange={(checked) => toggleOne(s.roll, checked === true)}
            />
            <label htmlFor={`student-${s.roll}`} className="flex-1 cursor-pointer text-sm">
              {s.name} <span className="text-xs text-muted-foreground">({s.roll} · {s.major} {s.batch})</span>
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selected.size} selected</p>
    </div>
  );
}
