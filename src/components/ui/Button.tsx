import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-pegasus-primary text-white shadow-lg shadow-blue-900/20 hover:bg-pegasus-medium",
  secondary: "border border-blue-100 bg-white text-pegasus-primary shadow-sm hover:bg-pegasus-ice",
  ghost: "text-pegasus-primary hover:bg-pegasus-ice",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
};

export function Button({
  children,
  className = "",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
