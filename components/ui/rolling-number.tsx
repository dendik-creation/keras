"use client";

import { motion } from "motion/react";

/** Single odometer digit: a column of 0-9 that slides to the active digit. */
function RollingDigit({ digit }: { digit: string }) {
  if (!/[0-9]/.test(digit)) {
    return <span className="inline-block">{digit}</span>;
  }

  const value = Number(digit);

  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden align-bottom">
      <motion.span
        className="absolute inset-x-0 top-0 flex flex-col items-center"
        animate={{ y: `-${value}em` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className="h-[1em] leading-[1em]">
            {i}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

/** Odometer-style rolling counter — digits slide in place on value change. */
export default function RollingNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={className}>
      {String(value)
        .split("")
        .map((digit, idx) => (
          <RollingDigit key={idx} digit={digit} />
        ))}
    </span>
  );
}
