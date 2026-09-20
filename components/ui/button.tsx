import type { ButtonHTMLAttributes } from "react";

export function buttonClass(
  variant?: "default" | "outline" | "ghost",
  size?: "default" | "sm" | "lg"
): string {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    default: "bg-black text-white hover:bg-black/90",
    outline: "border border-gray-300 bg-white hover:bg-gray-50",
    ghost: "hover:bg-gray-100",
  };
  
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-8 px-3 text-sm",
    lg: "h-12 px-6 text-lg",
  };
  
  return `${base} ${variants[variant || "default"]} ${sizes[size || "default"]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${buttonClass(variant, size)} ${className || ""}`}
      {...props}
    />
  );
}
