import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=reset-session-required");
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#FAFAFA] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -left-40 -top-40 w-96 h-96 bg-[#00E599] rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute -right-40 -bottom-40 w-96 h-96 bg-[#6C63FF] rounded-full blur-[140px] opacity-8 pointer-events-none" />
      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-4">
          <LogoMark size={56} glow />
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-widest text-white">AGENTFLOW <span className="text-[#00E599]">AI</span></h1>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40 font-bold">Credential Rotation</p>
          </div>
        </div>

        <Card className="border-white/[0.06] bg-[#111111]/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[#00E599]/20 bg-[#00E599]/10">
              <LockKeyhole className="size-5 text-[#00E599]" />
            </div>
            <CardTitle className="text-xl">Set New Operator Key</CardTitle>
            <CardDescription>
              Complete the recovery sequence by sealing a new password for this operator identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
