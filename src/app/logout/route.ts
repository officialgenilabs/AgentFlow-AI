import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const fallbackUrl = new URL(request.url).origin;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? fallbackUrl;
  return NextResponse.redirect(new URL("/login?message=signed-out", appUrl));
}
