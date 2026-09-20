import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "muted";
}

export function Badge({
  variant = "default",
  className,
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-black text-white",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    muted: "bg-gray-100 text-gray-600",
  };
  
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className || ""}`}
      {...props}
    />
  );
}
