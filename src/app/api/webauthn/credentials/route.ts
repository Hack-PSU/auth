import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import admin from "@/lib/firebaseAdmin";
import { SESSION_COOKIE_NAME } from "@/lib/webauthn-server";

/**
 * Resolve the authenticated user from session cookie or Authorization header.
 */
async function resolveUser(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");

  if (sessionCookie) {
    return admin.auth().verifySessionCookie(sessionCookie);
  }
  if (authHeader?.startsWith("Bearer ")) {
    return admin.auth().verifyIdToken(authHeader.slice(7));
  }
  return null;
}

/**
 * GET — list all passkeys for the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const decoded = await resolveUser(request);
    if (!decoded) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const db = admin.firestore();
    const snapshot = await db
      .collection("users")
      .doc(decoded.uid)
      .collection("webauthn-credentials")
      .orderBy("createdAt", "desc")
      .get();

    const credentials = snapshot.docs.map((doc) => ({
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      lastUsed: doc.data().lastUsed?.toDate?.()?.toISOString() ?? null,
      transports: doc.data().transports ?? [],
    }));

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error("Error listing credentials:", error);
    return NextResponse.json(
      { error: "Failed to list passkeys" },
      { status: 500 },
    );
  }
}

/**
 * DELETE — remove a passkey by credential ID.
 * Body: { credentialId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const decoded = await resolveUser(request);
    if (!decoded) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { credentialId } = await request.json();
    if (!credentialId || typeof credentialId !== "string") {
      return NextResponse.json(
        { error: "credentialId is required" },
        { status: 400 },
      );
    }

    const db = admin.firestore();
    const credRef = db
      .collection("users")
      .doc(decoded.uid)
      .collection("webauthn-credentials")
      .doc(credentialId);

    const doc = await credRef.get();
    if (!doc.exists) {
      return NextResponse.json(
        { error: "Passkey not found" },
        { status: 404 },
      );
    }

    await credRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Failed to delete passkey" },
      { status: 500 },
    );
  }
}
