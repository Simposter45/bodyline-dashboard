import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication, mapped to allowed roles
const PROTECTED: Record<string, string[]> = {
  "/dashboard": ["owner"],
  "/trainer": ["trainer"],
  "/member": ["member", "guest"], // guest = onboarding localStorage path
};

// Public routes — never redirect
const PUBLIC = ["/", "/login", "/onboarding", "/checkin"];

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // --- Subdomain Tenant Resolution ---
  const host = request.headers.get("host") || "";
  let slug: string | undefined = undefined;

  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    const parts = host.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      slug = parts[0];
    }
  } else {
    // prod domains like gym1.bodyline.in
    const parts = host.split(".");
    if (parts.length > 2 && parts[0] !== "www") {
      slug = parts[0];
    }
  }

  // Resolve gym_id
  if (slug) {
    const { data } = await supabase
      .from("gyms")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (data?.id) {
      requestHeaders.set("x-gym-id", data.id);
      // Re-initialize to apply updated request headers to the Next.js pipeline
      supabaseResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // Refresh session — MUST be called before any getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public routes through always
  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return supabaseResponse;
  }

  // Not logged in — redirect to login
  if (!user) {
    // Allow guest member access via onboarding URL param
    if (
      pathname.startsWith("/member") &&
      request.nextUrl.searchParams.get("guest")
    ) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged in — enforce role
  const rawRole = (user.app_metadata?.role as string) || (user.user_metadata?.role as string);
  const role = ["owner", "trainer", "member"].includes(rawRole) ? rawRole : "member";

  const matchedBase = Object.keys(PROTECTED).find((base) =>
    pathname.startsWith(base),
  );

  if (matchedBase) {
    const allowed = PROTECTED[matchedBase];
    if (!allowed.includes(role)) {
      // Redirect to correct portal
      const url = request.nextUrl.clone();
      url.pathname = roleHome(role);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

function roleHome(role: string): string {
  if (role === "owner") return "/dashboard";
  if (role === "trainer") return "/trainer";
  return "/member";
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - public files with extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
