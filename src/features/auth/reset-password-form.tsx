"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Use at least 8 characters for the new operator key.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The operator keys do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      router.push("/select-organization");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unable to update operator credentials.";
      setMessage(errorMessage);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 text-left">
      <div className="space-y-2">
        <Label htmlFor="password">New Operator Key</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          placeholder="••••••••••••"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Operator Key</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
          minLength={8}
          placeholder="••••••••••••"
        />
      </div>

      {message && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-mono font-bold text-red-400">
          {message}
        </p>
      )}

      <Button className="w-full text-xs font-bold uppercase tracking-wider h-11" type="submit" disabled={loading}>
        {loading ? "Sealing operator credentials..." : "Update operator key"}
      </Button>
    </form>
  );
}
