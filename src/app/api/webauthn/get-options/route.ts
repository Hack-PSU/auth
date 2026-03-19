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

    // --- Discoverable credential flow (no email) ---
    // Returns auth options with empty allowCredentials so the browser
    // shows all saved passkeys for this RP. The user picks one.
    if (!email) {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: [],
        userVerification: "preferred",
      });

      await setChallengeCookies(options.challenge, "authentication", {});

      return NextResponse.json({
        options,
        flow: "authentication",
        isNewUser: false,
      });
    }

    // --- Email-based flow ---
    if (typeof email !== "string" || !isValidEmail(email)) {
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

      const credentialsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("webauthn-credentials")
        .get();

      if (!credentialsSnapshot.empty) {
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

    // New user — registration
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userID: new TextEncoder().encode(email),
      userDisplayName: email,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "required",
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
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate authentication options: ${message}` },
      { status: 500 },
    );
  }
}
