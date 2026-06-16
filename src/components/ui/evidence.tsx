"use client";

import * as React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  UserCheck,
  Database,
  ArrowRight,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// 1. SourceTrace Component
export interface SourceTraceProps {
  source: string;
  subtype?: string;
  reference?: string;
  className?: string;
}

export function SourceTrace({ source, subtype, reference, className }: SourceTraceProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold text-white/40 uppercase tracking-widest", className)}>
      <Database className="size-3 text-[#6C63FF]" />
      <span className="text-white/60">{source}</span>
      {subtype && (
        <>
          <span className="text-white/20">{"//"}</span>
          <span>{subtype}</span>
        </>
      )}
      {reference && (
        <>
          <span className="text-white/20">{"//"}</span>
          <span className="text-[#A29EFF]">{reference}</span>
        </>
      )}
    </div>
  );
}

// 2. VerificationStatus Component
export interface VerificationStatusProps {
  status: string;
  isVerified: boolean;
  className?: string;
}

export function VerificationStatus({ status, isVerified, className }: VerificationStatusProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border bg-white/[0.01] px-3 py-2 border-white/[0.04] text-[11px]", className)}>
      {isVerified ? (
        <UserCheck className="size-4 text-[#00E599]" />
      ) : (
        <HelpCircle className="size-4 text-amber-400" />
      )}
      <div className="flex-1 font-sans">
        <span className="text-white/40 font-bold uppercase tracking-wider text-[9px] block">Identity Resolution</span>
        <span className="text-white/70 font-semibold">{status}</span>
      </div>
      <Badge variant={isVerified ? "active" : "warning"}>
        {isVerified ? "Resolved" : "Pending"}
      </Badge>
    </div>
  );
}

// 3. GovernanceState Component
export interface GovernanceStateProps {
  state: string;
  status: "pending" | "hold" | "blocked" | "verified";
  className?: string;
}

export function GovernanceState({ state, status, className }: GovernanceStateProps) {
  const configs = {
    pending: {
      border: "border-amber-500/20 bg-amber-500/5",
      text: "text-amber-400",
      badge: "warning" as const,
      icon: Clock
    },
    hold: {
      border: "border-[#6C63FF]/20 bg-[#6C63FF]/5",
      text: "text-[#A29EFF]",
      badge: "orchestration" as const,
      icon: Lock
    },
    blocked: {
      border: "border-red-500/20 bg-red-500/5",
      text: "text-red-400",
      badge: "error" as const,
      icon: ShieldAlert
    },
    verified: {
      border: "border-[#00E599]/20 bg-[#00E599]/5",
      text: "text-[#00E599]",
      badge: "mint" as const,
      icon: ShieldCheck
    }
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-3 rounded-2xl border p-4 transition-all duration-200", config.border, className)}>
      <div className={cn("rounded-full p-2 border", config.border)}>
        <Icon className={cn("size-5", config.text)} />
      </div>
      <div className="flex-1 select-none">
        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30 block">Compliance Gate State</span>
        <h4 className="font-heading font-extrabold text-xs text-white uppercase mt-0.5 tracking-wider">{state}</h4>
      </div>
      <Badge variant={config.badge}>
        {status}
      </Badge>
    </div>
  );
}

// 4. EvidenceCard Component
export interface EvidenceCardProps {
  source: string;
  subtype?: string;
  reference?: string;
  confidence: number;
  verificationStatus: string;
  isVerified: boolean;
  governanceState: string;
  governanceStatus: "pending" | "hold" | "blocked" | "verified";
  limitations: string[];
  nextAction: string;
  lastVerified?: string;
  className?: string;
}

