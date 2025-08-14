import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    // Allow all HackPSU subdomains and Vercel preview domains
    const allowedOrigins = ["https://hackpsu.org"];

    const isAllowed =
      origin &&
      (allowedOrigins.includes(origin) ||
        origin.endsWith(".hackpsu.org") ||
        origin.endsWith(".vercel.app"));

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 });

      if (isAllowed) {
        response.headers.set("Access-Control-Allow-Origin", origin);
      }

      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Max-Age", "86400");

      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
