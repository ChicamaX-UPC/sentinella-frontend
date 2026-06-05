import { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/server/cookie-names";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ message: "Cuerpo invalido" }, { status: 400 });
    }

    const upstream = await fetch(`${getSentinellaGatewayRestPrefix()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email: body.email, password: body.password }),
      cache: "no-store",
    });

    const text = await upstream.text();
    const trimmed = text.trim();

    /* 401/403 a veces vienen sin cuerpo: no hay JSON que parsear. */
    if (!upstream.ok && !trimmed) {
      const msg =
        upstream.status === 401
          ? "Credenciales invalidas"
          : upstream.status === 403
            ? "Acceso denegado"
            : `Error HTTP ${upstream.status}`;
      return NextResponse.json({ message: msg }, { status: upstream.status });
    }

    let data: Record<string, unknown> = {};
    try {
      if (trimmed) {
        data = JSON.parse(trimmed) as Record<string, unknown>;
      }
    } catch {
      if (!upstream.ok) {
        const fallback = trimmed.slice(0, 300) || `Error HTTP ${upstream.status}`;
        return NextResponse.json({ message: fallback }, { status: upstream.status });
      }
      const dev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          message:
            "Respuesta invalida del API (no es JSON). Comprueba SENTINELLA_API_URL (gateway :8080 o IAM :8081).",
          ...(dev && { preview: text.slice(0, 280), upstreamStatus: upstream.status }),
        },
        { status: 502 }
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(data, { status: upstream.status });
    }

    const token = data.token as string | undefined;
    const refreshToken = data.refreshToken as string | undefined;
    const expiresIn = typeof data.expiresIn === "number" ? data.expiresIn : 900;
    const user = data.user;

    if (!token || !refreshToken) {
      const dev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          message: "Respuesta de login incompleta (faltan token o refreshToken).",
          ...(dev && { receivedKeys: Object.keys(data) }),
        },
        { status: 502 }
      );
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
  } catch (err) {
    const dev = process.env.NODE_ENV === "development";
    const detail = dev && err instanceof Error ? err.message : undefined;
    return NextResponse.json(
      {
        message:
          "No se pudo conectar con el API. ¿Está el gateway en el puerto 8080? Prueba SENTINELLA_API_URL=http://127.0.0.1:8080",
        ...(dev && { apiTarget: getSentinellaGatewayRestPrefix(), detail }),
      },
      { status: 502 }
    );
  }
}
