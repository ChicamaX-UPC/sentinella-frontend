import { NextResponse } from "next/server";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string") {
    return NextResponse.json({ message: "Cuerpo invalido" }, { status: 400 });
  }

  const upstream = await fetch(`${getSentinellaGatewayRestPrefix()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email }),
  });

  const text = await upstream.text();
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ message: text || "Error del servidor" }, { status: upstream.status });
  }
}
