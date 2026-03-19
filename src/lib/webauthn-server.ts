import { SESSION_COOKIE_NAME } from "@/lib/auth-utils";
import { cookies } from "next/headers";

/**
 * Shared WebAuthn server configuration.
 */
export const rpName = "HackPSU Auth";
export const rpID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "localhost";

/**
 * All origins that are valid for WebAuthn ceremonies.
 * SimpleWebAuthn accepts a string[] for expectedOrigin.
 */
export function getExpectedOrigins(): string[] {
  // Allow explicit override via env var (comma-separated)
  const envOrigin = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN;
  if (envOrigin) {
    return envOrigin.split(",").map((o) => o.trim());
  }

  // Defaults for local development
  return ["http://localhost:3000"];
}

/**
 * Cookie options for WebAuthn challenge state.
 */
export function webauthnCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 300, // 5 minutes
  };
}

/**
 * Store challenge + identity in cookies for the verify step.
 */
export async function setChallengeCookies(
  challenge: string,
  flow: "registration" | "authentication",
  identity: { uid?: string; email?: string },
) {
  const cookieStore = await cookies();
  const opts = webauthnCookieOptions();

  cookieStore.set("webauthn-challenge", challenge, opts);
  cookieStore.set("webauthn-flow", flow, opts);

  // Discoverable flow: neither uid nor email is known upfront.
  // Email-based registration: only email.
  // Email-based authentication / add-passkey: uid.
  if (identity.uid) {
    cookieStore.set("webauthn-user-id", identity.uid, opts);
    cookieStore.delete("webauthn-email");
  } else if (identity.email) {
    cookieStore.set("webauthn-email", identity.email, opts);
    cookieStore.delete("webauthn-user-id");
  } else {
    // Discoverable — clear both identity cookies
    cookieStore.delete("webauthn-user-id");
    cookieStore.delete("webauthn-email");
  }
}

/**
 * Clear all challenge cookies after verification (success or failure).
 */
export function clearChallengeCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  cookieStore.delete("webauthn-challenge");
  cookieStore.delete("webauthn-user-id");
  cookieStore.delete("webauthn-email");
  cookieStore.delete("webauthn-flow");
}

/**
 * Session cookie name re-exported for convenience.
 */
export { SESSION_COOKIE_NAME };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Basic email format validation.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}
