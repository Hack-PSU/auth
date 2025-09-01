import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// CORS headers for HackPSU subdomains, Vercel domains, and localhost
function setCorsHeaders(response: NextResponse, origin?: string) {
  const allowedOrigins = ["https://hackpsu.org"];

  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith(".hackpsu.org") ||
      origin.endsWith(".vercel.app") ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:"));

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
    const response = NextResponse.json({ error: "No session found" }, { status: 401 });
    return setCorsHeaders(response, origin || undefined);
  }

  try {
    // Verify the session cookie
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    console.log("Session cookie verified for user:", decoded.email);

    // Get the user record to access custom claims
    const userRecord = await admin.auth().getUser(decoded.uid);
    console.log("User custom claims:", userRecord.customClaims);

    // Create custom token with role claims
    const additionalClaims = {
      // Include existing custom claims from the user record
      ...userRecord.customClaims,
      // Add role claims if they don't exist (you can set default roles here)
      production: userRecord.customClaims?.production ?? 0, // Default to Role.NONE
      staging: userRecord.customClaims?.staging ?? 0, // Default to Role.NONE
    };

    console.log("Creating custom token with claims:", additionalClaims);

    const customToken = await admin
      .auth()
      .createCustomToken(decoded.uid, additionalClaims);

    const response = NextResponse.json({ customToken });
    return setCorsHeaders(response, origin || undefined);
  } catch (error) {
    console.error("Session verification failed:", error);
    const response = NextResponse.json({ error: "Session verification failed" }, { status: 401 });
    return setCorsHeaders(response, origin || undefined);
  }
}
