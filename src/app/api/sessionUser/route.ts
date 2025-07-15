import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// CORS headers for HackPSU subdomains
function setCorsHeaders(response: NextResponse, origin?: string) {
  // Allow all HackPSU subdomains
  const allowedOrigins = ["https://hackpsu.org"];

  // Check if origin is allowed or allow all hackpsu.org subdomains
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
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}

// Handle preflight OPTIONS request
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, origin || undefined);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cookie = req.cookies.get("__session")?.value;

  if (!cookie) {
    const response = NextResponse.redirect("https://auth.hackpsu.org");
    return setCorsHeaders(response, origin || undefined);
  }

  try {
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    const customToken = await admin.auth().createCustomToken(decoded.uid);

    const response = NextResponse.json({ customToken });
    return setCorsHeaders(response, origin || undefined);
  } catch {
    const response = NextResponse.redirect("https://auth.hackpsu.org");
    return setCorsHeaders(response, origin || undefined);
  }
}
