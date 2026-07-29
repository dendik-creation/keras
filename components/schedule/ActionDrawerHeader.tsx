import React from "react";

interface ActionDrawerHeaderProps {
  title: string;
}

export function ActionDrawerHeader({ title }: ActionDrawerHeaderProps) {
  return (
    <div className="border-b-[1px] border-black/20 pb-3">
      <h2 className="font-bold text-base uppercase tracking-widest text-black">
        {title}
      </h2>
    </div>
  );
}
