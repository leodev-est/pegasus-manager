import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold",
    "transition-all duration-150 ease-out",
    "active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky focus-visible:ring-offset-2",
    "dark:focus-visible:ring-offset-slate-900",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-pegasus-primary text-white",
          "shadow-md shadow-blue-900/20",
          "hover:bg-pegasus-medium hover:shadow-lg hover:shadow-blue-900/25 hover:-translate-y-px",
        ],
        secondary: [
          "border border-blue-100 bg-white text-pegasus-primary",
          "shadow-sm",
          "hover:bg-pegasus-ice hover:border-pegasus-sky hover:-translate-y-px hover:shadow-md",
        ],
        ghost: [
          "text-pegasus-primary",
          "hover:bg-pegasus-ice",
        ],
        danger: [
          "bg-rose-600 text-white",
          "shadow-md shadow-rose-900/20",
          "hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-900/25 hover:-translate-y-px",
        ],
      },
      size: {
        default: "min-h-10 px-4 py-2.5",
        sm: "min-h-8 px-3 py-1.5 text-xs",
        lg: "min-h-12 px-6 py-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
