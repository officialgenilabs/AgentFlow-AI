import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { CalendarDays, MapPin, User, ShieldCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CalendarPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const tenant = await resolveTenantBySlug(orgSlug);

  const viewings = [
    {
      id: "viewing-1",
      property: "12 Camps Bay Beachfront Villa",
      lead: "Thandi Mokoena",
      time: "Mon 10:00 - 11:30",
      broker: "Nomsa Dube",
      status: "confirmed"
    },
    {
      id: "viewing-2",
      property: "7 Highrise Penthouse, Sandton",
      lead: "Sarah Smith",
      time: "Wed 14:00 - 15:00",
      broker: "Nomsa Dube",
      status: "pending"
    },
    {
      id: "viewing-3",
      property: "Stellenbosch Estate Vineyard Manor",
      lead: "Johan de Wet",
      time: "Fri 16:00 - 17:30",
      broker: "Pieter Malan",
      status: "confirmed"
    }
  ];

  const weekDays = [
    { name: "Mon", date: "25 May", active: true, viewingsCount: 1 },
    { name: "Tue", date: "26 May", active: false, viewingsCount: 0 },
    { name: "Wed", date: "27 May", active: true, viewingsCount: 1 },
    { name: "Thu", date: "28 May", active: false, viewingsCount: 0 },
    { name: "Fri", date: "29 May", active: true, viewingsCount: 1 },
    { name: "Sat", date: "30 May", active: false, viewingsCount: 0 },
    { name: "Sun", date: "31 May", active: false, viewingsCount: 0 }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#00E599]" />
              Property Viewings Calendar
            </h1>
            <p className="text-sm text-[#888888]">
              Monitor autonomous scheduling completions, luxury site tours, and agent dispatch mappings.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-white/[0.08] text-white hover:bg-white/[0.04] rounded-xl flex items-center gap-1.5" size="sm">
              <ChevronLeft className="h-4 w-4" />
              Prev Week
            </Button>
            <Button variant="outline" className="border-white/[0.08] text-white hover:bg-white/[0.04] rounded-xl flex items-center gap-1.5" size="sm">
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button className="bg-[#00E599] text-[#0A0A0A] hover:bg-[#00E599]/90 font-semibold rounded-xl" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule Viewing
            </Button>
          </div>
        </div>

        {/* Weekly Header View */}
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, idx) => (
            <Card key={idx} className={`bg-[#111111]/80 backdrop-blur-xl border-white/[0.06] hover:border-white/[0.12] transition-all text-center p-4 ${
              day.active ? "border-[#00E599]/30 bg-[#1A1A1A]/30" : ""
            }`}>
              <p className="text-xs text-[#888888] font-bold uppercase tracking-wider">{day.name}</p>
              <p className="text-lg font-mono font-bold text-white mt-1">{day.date}</p>
              {day.viewingsCount > 0 ? (
                <div className="mt-3 inline-flex items-center gap-1 bg-[#00E599]/10 border border-[#00E599]/20 px-2 py-0.5 rounded text-[10px] text-[#00E599] font-bold uppercase tracking-wider font-mono">
                  {day.viewingsCount} TOUR
                </div>
              ) : (
                <p className="mt-3 text-[10px] text-[#888888] font-mono">EMPTY</p>
              )}
            </Card>
          ))}
        </div>

        {/* Dynamic Detail Lists */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Active Viewings Ledger */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-2">
            <CardHeader className="border-b border-white/[0.06] pb-4">
              <CardTitle className="text-lg font-bold text-[#FAFAFA]">Scheduled Luxury Viewings</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Intelligent tours locked by autonomous conversational pipeline confirmation.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {viewings.map((viewing) => (
                <div 
                  key={viewing.id} 
                  className="rounded-xl border border-white/[0.06] bg-[#161616]/40 p-5 hover:bg-[#1A1A1A]/80 transition-all duration-200"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-[#00E599] bg-[#00E599]/5 px-2 py-0.5 rounded border border-[#00E599]/10">
                          {viewing.time}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          viewing.status === "confirmed" 
                            ? "bg-[#00E599]/10 text-[#00E599] border-[#00E599]/20" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {viewing.status}
                        </span>
                      </div>
                      
                      <p className="font-bold text-[#FAFAFA] text-base">{viewing.property}</p>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#888888]">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#888888]" />
                          Lead: <span className="font-semibold text-white">{viewing.lead}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#888888]" />
                          Assigned Agent: <span className="text-[#FAFAFA] font-medium">{viewing.broker}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="border-white/[0.08] hover:bg-white/[0.06] text-[#FAFAFA] rounded-xl text-xs px-4" size="sm">
                        Reschedule
                      </Button>
                      <Button className="bg-[#00E599]/10 text-[#00E599] hover:bg-[#00E599]/20 border border-[#00E599]/20 rounded-xl text-xs px-4" size="sm">
                        Dispatch WhatsApp Conf
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sync Status Info */}
          <Card className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-bold text-[#FAFAFA]">Autonomous Calendar Syncer</CardTitle>
              <CardDescription className="text-[#888888] text-xs">Calendar infrastructure state.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[#1A1A1A]/40 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Google Workspace Sync</span>
                  <span className="text-[#00E599] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E599] animate-pulse" />
                    CONNECTED
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">Agent Availability Mapping</span>
                  <span className="text-[#00E599] font-bold uppercase tracking-wider">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#888888]">WhatsApp Booking Triggers</span>
                  <span className="text-[#00E599] font-bold uppercase tracking-wider">ENABLED</span>
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">Sync Safeguards</p>
                <p className="text-xs text-[#888888] leading-relaxed">
                  Before confirming viewings, the agent allocation logic checks historical calendar latency to prevent double-booking. Viewings confirmed automatically will notify both broker and lead 24 hours prior.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
