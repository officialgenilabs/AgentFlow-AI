import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-mono tracking-wider transition-all select-none border border-transparent",
  {
    variants: {
      variant: {
        neutral: "bg-white/[0.04] text-white/70 border-white/[0.05]",
        active: "bg-green-500/10 text-green-400 border-green-500/20",
        warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        error: "bg-red-500/10 text-red-400 border-red-500/20",
        mint: "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20",
        orchestration: "bg-[#6C63FF]/10 text-[#A29EFF] border-[#6C63FF]/20"
      }
    },
    defaultVariants: { variant: "neutral" }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
