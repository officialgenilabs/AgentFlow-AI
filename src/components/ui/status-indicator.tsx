import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "warning" | "error" | "offline";
  pulse?: boolean;
  className?: string;
  label?: string;
}

export function StatusIndicator({
  status,
  pulse = true,
  className = "",
  label
}: StatusIndicatorProps) {
  const statusConfig = {
    active: {
      color: "bg-[#00E599]",
      glow: "rgba(0, 229, 153, 0.4)",
      borderColor: "border-[#00E599]/20"
    },
    warning: {
      color: "bg-amber-500",
      glow: "rgba(245, 158, 11, 0.4)",
      borderColor: "border-amber-500/20"
    },
    error: {
      color: "bg-red-500",
      glow: "rgba(239, 68, 68, 0.4)",
      borderColor: "border-red-500/20"
    },
    offline: {
      color: "bg-white/30",
      glow: "rgba(255, 255, 255, 0.1)",
      borderColor: "border-white/10"
    }
  };

  const config = statusConfig[status];

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div className="relative flex items-center justify-center w-3 h-3">
        {pulse && status !== "offline" && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
              config.color
            )}
            style={{ animationDuration: "1.8s" }}
          />
        )}
        <span
          className={cn("relative inline-flex rounded-full h-2 w-2", config.color)}
          style={{
            boxShadow: pulse && status !== "offline" ? `0 0 8px ${config.glow}` : "none"
          }}
        />
      </div>
      {label && (
        <span className="text-xs font-mono font-bold tracking-wider text-white/50 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
