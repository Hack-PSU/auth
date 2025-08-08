import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";
const expectedOrigin =
  process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn-challenge")?.value;
    const uid = cookieStore.get("webauthn-user-id")?.value;

    if (!expectedChallenge || !uid) {
      return NextResponse.json(
        { error: "Challenge or user ID not found" },
        { status: 400 },
      );
    }

    const db = admin.firestore();

    // Get the credential from Firestore
    const credentialDoc = await db
      .collection("users")
      .doc(uid)
      .collection("webauthn-credentials")
      .doc(credential.id)
      .get();

    if (!credentialDoc.exists) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 },
      );
    }

    const storedCredential = credentialDoc.data()!;

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: storedCredential.credentialID,
        publicKey: Buffer.from(storedCredential.publicKey, "base64"),
        counter: storedCredential.counter,
      },
      requireUserVerification: false,
    });

    if (verification.verified) {
      // Update the counter
      await credentialDoc.ref.update({
        counter: verification.authenticationInfo.newCounter,
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create Firebase custom token and then session cookie
      const customToken = await admin.auth().createCustomToken(uid);
      const sessionCookie = await admin
        .auth()
        .createSessionCookie(customToken, {
          expiresIn: 5 * 24 * 60 * 60 * 1000, // 5 days
        });

      // Set session cookie
      cookieStore.set("session", sessionCookie, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 5 * 24 * 60 * 60, // 5 days
      });

      // Clear challenge cookies
      cookieStore.delete("webauthn-challenge");
      cookieStore.delete("webauthn-user-id");

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({
      verified: false,
      error: "Authentication failed",
    });
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 },
    );
  }
}
