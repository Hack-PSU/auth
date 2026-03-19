import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";
import {
  rpID,
  getExpectedOrigins,
  clearChallengeCookies,
} from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();

  try {
    const expectedChallenge = cookieStore.get("webauthn-challenge")?.value;
    const flow = cookieStore.get("webauthn-flow")?.value;
    const uid = cookieStore.get("webauthn-user-id")?.value;
    const email = cookieStore.get("webauthn-email")?.value;

    if (!expectedChallenge || !flow) {
      return NextResponse.json(
        { error: "No pending WebAuthn session. Please try again." },
        { status: 401 },
      );
    }

    // Registration needs either uid (add-passkey) or email (new user).
    // Authentication always needs uid.
    if (flow === "authentication" && !uid) {
      return NextResponse.json(
        { error: "Invalid session state" },
        { status: 401 },
      );
    }
    if (flow === "registration" && !uid && !email) {
      return NextResponse.json(
        { error: "Invalid session state" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { credential } = body;

    if (!credential) {
      return NextResponse.json(
        { error: "Credential is required" },
        { status: 400 },
      );
    }

    const expectedOrigin = getExpectedOrigins();
    const db = admin.firestore();

    if (flow === "registration") {
      // --- Registration verification ---
      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (!verification.verified || !verification.registrationInfo) {
        clearChallengeCookies(cookieStore);
        return NextResponse.json(
          { verified: false, error: "Registration verification failed" },
          { status: 400 },
        );
      }

      const { credential: credInfo } = verification.registrationInfo;

      // Determine the user id — either existing (add-passkey) or create new.
      let resolvedUid = uid;
      if (!resolvedUid && email) {
        // New user — create the Firebase account now that registration succeeded.
        const newUser = await admin.auth().createUser({
          email,
          displayName: email,
          emailVerified: true,
        });
        resolvedUid = newUser.uid;
      }

      if (!resolvedUid) {
        clearChallengeCookies(cookieStore);
        return NextResponse.json(
          { error: "Could not resolve user" },
          { status: 500 },
        );
      }

      // Store the credential in Firestore
      await db
        .collection("users")
        .doc(resolvedUid)
        .collection("webauthn-credentials")
        .doc(credInfo.id)
        .set({
          credentialID: credInfo.id,
          publicKey: Buffer.from(credInfo.publicKey).toString("base64"),
          counter: credInfo.counter,
          transports: credInfo.transports || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        });

      const customToken = await admin.auth().createCustomToken(resolvedUid);
      clearChallengeCookies(cookieStore);

      return NextResponse.json({
        verified: true,
        flow: "registration",
        customToken,
        message: uid
          ? "Passkey added successfully!"
          : "Account created and signed in!",
      });
    }

    // --- Authentication verification ---
    if (!uid) {
      clearChallengeCookies(cookieStore);
      return NextResponse.json(
        { error: "Invalid session state" },
        { status: 401 },
      );
    }

    const credentialDoc = await db
      .collection("users")
      .doc(uid)
      .collection("webauthn-credentials")
      .doc(credential.id)
      .get();

    if (!credentialDoc.exists) {
      clearChallengeCookies(cookieStore);
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

    if (!verification.verified || !verification.authenticationInfo) {
      clearChallengeCookies(cookieStore);
      return NextResponse.json(
        { verified: false, error: "Authentication verification failed" },
        { status: 400 },
      );
    }

    // Update the counter and last-used timestamp
    await credentialDoc.ref.update({
      counter: verification.authenticationInfo.newCounter,
      lastUsed: admin.firestore.FieldValue.serverTimestamp(),
    });

    const customToken = await admin.auth().createCustomToken(uid);
    clearChallengeCookies(cookieStore);

    return NextResponse.json({
      verified: true,
      flow: "authentication",
      customToken,
      message: "Signed in successfully!",
    });
  } catch (error) {
    // Always clean up cookies on unexpected errors
    clearChallengeCookies(cookieStore);
    console.error("Error verifying credential:", error);
    return NextResponse.json(
      { error: "Failed to verify credential" },
      { status: 500 },
    );
  }
}
