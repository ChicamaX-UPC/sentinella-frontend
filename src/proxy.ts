import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "st_access";

const AUTH_LOGIN = "/login";
const AUTH_FORGOT = "/forgot-password";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/backend") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  if (pathname === AUTH_LOGIN || pathname === AUTH_FORGOT || pathname === "/register") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE);

  if (pathname === "/") {
    const target = token ? "/dashboard" : AUTH_LOGIN;
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (!token) {
    const login = new URL(AUTH_LOGIN, request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/monitoring/:path*",
    "/alerts/:path*",
    "/inspections/:path*",
    "/reports/:path*",
    "/digital-twin",
    "/digital-twin/:path*",
    "/simulations",
    "/simulations/:path*",
    "/register",
    "/admin/:path*",
    "/profile",
    "/mobile",
    "/mobile/:path*",
  ],
};
