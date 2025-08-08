import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";

const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Get user's credentials from Firestore
    const db = admin.firestore();

    // Find user by email using Firebase Auth
    let uid: string;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch (error) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's WebAuthn credentials
    const credentialsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("webauthn-credentials")
      .get();

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
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 },
    );
  }
}
