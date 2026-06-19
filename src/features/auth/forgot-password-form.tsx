"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const redirectTo = `${origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("If this operator identity exists, a recovery email has been sent to the approved mailbox.");
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unable to start operator recovery.";
      setMessage(errorMessage);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-left">
      <div className="space-y-2">
        <Label htmlFor="email">Operator Identity</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="operator@example.com"
        />
      </div>

      {message && (
        <p className="rounded-xl border border-[#00E599]/20 bg-[#00E599]/10 px-4 py-3 text-xs font-mono font-bold text-[#00E599]">
          {message}
        </p>
      )}

      <Button className="w-full text-xs font-bold uppercase tracking-wider h-11" type="submit" disabled={loading}>
        {loading ? "Preparing recovery channel..." : "Send recovery email"}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-[11px] font-mono font-bold uppercase tracking-widest text-white/40 transition hover:text-[#00E599]">
          Return to secure login
        </Link>
      </div>
    </form>
  );
}
