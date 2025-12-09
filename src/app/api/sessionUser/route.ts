import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { setCorsHeaders, SESSION_COOKIE_NAME } from "@/lib/auth-utils";

// Handle preflight OPTIONS request
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, origin || undefined);
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");

  // Try to get session token from cookie first, then Authorization header
  let sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  // If no cookie, check Authorization header (for staging/local environments)
  if (!sessionToken) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      sessionToken = authHeader.substring(7);
    }
  }

  if (!sessionToken) {
    const response = NextResponse.json(
      { error: "No session found" },
      { status: 401 },
    );
    return setCorsHeaders(response, origin);
  }

  try {
    // Verify the session cookie/token
    const decoded = await admin.auth().verifySessionCookie(sessionToken, true);

    // Get the user record to access custom claims
    const userRecord = await admin.auth().getUser(decoded.uid);

    // Create custom token with role claims
    const additionalClaims = {
      // Include existing custom claims from the user record
      ...userRecord.customClaims,
      claims: {
        // Add role claims if they don't exist
        production: userRecord.customClaims?.production ?? 0, // Default to Role.NONE
        staging: userRecord.customClaims?.staging ?? 0, // Default to Role.NONE
      },
    };

    const customToken = await admin
      .auth()
      .createCustomToken(decoded.uid, additionalClaims);

    const response = NextResponse.json({ customToken });
    return setCorsHeaders(response, origin);
  } catch (error) {
    console.error("Session verification failed:", error);
    const response = NextResponse.json(
      { error: "Session verification failed" },
      { status: 401 },
    );
    return setCorsHeaders(response, origin);
  }
}
