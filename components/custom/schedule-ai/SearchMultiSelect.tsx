"use client";

import { useMemo, useState } from "react";
import { Search, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type SearchMultiSelectProps = {
  options: MultiSelectOption[];
  preferred: string[];
  avoid: string[];
  onChange: (next: { preferred: string[]; avoid: string[] }) => void;
  searchPlaceholder: string;
  emptyLabel: string;
};

/**
 * Searchable list where each option can be marked "preferred" or "avoid"
 * (mutually exclusive). Shared by the course and lecturer preference steps.
 */
export default function SearchMultiSelect({
  options,
  preferred,
  avoid,
  onChange,
  searchPlaceholder,
  emptyLabel,
}: SearchMultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const togglePreferred = (value: string) => {
    if (preferred.includes(value)) {
      onChange({ preferred: preferred.filter((v) => v !== value), avoid });
    } else {
      onChange({
        preferred: [...preferred, value],
        avoid: avoid.filter((v) => v !== value),
      });
    }
  };

  const toggleAvoid = (value: string) => {
    if (avoid.includes(value)) {
      onChange({ preferred, avoid: avoid.filter((v) => v !== value) });
    } else {
      onChange({
        preferred: preferred.filter((v) => v !== value),
        avoid: [...avoid, value],
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="rounded-none border-2 border-black pl-9"
        />
      </div>

      <ScrollArea className="h-64 border-2 border-black bg-[#F2F2F2]">
        <div className="p-2 space-y-1">
          {filtered.length === 0 && (
            <div className="flex flex-col mt-8 gap-3 justify-center items-center">
              <SearchX className="text-[#FF3000]" />
              <div className="text-center">
                {emptyLabel}
              </div>
            </div>
          )}
          {filtered.map((option) => {
            const isPreferred = preferred.includes(option.value);
            const isAvoided = avoid.includes(option.value);
            return (
              <div
                key={option.value}
                className="flex items-center justify-between gap-2 bg-white border-2 border-black px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {option.label}
                  </div>
                  {option.sublabel && (
                    <div className="text-xs text-muted-foreground truncate">
                      {option.sublabel}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Prioritaskan"
                    onClick={() => togglePreferred(option.value)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center border-2 border-black transition-colors",
                      isPreferred
                        ? "bg-black text-white"
                        : "bg-white hover:bg-black/10",
                    )}
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Hindari"
                    onClick={() => toggleAvoid(option.value)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center border-2 border-black transition-colors",
                      isAvoided
                        ? "bg-[#FF3000] text-white border-[#FF3000]"
                        : "bg-white hover:bg-black/10",
                    )}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
