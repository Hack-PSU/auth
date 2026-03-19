import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";
import {
  rpName,
  rpID,
  webauthnCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated via session cookie or Authorization header
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");

    let decodedToken;

    if (sessionCookie) {
      try {
        decodedToken = await admin.auth().verifySessionCookie(sessionCookie);
      } catch {
        return NextResponse.json({ error: "Invalid session" }, { status: 401 });
      }
    } else if (authHeader?.startsWith("Bearer ")) {
      const idToken = authHeader.slice(7);
      try {
        decodedToken = await admin.auth().verifyIdToken(idToken);
      } catch {
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

    // Exclude existing credentials to prevent duplicate registration.
    // Non-fatal if Firestore query fails — proceed without exclusion list.
    const db = admin.firestore();
    let excludeCredentials: {
      id: string;
      transports?: AuthenticatorTransport[];
    }[] = [];
    try {
      const credentialsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("webauthn-credentials")
        .get();

      excludeCredentials = credentialsSnapshot.docs.map((doc) => ({
        id: doc.data().credentialID,
        transports: doc.data().transports as AuthenticatorTransport[],
      }));
    } catch (err) {
      console.warn("Could not fetch existing credentials for exclusion:", err);
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userID: new TextEncoder().encode(uid),
      userDisplayName: email,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // Store challenge cookies — uid is known since user is authenticated
    const opts = webauthnCookieOptions();
    cookieStore.set("webauthn-challenge", options.challenge, opts);
    cookieStore.set("webauthn-user-id", uid, opts);
    cookieStore.set("webauthn-flow", "registration", opts);

    return NextResponse.json({
      options,
      flow: "registration",
    });
  } catch (error) {
    console.error("Error generating passkey registration options:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate passkey registration options: ${message}` },
      { status: 500 },
    );
  }
}
