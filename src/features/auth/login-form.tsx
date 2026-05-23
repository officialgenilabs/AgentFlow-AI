"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(searchParams.get("error") ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setEmail("operator@genilabs.ai");
      setPassword("infrastructure-calm");
    }
  }, [isDemoMode]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (isDemoMode) {
      // High-fidelity operational synthetic authentication delay
      setTimeout(() => {
        router.push("/select-organization");
        router.refresh();
      }, 700);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/select-organization");
      router.refresh();
    } catch (err: any) {
      setMessage(err?.message ?? "An unexpected error occurred during secure gateway verification.");
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
          placeholder="operator@genilabs.ai" 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Operations Key</Label>
        <Input 
          id="password" 
          type="password" 
          value={password} 
          onChange={(event) => setPassword(event.target.value)} 
          required 
          placeholder="••••••••••••" 
        />
      </div>
      
      {message && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-mono font-bold text-red-400">
          {message}
        </p>
      )}

      {isDemoMode && (
        <div className="rounded-xl border border-[#00E599]/20 bg-[#00E599]/5 px-4 py-3 select-none text-left">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#00E599] flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E599] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E599]" />
            </span>
            Demo Layer Engaged
          </p>
          <p className="mt-1 text-[11px] text-white/50 leading-relaxed font-medium">
            Running in complete local staging mode. Bypassing Supabase credentials verification.
          </p>
        </div>
      )}
      
      <Button className="w-full text-xs font-bold uppercase tracking-wider h-11" type="submit" disabled={loading}>
        {loading ? "Decrypting gateway credentials..." : isDemoMode ? "Enter Demo Workspace" : "Enter Secure Workspace"}
      </Button>
    </form>
  );
}
