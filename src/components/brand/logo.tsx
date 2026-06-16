import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const CANONICAL_LOGO_SOURCE = "/logo.svg";

interface LogoProps extends Omit<React.ComponentProps<typeof Image>, "src" | "width" | "height" | "alt"> {
  size?: number;
  className?: string;
  glow?: boolean;
  alt?: string;
}

// Canonical compact More-X mark. All AgentFlow / Gen I Labs platform logo surfaces resolve to public/logo.svg.
export function LogoMark({ size = 32, className = "", glow = false, alt = "", ...props }: LogoProps) {
  return (
    <Image
      src={CANONICAL_LOGO_SOURCE}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      className={cn(
        "block object-contain transition-all duration-300",
        glow && "drop-shadow-[0_0_18px_rgba(0,229,153,0.28)]",
        className
      )}
      {...props}
    />
  );
}

export function LogoFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex size-12 items-center justify-center rounded-2xl border border-[#00E599]/15 bg-[#00E599]/5 shadow-[0_0_24px_rgba(0,229,153,0.08)]", className)}>
      {children}
    </div>
  );
}

export function LogoFull({ size = 28, className = "", textClassName = "", glow = false }: { size?: number; className?: string; textClassName?: string; glow?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} glow={glow} />
      <div className="flex flex-col select-none">
        <span className={cn("font-heading font-extrabold tracking-wider text-sm leading-none text-white", textClassName)}>
          AGENTFLOW <span className="text-[#00E599] font-medium">AI</span>
        </span>
        <span className="text-[9px] uppercase tracking-[0.2em] font-medium text-white/40 leading-none mt-1">
          Gen I Labs
        </span>
      </div>
    </div>
  );
}
