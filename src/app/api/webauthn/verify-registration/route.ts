import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";
const expectedOrigin =
  process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("webauthn-user-id")?.value;

    if (!uid) {
      return NextResponse.json(
        { error: "No registration session found" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { credential } = body;

    const expectedChallenge = cookieStore.get("webauthn-challenge")?.value;

    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 400 },
      );
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;

      // Store the credential in Firestore
      const db = admin.firestore();
      const credentialDoc = {
        credentialID: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: credential.transports || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db
        .collection("users")
        .doc(uid)
        .collection("webauthn-credentials")
        .doc(credential.id)
        .set(credentialDoc);

      // Create Firebase custom token and session cookie for immediate login
      const customToken = await admin.auth().createCustomToken(uid);
      const sessionCookie = await admin
        .auth()
        .createSessionCookie(customToken, {
          expiresIn: 5 * 24 * 60 * 60 * 1000, // 5 days
        });

      // Set session cookie to log the user in
      cookieStore.set("session", sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 24 * 60 * 60, // 5 days
      });

      // Clear the challenge cookies
      cookieStore.delete("webauthn-challenge");
      cookieStore.delete("webauthn-user-id");

      return NextResponse.json({ verified: true, authenticated: true });
    }

    return NextResponse.json({ verified: false, error: "Verification failed" });
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 },
    );
  }
}
