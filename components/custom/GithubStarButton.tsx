"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Github, Star } from "lucide-react";

/** Nav CTA showing the live GitHub star count for the repository. */
export default function GithubStarButton({ inverted }: { inverted?: boolean }) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/github-stars")
      .then((r) => r.json())
      .then((d) => {
        if (active) setStars(typeof d?.stars === "number" ? d.stars : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <a
      href="https://github.com/dendik-creation/keras/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Button
        variant="outline"
        className={`rounded-none capitalize border-2 transition-colors duration-200 font-bold tracking-wider ${
          inverted
            ? "border-white bg-black text-white hover:bg-white hover:text-black"
            : "border-black bg-white text-black hover:bg-[#FF3000] hover:text-white hover:border-[#FF3000]"
        }`}
      >
        <Github className="w-4 h-4" /> {stars === null ? "…" : stars} <Star/>
      </Button>
    </a>
  );
}
