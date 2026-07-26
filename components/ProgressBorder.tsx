"use client";
import { CSSProperties, ReactNode } from "react";
import "./ProgressBorder.css";

interface ProgressBorderProps {
  children: ReactNode;
  color?: string;
  radius?: number;
  thickness?: number;
  active?: boolean;
  duration?: number;
  style?: CSSProperties;
  className?: string;
}

const ProgressBorder: React.FC<ProgressBorderProps> = ({
  children,
  color = "#000000",
  radius = 12,
  thickness = 2,
  active = true,
  duration = 4.5,
  style,
  className,
}) => {
  const vars = {
    "--pb-color": color,
    "--pb-radius": `${radius}px`,
    "--pb-thickness": `${thickness}px`,
    "--pb-duration": `${duration}s`,
  } as CSSProperties;

  return (
    <div
      className={`progress-border ${active ? "progress-border--active" : ""} ${className ?? ""}`}
      style={{ ...vars, ...style }}
    >
      <div className="pb-content">{children}</div>
    </div>
  );
};

export default ProgressBorder;
