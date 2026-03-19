import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import admin from "@/lib/firebaseAdmin";
import {
  rpName,
  rpID,
  setChallengeCookies,
  isValidEmail,
} from "@/lib/webauthn-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const db = admin.firestore();

    // Check if user exists in Firebase Auth
    let existingUser: admin.auth.UserRecord | null = null;
    try {
      existingUser = await admin.auth().getUserByEmail(email);
    } catch (error: unknown) {
      // Only treat auth/user-not-found as "no user". Re-throw anything else.
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code: string }).code === "auth/user-not-found"
      ) {
        existingUser = null;
      } else {
        throw error;
      }
    }

    if (existingUser) {
      const uid = existingUser.uid;

      // Check for existing WebAuthn credentials
      const credentialsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("webauthn-credentials")
        .get();

      if (!credentialsSnapshot.empty) {
        // User has credentials — generate authentication options
        const allowCredentials = credentialsSnapshot.docs.map((doc) => ({
          id: doc.data().credentialID,
          type: "public-key" as const,
          transports: doc.data().transports,
        }));

        const options = await generateAuthenticationOptions({
          rpID,
          allowCredentials,
          userVerification: "preferred",
        });

        await setChallengeCookies(options.challenge, "authentication", {
          uid,
        });

        return NextResponse.json({
          options,
          flow: "authentication",
          isNewUser: false,
        });
      } else {
        // Existing user without passkeys — they need to sign in first
        return NextResponse.json(
          {
            error:
              "Please sign in with your password first, then add a passkey from your dashboard",
            requireAuth: true,
          },
          { status: 401 },
        );
      }
    }

    // New user — generate registration options without creating the account yet.
    // The account is created only after the credential is verified successfully,
    // preventing orphaned users when someone cancels the WebAuthn prompt.
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      // Use a deterministic placeholder; the real uid is assigned on verify.
      userID: new TextEncoder().encode(email),
      userDisplayName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    await setChallengeCookies(options.challenge, "registration", { email });

    return NextResponse.json({
      options,
      flow: "registration",
      isNewUser: true,
    });
  } catch (error) {
    console.error("Error generating options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 },
    );
  }
}
