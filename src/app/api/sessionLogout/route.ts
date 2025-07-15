import { NextResponse } from "next/server";
import { serialize } from "cookie";

export async function POST() {
  const cookieHeader = serialize("__session", "", {
    maxAge: 0,
    path: "/",
    domain: ".hackpsu.org",
  });
  return NextResponse.json(
    { logout: true },
    {
      status: 200,
      headers: { "Set-Cookie": cookieHeader },
    },
  );
}
