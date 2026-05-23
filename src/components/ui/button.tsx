import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E599] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default: "bg-[#00E599] text-[#0A0A0A] shadow-[0_4px_20px_-4px_rgba(0,229,153,0.3)] hover:bg-[#00CC88] hover:scale-[1.01] active:scale-[0.99]",
        secondary: "bg-white/[0.04] text-white border border-white/[0.08] hover:bg-white/[0.08] backdrop-blur-md hover:border-white/[0.15] active:scale-[0.99]",
        ghost: "text-white/60 hover:bg-white/[0.06] hover:text-white",
        outline: "border border-white/[0.1] bg-transparent text-white hover:bg-white/[0.04] hover:border-white/[0.2] active:scale-[0.99]",
        destructive: "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 active:scale-[0.99]"
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10 p-0"
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
