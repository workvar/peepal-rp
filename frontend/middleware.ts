import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Server-side route protection. The session lives in httpOnly cookies set by
// the backend; here we only check presence and expiry (no signature secret
// in the frontend). Real authorization is enforced by the backend on every
// API call; this guard exists to stop protected layouts from rendering for
// anonymous visitors.

const AUTH_COOKIE = "peepal_token";
// The refresh cookie outlives the access token by weeks. Its presence is what
// tells a returning visitor apart from an anonymous one: the access token has
// almost certainly expired since they last had the tab open, and the page can
// silently exchange the refresh cookie for a new one once it loads. Bouncing
// them to /login on an expired access token alone would log everyone out every
// few minutes.
const REFRESH_COOKIE = "peepal_refresh";

// Top-level paths that never require a session.
const PUBLIC_PATHS = new Set([
  "",
  "login",
  "about",
  "mission",
  "inspiration",
  "privacy",
  "terms",
  "modules",
  "brochure",
  "dev",
]);

// Returns true when the JWT payload is parseable and not expired.
// This is a UX check only; the backend verifies the signature.
function tokenLooksValid(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { exp?: number };
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const second = segments[1] ?? "";

  // Public marketing/legal pages and the landing page.
  if (PUBLIC_PATHS.has(first)) {
    return NextResponse.next();
  }

  // Login pages are always public: /super/login and /{tenant}/login.
  if (second === "login") {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
  // A renewable session counts as authenticated here. The backend still
  // rejects every API call until the page actually refreshes the token, so
  // this only decides whether the layout gets to render.
  const authenticated = (!!token && tokenLooksValid(token)) || !!refreshToken;
  if (authenticated) {
    return NextResponse.next();
  }

  // Anonymous visitor on a protected path: send to the right login page.
  const url = req.nextUrl.clone();
  url.pathname = first === "super" ? "/super/login" : `/${first}/login`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, static assets, and the API proxy.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
