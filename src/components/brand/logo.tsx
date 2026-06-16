import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
  glow?: boolean;
}

// Canonical AgentFlow mark. Keep public/logo.svg generated from this geometry.
export function LogoMark({ size = 32, className = "", glow = false, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 1200"
      width={size}
      height={(size * 12) / 8}
      fill="none"
      className={cn(
        "transition-all duration-300",
        glow && "drop-shadow-[0_0_18px_rgba(0,229,153,0.28)]",
        className
      )}
      {...props}
    >
      <defs>
        <linearGradient id="mint-glow-grad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C2FCE5" />
          <stop offset="50%" stopColor="#00E599" />
          <stop offset="100%" stopColor="#008A5E" />
        </linearGradient>
        <filter id="subtle-bloom-comp" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="24" result="blur" />
          <feComponentTransfer in="blur" result="boost">
            <feFuncA type="linear" slope="0.4" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="boost" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#subtle-bloom-comp)" transform="translate(100, 150)">
        {/* DNA double-helix structures forming the G & I monogram */}
        <path
          d="M 300,50 C 450,50 550,150 550,300 C 550,450 450,550 300,550 C 150,550 50,450 50,300 C 50,150 150,50 300,50 Z"
          stroke="url(#mint-glow-grad-comp)"
          strokeWidth="48"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.15"
        />
        <path
          d="M 280,100 C 380,100 480,180 510,280 C 520,310 490,330 460,310 C 430,290 370,220 280,220 C 190,220 150,280 150,350 C 150,420 190,480 280,530 C 370,580 480,630 480,750 C 480,870 380,950 280,950 C 180,950 80,870 50,770 C 40,740 70,720 100,740 C 130,760 190,830 280,830 C 370,830 410,770 410,700 C 410,630 370,570 280,520 C 190,470 80,420 80,300 C 80,180 180,100 280,100 Z"
          fill="url(#mint-glow-grad-comp)"
        />
        <path
          d="M 280,450 H 480 C 510,450 530,470 530,500 C 530,530 510,550 480,550 H 280 C 250,550 230,530 230,500 C 230,470 250,450 280,450 Z"
          fill="url(#mint-glow-grad-comp)"
        />
        <path
          d="M 180,250 C 240,190 360,190 420,250 C 440,270 420,300 395,290 C 360,275 300,275 265,290 C 240,300 220,270 180,250 Z"
          fill="url(#mint-glow-grad-comp)"
        />
        <path
          d="M 180,650 C 240,590 360,590 420,650 C 440,670 420,700 395,690 C 360,675 300,675 265,690 C 240,700 220,670 180,650 Z"
          fill="url(#mint-glow-grad-comp)"
        />
      </g>
    </svg>
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
