"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/shell";
import type { Organization, Profile } from "@/lib/types";
import type { AIApprovalItem } from "@/lib/demo/data";
import { useDemo } from "@/lib/demo/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { MetricCard } from "@/components/ui/metric-card";
import { EvidenceCard } from "@/components/ui/evidence";
import {
  ShieldCheck,
  Clock,
  Sparkles,
  MessageSquare,
  Send,
  X,
  AlertOctagon
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DemoAIApprovalsPage() {
  const { approvals, approveItem, rejectItem } = useDemo();
  const [selectedId, setSelectedId] = useState<string>(approvals[0]?.id || "");
  const [draftText, setDraftText] = useState<string>(approvals[0]?.draftResponse || "");
  const [editing, setEditing] = useState<boolean>(false);

  const selectedItem = approvals.find(a => a.id === selectedId) || approvals[0];

  const selectApproval = (item: AIApprovalItem) => {
    setSelectedId(item.id);
    setDraftText(item.draftResponse);
    setEditing(false);
  };

  const handleApprove = () => {
    if (!selectedItem) return;
    approveItem(selectedItem.id, draftText);
    const remaining = approvals.filter(a => a.id !== selectedItem.id);
    if (remaining.length > 0) {
      selectApproval(remaining[0]);
    } else {
      setSelectedId("");
    }
  };

  const handleReject = () => {
    if (!selectedItem) return;
    rejectItem(selectedItem.id);
    const remaining = approvals.filter(a => a.id !== selectedItem.id);
    if (remaining.length > 0) {
      selectApproval(remaining[0]);
    } else {
      setSelectedId("");
    }
  };

  const totalPending = approvals.length;
  const avgConfidence = approvals.length > 0
    ? Math.round(approvals.reduce((acc, curr) => acc + curr.confidenceScore, 0) / approvals.length)
    : 0;

  const mockOrg: Organization = {
    id: "demo-org-id",
    name: "Boutique Properties",
    slug: "boutique-properties",
    status: "active",
    industry: "Real Estate",
    plan: "Enterprise Staging"
  };
  const mockProfile: Profile = {
    id: "demo-operator-id",
    full_name: "Lead Architect",
    email: "operator@genilabs.ai",
    avatar_url: null,
    is_platform_admin: true
  };

  // Group queue by state
  const pendingItems = approvals.filter(a => a.status === "pending");
  const holdItems = approvals.filter(a => a.status === "hold");
  const blockedItems = approvals.filter(a => a.status === "blocked");

  return (
    <AppShell profile={mockProfile} organization={mockOrg} mode="demo">
      <div className="space-y-6 select-none text-left">
        {/* Metric Overview Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Staged Sim Approvals"
            value={totalPending}
            description="Responses requiring active human confirmation"
            glow={false}
            icon={<Clock className="size-4 text-amber-400" />}
          />
          <MetricCard
            title="Self-Attribution Confidence"
            value={`${avgConfidence}%`}
            description="AI self-audited intent reliability rating"
            icon={<ShieldCheck className="size-4 text-[#00E599]" />}
          />
          <MetricCard
            title="Outbound Gate Status"
            value="STAGE ONLY"
            description="PII + solar safeguard filters fully engaged"
            icon={<StatusIndicator status="active" pulse={false} />}
          />
        </div>

        {totalPending === 0 ? (
          <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <div className="rounded-full bg-[#00E599]/10 border border-[#00E599]/20 p-4 text-[#00E599]">
              <ShieldCheck className="size-10" />
            </div>
            <h2 className="text-xl font-heading font-extrabold text-white">Staging Ledger Quiet</h2>
            <p className="max-w-md text-xs text-white/50 leading-relaxed uppercase tracking-wider">
              Simulation outbound queue is empty. All synthetic ingress pipelines resolved under absolute staging compliance parameters.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
            {/* Left Queue List grouped by severity */}
            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-white/40 px-1">
                Staged Queue ({totalPending})
              </h2>

              {/* 1. Pending Column */}
              {pendingItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                    <StatusIndicator status="warning" pulse className="shrink-0" />
                    <span>Awaiting Action ({pendingItems.length})</span>
                  </div>
                  {pendingItems.map((item) => {
                    const isSelected = item.id === selectedItem?.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectApproval(item)}
                        className={cn(
                          "w-full text-left rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md flex flex-col gap-1.5 select-none",
                          isSelected
                            ? "bg-[#00E599]/5 border-[#00E599]/30"
                            : "bg-[#111111]/40 border-white/[0.04] hover:bg-[#111111]/60"
                        )}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                            {item.leadName}
                          </span>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
                            {item.confidenceScore}% ACC
                          </span>
                        </div>
                        <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest leading-none">
                          {item.propertyReference}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Hold Column */}
              {holdItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#A29EFF]">
                    <StatusIndicator status="governance" pulse={false} className="shrink-0" />
                    <span>Governance Holds ({holdItems.length})</span>
                  </div>
                  {holdItems.map((item) => {
                    const isSelected = item.id === selectedItem?.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectApproval(item)}
                        className={cn(
                          "w-full text-left rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md flex flex-col gap-1.5 select-none",
                          isSelected
                            ? "bg-[#6C63FF]/5 border-[#6C63FF]/30"
                            : "bg-[#111111]/40 border-white/[0.04] hover:bg-[#111111]/60"
                        )}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                            {item.leadName}
                          </span>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border bg-[#6C63FF]/10 text-[#A29EFF] border-[#6C63FF]/20">
                            {item.confidenceScore}% ACC
                          </span>
                        </div>
                        <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest leading-none">
                          {item.propertyReference}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3. Blocked Column */}
              {blockedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-red-400">
                    <AlertOctagon className="size-3 text-red-500 shrink-0" />
                    <span>Compliance Blocked ({blockedItems.length})</span>
                  </div>
                  {blockedItems.map((item) => {
                    const isSelected = item.id === selectedItem?.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => selectApproval(item)}
                        className={cn(
                          "w-full text-left rounded-2xl border p-4 transition-all duration-200 backdrop-blur-md flex flex-col gap-1.5 select-none",
                          isSelected
                            ? "bg-red-500/5 border-red-500/30"
                            : "bg-[#111111]/40 border-white/[0.04] hover:bg-[#111111]/60"
                        )}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                            {item.leadName}
                          </span>
                          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/20">
                            {item.confidenceScore}% ACC
                          </span>
                        </div>
                        <p className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest leading-none">
                          {item.propertyReference}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Active Editor (Splits into Context/Editor and Reusable Evidence Panel) */}
            {selectedItem && (
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
                <Card className="border-white/[0.06] bg-[#111111]/70 backdrop-blur-xl flex flex-col justify-between min-h-[600px] shadow-2xl">
                  <CardHeader className="border-b border-white/[0.04] pb-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg font-heading font-extrabold text-white">{selectedItem.leadName}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Simulation Incident Context // {selectedItem.propertyReference}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 pt-6 flex-1">
                    {/* Inbound Context */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                        <MessageSquare className="size-3 text-[#00E599]" /> Inbound Customer Signal ({selectedItem.channel})
                      </span>
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 text-xs text-white/80 leading-relaxed font-semibold italic">
                        &ldquo;{selectedItem.inboundMessage}&rdquo;
                      </div>
                    </div>

                    {/* AI Response Draft Textarea */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                          <Sparkles className="size-3 text-[#00E599]" /> Staged Outbound Response Draft
                        </span>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/40">
                          {editing ? "Draft Modified" : "Canonical Staged Draft"}
                        </span>
                      </div>
                      <textarea
                        value={draftText}
                        onChange={(e) => {
                          setDraftText(e.target.value);
                          setEditing(true);
                        }}
                        rows={6}
                        className="w-full rounded-2xl border border-white/[0.08] bg-[#1A1A1A]/80 p-4 text-xs leading-relaxed text-white focus:outline-none focus:border-[#00E599] transition-colors resize-none font-medium font-sans"
                      />
                    </div>
                  </CardContent>

                  {/* Footer Controls */}
                  <div className="border-t border-white/[0.04] p-6 bg-white/[0.01] flex flex-wrap gap-3 items-center justify-between">
                    <div className="flex gap-2 w-full justify-end">
                      <Button
                        onClick={handleReject}
                        variant="outline"
                        className="border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-xl text-xs font-bold"
                      >
                        <X className="size-4 mr-2" /> Reject Draft
                      </Button>
                      <Button
                        onClick={handleApprove}
                        className="bg-[#00E599] text-[#050505] hover:bg-[#00c584] rounded-xl text-xs font-bold"
                        disabled={selectedItem.status === "blocked"}
                      >
                        <Send className="size-4 mr-2" /> Approve Simulation
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Right Side: Reusable High-Integrity Evidence Panel */}
                <EvidenceCard
                  source={selectedItem.channel}
                  subtype="Sandton Node"
                  reference={selectedItem.propertyReference}
                  confidence={selectedItem.confidenceScore}
                  verificationStatus={selectedItem.verificationStatus}
                  isVerified={selectedItem.status !== "blocked"}
                  governanceState={selectedItem.governanceState}
                  governanceStatus={selectedItem.status}
                  limitations={selectedItem.limitations}
                  nextAction={selectedItem.nextAction}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}