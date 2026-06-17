import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Already has any supported lang prefix — pass through unchanged
  const firstSegment = pathname.split("/")[1];
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(firstSegment)) {
    return NextResponse.next();
  }

  // No lang prefix: rewrite to /en/... without changing the browser URL.
  // English is the default language served at bare paths (/, /privacy, etc.).
  const url = request.nextUrl.clone();
  url.pathname = `/en${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
