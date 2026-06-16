import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  glow?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  description,
  trend,
  glow = false,
  className = "",
  icon
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        glow && "border-[#00E599]/30 shadow-[0_0_30px_rgba(0,229,153,0.06)] hover:border-[#00E599]/50",
        className
      )}
    >
      {/* Decorative background accent glow */}
      {glow && (
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-[#00E599] rounded-full blur-[80px] opacity-20 pointer-events-none" />
      )}
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-white/40 uppercase font-sans">
            {title}
          </span>
          {icon && <div className="text-white/40">{icon}</div>}
        </div>
        
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight font-heading text-white">
            {value}
          </span>
          {trend && (
            <span
              className={cn(
                "text-xs font-semibold font-mono px-2 py-0.5 rounded-full border",
                trend.isPositive
                  ? "bg-green-500/10 text-green-400 border-green-500/15"
                  : "bg-red-500/10 text-red-400 border-red-500/15"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}
            </span>
          )}
        </div>
        
        {(description || (trend && trend.label)) && (
          <p className="mt-2 text-xs text-white/40 font-medium">
            {description || trend?.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
