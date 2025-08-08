import { NextRequest, NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";
const expectedOrigin =
  process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get("webauthn-user-id")?.value;
    const expectedChallenge = cookieStore.get("webauthn-challenge")?.value;
    const flow = cookieStore.get("webauthn-flow")?.value;

    if (!uid || !expectedChallenge || !flow) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { credential } = body;

    let verification;

    if (flow === "registration") {
      // Handle registration verification
      verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (verification.verified && verification.registrationInfo) {
        const { credential: credInfo } = verification.registrationInfo;

        // Store the credential in Firestore
        const db = admin.firestore();
        const credentialDoc = {
          credentialID: credInfo.id,
          publicKey: Buffer.from(credInfo.publicKey).toString("base64"),
          counter: credInfo.counter,
          transports: credInfo.transports || [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db
          .collection("users")
          .doc(uid)
          .collection("webauthn-credentials")
          .doc(credInfo.id)
          .set(credentialDoc);
      }
    } else {
      // Handle authentication verification
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

      verification = await verifyAuthenticationResponse({
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

      if (verification.verified && verification.authenticationInfo) {
        // Update the counter
        await credentialDoc.ref.update({
          counter: verification.authenticationInfo.newCounter,
          lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    if (verification.verified) {
      // Create Firebase custom token for client-side authentication
      const customToken = await admin.auth().createCustomToken(uid);

      // Clear challenge cookies
      cookieStore.delete("webauthn-challenge");
      cookieStore.delete("webauthn-user-id");
      cookieStore.delete("webauthn-flow");

      return NextResponse.json({
        verified: true,
        flow,
        customToken,
        message:
          flow === "registration"
            ? "Account created and signed in successfully!"
            : "Signed in successfully!",
      });
    }

    return NextResponse.json({ verified: false, error: "Verification failed" });
  } catch (error) {
    console.error("Error verifying credential:", error);
    return NextResponse.json(
      { error: "Failed to verify credential" },
      { status: 500 },
    );
  }
}
