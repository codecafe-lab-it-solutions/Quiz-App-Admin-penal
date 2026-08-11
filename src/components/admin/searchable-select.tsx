"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  value: string | null;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  search: string;
  onSearchChange: (search: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * A searchable dropdown backed by whatever `options` the caller passes in -
 * server-searched (pass a fetched, already-filtered list and wire
 * `onSearchChange` to a new SWR key) or a small in-memory list (filter
 * `onSearchChange` locally). Always real data - no free-text entry.
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  search,
  onSearchChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results.",
  loading = false,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <Input
            autoFocus
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="max-h-60 overflow-y-auto border-t">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading...</p>
          ) : options.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            options.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onValueChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  o.value === value && "bg-accent"
                )}
              >
                <Check className={cn("h-4 w-4 shrink-0", o.value === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{o.label}</span>
                {o.description && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{o.description}</span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
