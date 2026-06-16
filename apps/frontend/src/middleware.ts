import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Skip non-page assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Already has a supported lang prefix
  const firstSegment = pathname.split("/")[1];
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(firstSegment)) {
    return NextResponse.next();
  }

  // Detect preferred language from Accept-Language header
  const acceptLang = request.headers.get("accept-language") ?? "";
  const preferred = acceptLang
    .split(",")
    .map((s) => s.split(";")[0].trim().split("-")[0].toLowerCase())
    .find((code) => (SUPPORTED_LANGUAGES as readonly string[]).includes(code));

  const lang = preferred ?? "en";
  const url = request.nextUrl.clone();
  url.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
