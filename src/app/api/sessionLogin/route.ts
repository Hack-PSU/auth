import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { serialize } from "cookie";

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
  try {
    const sessionCookie = await admin
      .auth()
      .createSessionCookie(idToken, { expiresIn });

    const cookieHeader = serialize("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn / 1000,
      path: "/",
      domain: ".hackpsu.org",
      sameSite: "strict",
    });

    return NextResponse.json(
      { status: "ok" },
      {
        status: 200,
        headers: { "Set-Cookie": cookieHeader },
      },
    );
  } catch {
    return NextResponse.error();
  }
}
