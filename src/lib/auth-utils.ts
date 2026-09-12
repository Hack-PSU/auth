import { NextResponse } from "next/server";
import { serialize, type SerializeOptions } from "cookie";
import {
  getEnvironmentForSession,
  isOriginAllowed,
  shouldUseCookieAuth,
} from "./auth-environment";

// Re-exported so existing importers keep working.
export {
  getEnvironmentFromOrigin,
  getEnvironmentForSession,
  isOriginAllowed,
  shouldUseCookieAuth,
  resolveReturnTo,
  buildReturnUrl,
} from "./auth-environment";
export type { Environment } from "./auth-environment";

/**
 * Environment detection based on origin
 */
/**
 * Sets CORS headers on a response for cross-origin requests
 */
export function setCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  if (origin && isOriginAllowed(origin)) {
    // Must set specific origin (not *) when using credentials
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin"); // Important for caching
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

/**
 * Cookie and session configuration constants
 */
export const SESSION_COOKIE_NAME = "__session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

/**
 * Gets cookie configuration based on environment
 *
 * Key insight:
 * - Production: Uses cookies with domain .hackpsu.org and sameSite: "none"
 * - Staging/Local: Cookies won't work across different deployments,
 *   so we'll use URL-based token passing + Authorization headers
 */
export function getCookieConfig(
  origin: string | null,
  returnTo: string | null = null,
): Pick<SerializeOptions, "domain" | "secure" | "sameSite"> {
  const env = getEnvironmentForSession(origin, returnTo);

  switch (env) {
    case "production":
      // For *.hackpsu.org: Share cookies across all subdomains
      return {
        domain: ".hackpsu.org",
        secure: true,
        sameSite: "none", // Required for cross-subdomain in modern browsers
      };

    case "staging":
    case "local":
      // For Vercel and local: Don't try to share cookies
      // We'll use token-based auth instead (via URL redirect)
      return {
        domain: undefined,
        secure: env === "staging", // Secure for Vercel, not for localhost
        sameSite: "lax", // Lax since we're not sharing across domains
      };
  }
}

/**
 * Creates a session cookie header
 */
export function createSessionCookie(
  sessionToken: string,
  origin: string | null,
  returnTo: string | null = null,
): string {
  const cookieConfig = getCookieConfig(origin, returnTo);

  return serialize(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
    ...cookieConfig,
  });
}

/**
 * Creates cookie deletion headers for logout
 */
export function createLogoutCookies(origin: string | null): string[] {
  const cookieConfig = getCookieConfig(origin);
  const deleteCookies: string[] = [];

  // Delete with domain specified (for production)
  if (cookieConfig.domain) {
    deleteCookies.push(
      serialize(SESSION_COOKIE_NAME, "", {
        maxAge: -1,
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        ...cookieConfig,
      }),
    );
  }

  // Delete without domain (fallback and for staging/local)
  deleteCookies.push(
    serialize(SESSION_COOKIE_NAME, "", {
      maxAge: -1,
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    }),
  );

  // Logout flag cookie
  deleteCookies.push(
    serialize("__logout", "true", {
      maxAge: 30, // 30 seconds
      path: "/",
      httpOnly: true,
      domain: cookieConfig.domain,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite,
    }),
  );

  return deleteCookies;
}

