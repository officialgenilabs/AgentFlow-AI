import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let redirectPath = "/select-organization";

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_platform_admin")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.is_platform_admin) {
        redirectPath = "/admin/dashboard";
      }
    }
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
