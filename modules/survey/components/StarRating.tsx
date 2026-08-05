"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (val: number) => void;
  maxStars?: number;
  ariaLabel?: string;
  disabled?: boolean;
}

export function StarRating({
  value,
  onChange,
  maxStars = 5,
  ariaLabel = "Rating Bintang",
  disabled = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayRating = hoverValue !== null ? hoverValue : value;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex items-center gap-2 flex-wrap"
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const starNumber = i + 1;
        const isFilled = starNumber <= displayRating;

        return (
          <button
            key={starNumber}
            type="button"
            role="radio"
            aria-checked={value === starNumber}
            aria-label={`${starNumber} dari ${maxStars} bintang`}
            disabled={disabled}
            onClick={() => onChange(starNumber)}
            onMouseEnter={() => setHoverValue(starNumber)}
            onMouseLeave={() => setHoverValue(null)}
            className={`p-2 border-2 transition-all duration-150 rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white ${
              isFilled
                ? "bg-[#FF3000] border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]"
                : "bg-white dark:bg-zinc-900 border-black dark:border-zinc-700 text-gray-300 dark:text-zinc-600 hover:border-black dark:hover:border-zinc-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
            }`}
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                isFilled
                  ? "fill-white text-white"
                  : "fill-transparent text-gray-300 dark:text-zinc-600"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
