import { NextRequest, NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpName = "HackPSU Auth";
const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const db = admin.firestore();
    let uid: string;
    let userExists = false;
    let isNewUser = false;

    // Check if user exists in Firebase Auth
    try {
      const existingUser = await admin.auth().getUserByEmail(email);
      uid = existingUser.uid;
      userExists = true;

      // Check for existing WebAuthn credentials
      const credentialsSnapshot = await db
        .collection("users")
        .doc(uid)
        .collection("webauthn-credentials")
        .get();

      const hasCredentials = !credentialsSnapshot.empty;

      if (hasCredentials) {
        // User has credentials, generate authentication options
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

        // Store session data for authentication
        const cookieStore = await cookies();
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

        cookieStore.set("webauthn-flow", "authentication", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 300, // 5 minutes
        });

        return NextResponse.json({
          ...options,
          flow: "authentication",
          isNewUser: false,
          message: "Use your passkey to sign in",
        });
      } else {
        // Existing user without passkeys - they need to sign in first
        return NextResponse.json(
          {
            error:
              "Please sign in with your password first, then add a passkey from your dashboard",
            requireAuth: true,
          },
          { status: 401 },
        );
      }
    } catch (error) {
      // User doesn't exist - allow new user registration with passkey
      const newUser = await admin.auth().createUser({
        email,
        displayName: email,
        emailVerified: true, // For passkey users, we consider them verified
      });
      uid = newUser.uid;
      isNewUser = true;

      // Generate registration options for new user
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

      // Store session data for registration
      const cookieStore = await cookies();
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
        isNewUser: true,
        message: "Create your first passkey to get started",
      });
    }
  } catch (error) {
    console.error("Error generating options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 },
    );
  }
}
