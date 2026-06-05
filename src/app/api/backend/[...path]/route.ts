import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/cookie-names";
import { getSentinellaGatewayRestPrefix } from "@/lib/server/api-origin";

type Ctx = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, ctx: Ctx) {
  try {
    const { path } = await ctx.params;
    const suffix = path.join("/");
    const url = new URL(request.url);
    const target = `${getSentinellaGatewayRestPrefix()}/${suffix}${url.search}`;

    const access = request.cookies.get(ACCESS_COOKIE)?.value;
    if (!access) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const headers = new Headers();
    headers.set("Authorization", `Bearer ${access}`);
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
    const trace = request.headers.get("x-trace-id");
    if (trace) {
      headers.set("X-Trace-Id", trace);
    }

    const method = request.method.toUpperCase();
    const hasBody = !["GET", "HEAD"].includes(method);
    const upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });

    const resHeaders = new Headers();
    const passContentType = upstream.headers.get("content-type");
    if (passContentType) {
      resHeaders.set("Content-Type", passContentType);
    }
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) {
      resHeaders.set("Content-Disposition", contentDisposition);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    });
  } catch {
    return NextResponse.json({ message: "No se pudo conectar con el API" }, { status: 502 });
  }
}

export async function GET(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function POST(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function PUT(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function PATCH(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
export async function DELETE(request: NextRequest, ctx: Ctx) {
  return forward(request, ctx);
}
