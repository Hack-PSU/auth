import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import {
  setCorsHeaders,
  createLogoutCookies,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-utils";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Try to get session token from cookie or Authorization header
  let sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      sessionToken = authHeader.substring(7);
    }
  }

  // If there's a valid session, revoke it on Firebase Admin
  if (sessionToken) {
    try {
      const decodedClaims = await admin
        .auth()
        .verifySessionCookie(sessionToken, true);
      await admin.auth().revokeRefreshTokens(decodedClaims.uid);
    } catch (error) {
      console.log("Session token already invalid or expired");
    }
  }

  // Create cookie deletion headers
  const deleteCookieHeaders = createLogoutCookies(origin);

  const response = NextResponse.json(
    { logout: true, message: "Session cleared successfully" },
    { status: 200 },
  );

  // Append all cookie deletion headers
  deleteCookieHeaders.forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });

  return setCorsHeaders(response, origin);
}
