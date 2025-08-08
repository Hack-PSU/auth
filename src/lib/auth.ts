import { NextRequest } from "next/server";
import admin from "./firebaseAdmin";
import { cookies } from "next/headers";

export async function verifyAuth(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (!sessionCookie) {
      throw new Error("No session cookie");
    }

    const decodedClaims = await admin
      .auth()
      .verifySessionCookie(sessionCookie, true);

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    console.error("Auth verification failed:", error);
    throw new Error("Unauthorized");
  }
}
