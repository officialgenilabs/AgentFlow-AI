import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getCurrentProfile, getUserOrganizations } from "@/lib/data/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SelectOrganizationPage() {
  const [profile, organizations] = await Promise.all([getCurrentProfile(), getUserOrganizations()]);

  if (!profile.is_platform_admin && organizations.length === 1) {
    redirect(`/app/${organizations[0].slug}/dashboard`);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
        <Card className="w-full border-white/10 bg-white text-slate-950 shadow-2xl">
          <CardHeader>
            <CardTitle>Choose operating context</CardTitle>
            <CardDescription>Access is resolved from your verified membership records — never from client-supplied organization IDs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profile.is_platform_admin ? (
              <Button asChild className="w-full justify-start" variant="secondary"><Link href="/admin/dashboard"><ShieldCheck className="size-4" /> Founder admin dashboard</Link></Button>
            ) : null}
            {organizations.map((org) => (
              <Button key={org.id} asChild className="w-full justify-start" variant="outline"><Link href={`/app/${org.slug}/dashboard`}>{org.name}<span className="ml-auto text-xs text-slate-400">{org.status}</span></Link></Button>
            ))}
            {organizations.length === 0 && !profile.is_platform_admin ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No active organization membership found. Founder setup is required.</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
