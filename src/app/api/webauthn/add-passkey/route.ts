import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpName = "HackPSU Auth";
const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via session cookie or Authorization header
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    const authHeader = request.headers.get("authorization");

    let decodedToken;

    if (sessionCookie) {
      // Verify session cookie
      try {
        decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
      } catch (error) {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      // Verify ID token
      const idToken = authHeader.split("Bearer ")[1];
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email not found in token" },
        { status: 400 },
      );
    }

    // Generate registration options for adding a new passkey
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userID: new TextEncoder().encode(uid),
      userDisplayName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store session data
    cookieStore.set("webauthn-challenge", options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
    });

    cookieStore.set("webauthn-user-id", uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
    });

    cookieStore.set("webauthn-flow", "registration", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
    });

    return NextResponse.json({
      ...options,
      flow: "registration",
      message: "Create a new passkey for your account",
    });
  } catch (error) {
    console.error("Error generating passkey registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate passkey registration options" },
      { status: 500 },
    );
  }
}
