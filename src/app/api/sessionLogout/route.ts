import { type NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";

// CORS headers for HackPSU subdomains
function setCorsHeaders(response: NextResponse, origin?: string) {
  const allowedOrigins = ["https://hackpsu.org"];

  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) || origin.endsWith(".hackpsu.org"));

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, origin || undefined);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  const cookieHeader = serialize("__session", "", {
    maxAge: 0,
    path: "/",
    domain: ".hackpsu.org",
  });

  const response = NextResponse.json(
    { logout: true },
    {
      status: 200,
      headers: { "Set-Cookie": cookieHeader },
    },
  );

  return setCorsHeaders(response, origin || undefined);
}
