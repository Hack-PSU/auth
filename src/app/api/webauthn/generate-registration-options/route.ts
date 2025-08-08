import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpName = "HackPSU Auth";
const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, displayName } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user already exists, if not create them
    let uid: string;
    let userDisplayName = displayName || email;

    try {
      // Try to get existing user
      const existingUser = await admin.auth().getUserByEmail(email);
      uid = existingUser.uid;
      userDisplayName = existingUser.displayName || email;
    } catch (error) {
      // User doesn't exist, create them
      const newUser = await admin.auth().createUser({
        email,
        displayName: userDisplayName,
        emailVerified: true, // Since they're using passkeys, we can trust the email
      });
      uid = newUser.uid;
    }

    // Check if user already has WebAuthn credentials
    const db = admin.firestore();
    const credentialsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("webauthn-credentials")
      .get();

    const excludeCredentials = credentialsSnapshot.docs.map((doc) => ({
      id: doc.data().credentialID,
      type: "public-key" as const,
      transports: doc.data().transports,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: email,
      userID: new TextEncoder().encode(uid),
      userDisplayName,
      attestationType: "none",
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

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

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 },
    );
  }
}
