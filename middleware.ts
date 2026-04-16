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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

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
  const role =
    (user.user_metadata?.role as string) ??
    deriveRoleFromEmail(user.email ?? "");

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

// Fallback: derive role from email for existing demo users
// (until user_metadata.role is set via Supabase Dashboard)
function deriveRoleFromEmail(email: string): string {
  if (email === "pradeep@bodyline.in") return "owner";
  if (
    ["karthik@bodyline.in", "divya@bodyline.in", "suresh@bodyline.in"].includes(
      email,
    )
  )
    return "trainer";
  return "member";
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
