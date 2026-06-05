import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/cookie-names";

/**
 * Entrega el access token para el handshake WebSocket (?token=) sin persistir JWT en localStorage.
 * Solo mismo origen; el token sigue en cookie httpOnly hasta este GET.
 */
export async function GET(request: NextRequest) {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({ token: access });
}
