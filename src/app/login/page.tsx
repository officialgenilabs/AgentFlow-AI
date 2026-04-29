import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(200,169,106,0.18),transparent_30%),linear-gradient(135deg,#0f172a_0%,#111827_42%,#f8fafc_42%,#f8fafc_100%)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-end p-8 text-white lg:p-14">
        <div className="max-w-xl pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.36em] text-[#c8a96a]">Gen I Labs</p>
          <h1 className="mt-6 text-5xl font-semibold tracking-[-0.04em] lg:text-7xl">AgentFlow AI</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">A premium lead conversion operating system for real-estate teams that need speed, trust, and founder-controlled execution.</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Secure access</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Enter your operating room.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Authenticated users are resolved into verified organizations. Tenant isolation stays server-side.</p>
          <div className="mt-8"><Suspense><LoginForm /></Suspense></div>
        </div>
      </section>
    </main>
  );
}
