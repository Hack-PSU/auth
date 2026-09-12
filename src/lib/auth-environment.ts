/**
 * Environment and redirect resolution.
 *
 * Kept free of Next imports so the rules can be tested directly; they are
 * security relevant and easy to get subtly wrong.
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
 * Where the session will actually be used.
 *
 * The login page is served from auth.hackpsu.org, so when it posts to this
 * server's own API the Origin header always reads as production, even when the
 * user is on their way back to localhost. Deciding the environment from that
 * Origin is what left local developers with a cookie they cannot read and no
 * token, so this resolves against returnTo first and falls back to Origin when
 * there is no redirect target.
 */
export function getEnvironmentForSession(
  origin: string | null,
  returnTo: string | null,
): Environment {
  if (!returnTo) return getEnvironmentFromOrigin(origin);

  // returnTo is a full URL; getEnvironmentFromOrigin compares against a bare
  // origin, so a path would make every destination look local.
  try {
    return getEnvironmentFromOrigin(new URL(returnTo).origin);
  } catch {
    // A relative returnTo stays on whichever origin asked.
    return getEnvironmentFromOrigin(origin);
  }
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
 * Determines if we should use cookie-based or token-based auth.
 *
 * Pass returnTo whenever the caller knows it: a session bound for localhost
 * cannot use a cookie scoped to .hackpsu.org, regardless of which origin asked
 * for it.
 */
export function shouldUseCookieAuth(
  origin: string | null,
  returnTo: string | null = null,
): boolean {
  return getEnvironmentForSession(origin, returnTo) === "production";
}

/**
 * Resolves a redirect target to something safe to send a session token to.
 *
 * returnTo arrives as an untrusted query parameter. Without this check anyone
 * could link to /login?returnTo=https://example.com and be handed a valid
 * session token by buildReturnUrl.
 */
export function resolveReturnTo(returnTo: string | null): string {
  const fallback = "https://hackpsu.org";
  if (!returnTo) return fallback;

  try {
    const url = new URL(returnTo);
    return isOriginAllowed(url.origin) ? returnTo : fallback;
  } catch {
    // Relative paths stay on the auth server and are safe.
    return returnTo.startsWith("/") ? returnTo : fallback;
  }
}

/**
 * Extracts returnTo URL from request and appends auth token for staging/local
 */
export function buildReturnUrl(
  returnTo: string | null,
  token: string,
  origin: string | null,
): string {
  const safeReturnTo = resolveReturnTo(returnTo);

  // For production, cookies work, so no need to pass token
  if (shouldUseCookieAuth(origin, safeReturnTo)) {
    return safeReturnTo;
  }

  // For staging/local, append token to URL
  try {
    const url = new URL(safeReturnTo);
    url.searchParams.set("authToken", token);
    return url.toString();
  } catch {
    // A relative path cannot carry the token, but it also never leaves this
    // origin, where the cookie already works.
    return safeReturnTo;
  }
}
