import { type NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import admin from "@/lib/firebaseAdmin";

// CORS headers for HackPSU subdomains and Vercel preview domains
function setCorsHeaders(response: NextResponse, origin?: string) {
  const allowedOrigins = ["https://hackpsu.org"];

  const isAllowed =
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith(".hackpsu.org") ||
      origin.endsWith(".vercel.app"));

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

  // Get the current session cookie to revoke it properly
  const sessionCookie = req.cookies.get("__session")?.value;

  // If there's a valid session, revoke it on Firebase Admin
  if (sessionCookie) {
    try {
      console.log("Revoking Firebase session...");
      const decodedClaims = await admin
        .auth()
        .verifySessionCookie(sessionCookie, true);
      await admin.auth().revokeRefreshTokens(decodedClaims.uid);
      console.log("Firebase session revoked for user:", decodedClaims.uid);
    } catch (error) {
      console.log("Session cookie already invalid or expired:", error);
    }
  }

  // Determine cookie domain based on origin
  const isVercelDomain = origin?.endsWith(".vercel.app");
  const cookieDomain = isVercelDomain ? undefined : ".hackpsu.org";

  // Create comprehensive cookie deletion headers
  const deleteCookieHeaders = [
    // Primary deletion - match original cookie exactly
    serialize("__session", "", {
      maxAge: -1,
      expires: new Date(0),
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }),
    // Delete on current domain (without domain specification)
    serialize("__session", "", {
      maxAge: -1,
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }),
    // Create a logout flag cookie to prevent auto re-authentication
    serialize("__logout", "true", {
      maxAge: 30, // 30 seconds should be enough
      path: "/",
      domain: cookieDomain,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }),
  ];

  console.log("Logout completed, cookies deleted and Firebase session revoked");

  const response = NextResponse.json(
    { logout: true, message: "Session cleared successfully" },
    {
      status: 200,
    },
  );
  deleteCookieHeaders.forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });

  return setCorsHeaders(response, origin || undefined);
}
