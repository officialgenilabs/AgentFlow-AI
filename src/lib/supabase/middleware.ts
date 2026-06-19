import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  const canonicalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (canonicalAppUrl) {
    try {
      const canonicalUrl = new URL(canonicalAppUrl);
      const requestHost = request.nextUrl.hostname;
      const localHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

      if (canonicalUrl.hostname && requestHost !== canonicalUrl.hostname && !localHosts.has(requestHost)) {
        const redirectUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalUrl.origin);
        return NextResponse.redirect(redirectUrl, 307);
      }
    } catch {
      // Ignore malformed canonical URL configuration and continue with normal auth handling.
    }
  }

  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  const isProtectedPath = pathname.startsWith("/app") || pathname.startsWith("/admin");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isProtectedPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "?error=supabase-env-required";
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (pathname.startsWith("/app") && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_platform_admin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/select-organization";
      redirectUrl.search = "?error=platform-admin-required";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
