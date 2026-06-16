import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveTenantBySlug } from "@/lib/data/auth";
import { CalendarDays, MapPin, User, Clock } from "lucide-react";

export default async function DemoCalendarPage() {
  const orgSlug = "boutique-properties";
  const tenant = await resolveTenantBySlug(orgSlug, true);

  const viewings = [
    { id: "v-1", property: "Sandton Premium Penthouse // 3 Bed", client: "Sibusiso Ndlovu", agent: "Amanda Venter", time: "Saturday, 10:00 AM", status: "Pending Confirmation" },
    { id: "v-2", property: "Camps Bay Beachfront Villa // 5 Bed", client: "Jessica Vandermerwe", agent: "Amanda Venter", time: "Sunday, 3:00 PM", status: "Approved & Scheduled" },
    { id: "v-3", property: "Stellenbosch Estate Villa // 4 Bed", client: "David Pieterse", agent: "Sipho Dube", time: "Monday, 11:30 AM", status: "Confirmed" }
  ];

  return (
    <AppShell profile={tenant.profile} organization={tenant.organization} branding={tenant.branding} mode="demo">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#FAFAFA] font-sans flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#00E599]" />
            Viewing & Calendar Slots Manager
          </h1>
          <p className="text-sm text-[#888888]">
            Manage allocated viewing slots, agent assignments, and customer-facing schedule reserves.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {viewings.map((view) => (
            <Card key={view.id} className="bg-[#111111]/80 border-white/[0.06] backdrop-blur-xl hover:border-white/[0.12] transition-colors relative overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#00E599] uppercase">Viewing Schedule</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    view.status.includes("Pending")
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-[#00E599]/10 text-[#00E599]"
                  }`}>
                    {view.status}
                  </span>
                </div>
                <CardTitle className="text-sm font-bold text-[#FAFAFA] mt-3 font-sans leading-snug">{view.property}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 border-t border-white/[0.04] pt-4 mt-2">
                <div className="flex items-center gap-2 text-xs text-[#E5E5E5]">
                  <User className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  <span>Client: <span className="font-bold text-white">{view.client}</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E5E5E5]">
                  <MapPin className="h-3.5 w-3.5 text-white/40 shrink-0" />
                  <span>Broker Node: <span className="font-bold text-white">{view.agent}</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#E5E5E5]">
                  <Clock className="h-3.5 w-3.5 text-[#6C63FF] shrink-0" />
                  <span className="font-mono">{view.time}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
