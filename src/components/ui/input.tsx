import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-white/[0.08] bg-[#161616] px-3 py-2 text-sm text-[#FAFAFA] shadow-sm outline-none transition-all placeholder:text-white/30 focus:border-[#00E599] focus:ring-2 focus:ring-[#00E599]/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
