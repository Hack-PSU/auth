import { NextResponse } from "next/server";
import { serialize, type SerializeOptions } from "cookie";

/**
 * Environment detection based on origin
 */
export type Environment = "production" | "staging" | "local";

export function getEnvironmentFromOrigin(origin: string | null): Environment {
  if (!origin) return "local";

  // Production: *.hackpsu.org domains
  if (origin.endsWith(".hackpsu.org") || origin === "https://hackpsu.org") {
    return "production";
  }

  // Staging: *.vercel.app domains
  if (origin.endsWith(".vercel.app")) {
    return "staging";
  }

  // Everything else is local (localhost, 127.0.0.1, custom domains)
  return "local";
}

/**
 * Validates if an origin is allowed for CORS
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Production domains
  if (origin === "https://hackpsu.org" || origin.endsWith(".hackpsu.org")) {
    return true;
  }

  // Staging domains (all Vercel deployments)
  if (origin.endsWith(".vercel.app")) {
    return true;
  }

  // Local development (any protocol, any port)
  if (
    origin.startsWith("http://localhost") ||
    origin.startsWith("https://localhost") ||
    origin.startsWith("http://127.0.0.1") ||
    origin.startsWith("https://127.0.0.1")
  ) {
    return true;
  }

  return false;
}

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
): Pick<SerializeOptions, "domain" | "secure" | "sameSite"> {
  const env = getEnvironmentFromOrigin(origin);

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
 * Determines if we should use cookie-based or token-based auth
 */
export function shouldUseCookieAuth(origin: string | null): boolean {
  return getEnvironmentFromOrigin(origin) === "production";
}

/**
 * Creates a session cookie header
 */
export function createSessionCookie(
  sessionToken: string,
  origin: string | null,
): string {
  const cookieConfig = getCookieConfig(origin);

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

/**
 * Extracts returnTo URL from request and appends auth token for staging/local
 */
export function buildReturnUrl(
  returnTo: string | null,
  token: string,
  origin: string | null,
): string {
  if (!returnTo) return "/";

  // For production, cookies work, so no need to pass token
  if (shouldUseCookieAuth(origin)) {
    return returnTo;
  }

  // For staging/local, append token to URL
  try {
    const url = new URL(returnTo);
    url.searchParams.set("authToken", token);
    return url.toString();
  } catch {
    // If returnTo is not a valid URL, return as-is
    return returnTo;
  }
}
