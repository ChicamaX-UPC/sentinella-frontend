import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/cookie-names";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

export async function POST(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ACCESS_COOKIE);
  res.cookies.delete(REFRESH_COOKIE);

  if (access) {
    await fetch(`${getSentinellaGatewayRestPrefix()}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
    }).catch(() => undefined);
  }
  return res;
}
