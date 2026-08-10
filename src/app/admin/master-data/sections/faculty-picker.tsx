"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface FacultyRow {
  roll: string;
  name: string;
  dept: string | null;
}
interface ListResponse<T> {
  items: T[];
}

const fetcher = (url: string) => apiClient.get<ListResponse<FacultyRow>>(url);

/**
 * Faculty counterpart to student-picker.tsx - same Select All / Unselect All
 * checkbox roster pattern, applied to the Manage Members dialog's Faculty tab.
 */
export function FacultyPicker({
  selected,
  onChange,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState("");
  const params = new URLSearchParams({ page: "1", pageSize: "200", search });
  const { data, isLoading } = useSWR(`/api/admin/faculty?${params.toString()}`, fetcher);
  const faculty = data?.items ?? [];

  const allVisibleSelected = faculty.length > 0 && faculty.every((f) => selected.has(f.roll));

  const toggleAll = () => {
    const next = new Set(selected);
    if (allVisibleSelected) {
      faculty.forEach((f) => next.delete(f.roll));
    } else {
      faculty.forEach((f) => next.add(f.roll));
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
          placeholder="Search faculty by name or roll..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={toggleAll} disabled={faculty.length === 0}>
          {allVisibleSelected ? "Unselect All" : "Select All"}
        </Button>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
        {isLoading && <p className="p-2 text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && faculty.length === 0 && (
          <p className="p-2 text-sm text-muted-foreground">No faculty found.</p>
        )}
        {faculty.map((f) => (
          <div key={f.roll} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
            <Checkbox
              id={`faculty-${f.roll}`}
              checked={selected.has(f.roll)}
              onCheckedChange={(checked) => toggleOne(f.roll, checked === true)}
            />
            <label htmlFor={`faculty-${f.roll}`} className="flex-1 cursor-pointer text-sm">
              {f.name} <span className="text-xs text-muted-foreground">({f.roll}{f.dept ? ` · ${f.dept}` : ""})</span>
            </label>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selected.size} selected</p>
    </div>
  );
}
