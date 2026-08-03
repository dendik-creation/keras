import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ActionDrawerItemProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export function ActionDrawerItem({
  title,
  icon,
  variant = "default",
  disabled = false,
  onClick,
}: ActionDrawerItemProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 250, damping: 28, duration: 0.12 }}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center p-4 border-2 font-medium uppercase tracking-wider text-xs transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "default" && "bg-white border-black text-black hover:bg-black/5",
        variant === "primary" && "bg-white border-[#FF3000] text-black hover:bg-black/5",
        variant === "danger" && "bg-[#FF3000] border-black text-white hover:bg-[#E62B00]"
      )}
    >
      <span className={cn("mr-3", variant === "primary" && "text-[#FF3000]")}>
        {icon}
      </span>
      {title}
    </motion.button>
  );
}
