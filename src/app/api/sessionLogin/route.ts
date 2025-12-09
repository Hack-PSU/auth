import { type NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import {
  setCorsHeaders,
  createSessionCookie,
  SESSION_DURATION_MS,
  shouldUseCookieAuth,
} from "@/lib/auth-utils";

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  const response = new NextResponse(null, { status: 200 });
  return setCorsHeaders(response, origin);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const { idToken } = await req.json();

    if (!idToken) {
      const response = NextResponse.json(
        { error: "idToken is required" },
        { status: 400 },
      );
      return setCorsHeaders(response, origin);
    }

    // Create Firebase session cookie
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn: SESSION_DURATION_MS });

    const useCookies = shouldUseCookieAuth(origin);
    const cookieHeader = createSessionCookie(sessionCookie, origin);

    // Response payload
    const responseData: { status: string; token?: string } = {
      status: "ok",
    };

    // For staging/local, return the session cookie as a token
    // so the client can store it and send via Authorization header
    if (!useCookies) {
      responseData.token = sessionCookie;
    }

    const response = NextResponse.json(responseData, {
      status: 200,
      headers: { "Set-Cookie": cookieHeader },
    });

    return setCorsHeaders(response, origin);
  } catch (error) {
    console.error("Session login error:", error);
    const response = NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
    return setCorsHeaders(response, origin);
  }
}
