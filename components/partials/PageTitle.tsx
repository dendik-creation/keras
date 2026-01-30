"use client";
import { useEffect } from "react";

export type PageTitleProps = {
  title?: string;
  description?: string;
};

export const PageTitle = ({ title, description }: PageTitleProps) => {
  useEffect(() => {
    document.title = title || "KeRas";
  }, [title]);
  return (
    <>
      <div className="flex justify-start items-center gap-5 mb-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-2xl">{title}</h2>
          <span className="text-slate-700">{description}</span>
        </div>
      </div>
    </>
  );
};
