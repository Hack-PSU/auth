import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    console.log(`[CORS] ${request.method} ${request.nextUrl.pathname} from origin: ${origin}`);

    // Allow HackPSU domains, Vercel domains, and localhost for development
    const allowedOrigins = ["https://hackpsu.org"];

    const isAllowed =
      origin &&
      (allowedOrigins.includes(origin) ||
        origin.endsWith(".hackpsu.org") ||
        origin.endsWith(".vercel.app") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:"));

    console.log(`[CORS] Origin allowed: ${isAllowed}`);

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

    // For non-preflight requests, continue to the API route but set CORS headers
    const response = NextResponse.next();
    
    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