export function EvidenceCard({
  source,
  subtype,
  reference,
  confidence,
  verificationStatus,
  isVerified,
  governanceState,
  governanceStatus,
  limitations,
  nextAction,
  lastVerified = "Just now",
  className
}: EvidenceCardProps) {
  return (
    <div className={cn("rounded-3xl border border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl shadow-2xl p-6 space-y-5 text-left select-none relative overflow-hidden", className)}>
      {/* Dynamic top gradient indicator depending on status */}
      <div className={cn(
        "absolute left-0 top-0 right-0 h-[2px]",
        governanceStatus === "verified" && "bg-[#00E599]",
        governanceStatus === "pending" && "bg-amber-500",
        governanceStatus === "hold" && "bg-[#6C63FF]",
        governanceStatus === "blocked" && "bg-red-500"
      )} />

      {/* Header with Source & Last Verified */}
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">Evidence Origin</span>
          <SourceTrace source={source} subtype={subtype} reference={reference} />
        </div>
        <div className="text-right">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">Last Audited</span>
          <span className="text-[10px] font-mono text-white/50 font-bold uppercase">{lastVerified}</span>
        </div>
      </div>

      {/* Confidence & Integrity Level */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-3 text-left">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">Integrity Score</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={cn(
              "text-xl font-heading font-extrabold",
              confidence >= 90 ? "text-[#00E599]" : confidence >= 75 ? "text-amber-400" : "text-red-400"
            )}>{confidence}%</span>
            <span className="text-[9px] font-mono font-bold text-white/20 uppercase">Accuracy Intent</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-3 text-left">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">Trust Index</span>
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn(
              "size-2 rounded-full",
              isVerified ? "bg-[#00E599]" : "bg-amber-400"
            )} />
            <span className="text-[10px] font-mono font-bold text-white/60 uppercase">
              {isVerified ? "High-Fidelity" : "Secondary Match"}
            </span>
          </div>
        </div>
      </div>

      {/* Verification Status Banner */}
      <VerificationStatus status={verificationStatus} isVerified={isVerified} />

      {/* Compliance / Governance State */}
      <GovernanceState state={governanceState} status={governanceStatus} />

      {/* System Limitations / Disclosures */}
      {limitations && limitations.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">System Limitations & Scope</span>
          <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.02] p-4 text-xs leading-relaxed text-red-400/80 font-medium">
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              {limitations.map((limit, idx) => (
                <li key={idx}>{limit}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Next Required Operator Action */}
      {nextAction && (
        <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
          <span className="text-[9px] font-mono font-bold tracking-widest text-white/30 uppercase block">Next Required Operator Action</span>
          <div className={cn(
            "rounded-2xl border p-4 text-xs font-semibold flex gap-2.5 items-start",
            governanceStatus === "blocked" ? "border-red-500/20 bg-red-500/5 text-red-400" : "border-amber-500/20 bg-amber-500/5 text-amber-400"
          )}>
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-sans">
              <span className="leading-relaxed">{nextAction}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. TrustLedger Component
export interface TrustLedgerEntry {
  timestamp: string;
  event: string;
  actor: string;
  status: "verified" | "hold" | "blocked" | "system";
}

export interface TrustLedgerProps {
  entries: TrustLedgerEntry[];
  title?: string;
  description?: string;
  className?: string;
}

export function TrustLedger({ entries, title, description, className }: TrustLedgerProps) {
  const statusColors = {
    verified: "text-[#00E599]",
    hold: "text-[#A29EFF]",
    blocked: "text-red-400",
    system: "text-white/40"
  };

  return (
    <div className={cn("rounded-3xl border border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl shadow-2xl p-6 space-y-4 text-left select-none", className)}>
      {(title || description) && (
        <div className="space-y-1 pb-2 border-b border-white/[0.04]">
          {title && <h3 className="font-heading font-extrabold text-sm text-white tracking-wider uppercase">{title}</h3>}
          {description && <p className="text-white/40 text-[11px] font-semibold">{description}</p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[10px] leading-5">
          <thead>
            <tr className="text-white/30 uppercase tracking-wider border-b border-white/[0.03] pb-2">
              <th className="font-bold pb-2 pr-4">Timestamp</th>
              <th className="font-bold pb-2 pr-4">Event Integrity Log</th>
              <th className="font-bold pb-2 pr-4 text-right">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {entries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                <td className="py-2.5 pr-4 text-white/40 align-top whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className={cn("py-2.5 pr-4 font-semibold align-top leading-relaxed", statusColors[entry.status])}>
                  {entry.event}
                </td>
                <td className="py-2.5 text-right font-bold text-white/60 align-top whitespace-nowrap">
                  {entry.actor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}