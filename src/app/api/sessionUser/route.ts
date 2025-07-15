import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("__session")?.value;
  if (!cookie) return NextResponse.redirect("https://auth.hackpsu.org");
  try {
    const decoded = await admin.auth().verifySessionCookie(cookie, true);
    const customToken = await admin.auth().createCustomToken(decoded.uid);
    return NextResponse.json({ customToken });
  } catch {
    return NextResponse.redirect("https://auth.hackpsu.org");
  }
}
