import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
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
  const { idToken } = await req.json();
  const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days

  try {
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });

    const cookieHeader = serialize("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn / 1000,
      path: "/",
      domain: ".hackpsu.org",
      sameSite: "strict",
    });

    const response = NextResponse.json(
      { status: "ok" },
      {
        status: 200,
        headers: { "Set-Cookie": cookieHeader },
      },
    );

    return setCorsHeaders(response, origin || undefined);
  } catch {
    const response = new NextResponse(null, { status: 500 });
    return setCorsHeaders(response, origin || undefined);
  }
}
