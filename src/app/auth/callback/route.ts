import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  let redirectPath = safeNext ?? "/select-organization";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      redirectPath = "/login?error=auth-callback-failed";
    }

    if (!error && data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!safeNext && profile?.is_platform_admin) {
        redirectPath = "/admin/dashboard";
      }
    }
  } else {
    redirectPath = "/login?error=auth-code-required";
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
