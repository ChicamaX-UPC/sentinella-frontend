import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/cookie-names";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    typeof body.fullName !== "string" ||
    typeof body.companyName !== "string"
  ) {
    return NextResponse.json({ message: "Cuerpo invalido" }, { status: 400 });
  }

  const upstream = await fetch(`${getSentinellaGatewayRestPrefix()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      companyName: body.companyName,
    }),
  });

  const text = await upstream.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Respuesta invalida del API" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data.token as string | undefined;
  const refreshToken = data.refreshToken as string | undefined;
  const expiresIn = typeof data.expiresIn === "number" ? data.expiresIn : 900;
  const user = data.user;

  if (!token || !refreshToken) {
    return NextResponse.json({ message: "Respuesta de registro incompleta" }, { status: 502 });
  }

  const res = NextResponse.json({ user, expiresIn });
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn,
    secure: process.env.NODE_ENV === "production",
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
