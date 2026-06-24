import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "st_access";

const AUTH_LOGIN = "/login";
const AUTH_FORGOT = "/forgot-password";
const AUTH_REGISTER = "/register";

const PUBLIC_PATHS = new Set(["/", AUTH_LOGIN, AUTH_FORGOT, AUTH_REGISTER]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/backend") ||
    pathname.startsWith("/landing") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  if (PUBLIC_PATHS.has(pathname)) {
    if (token && (pathname === AUTH_LOGIN || pathname === AUTH_REGISTER)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
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
    "/login",
    "/register",
    "/forgot-password",
    "/dashboard/:path*",
    "/monitoring/:path*",
    "/alerts/:path*",
    "/inspections/:path*",
    "/reports/:path*",
    "/digital-twin",
    "/digital-twin/:path*",
    "/simulations",
    "/simulations/:path*",
    "/admin/:path*",
    "/profile",
    "/mobile",
    "/mobile/:path*",
  ],
};
