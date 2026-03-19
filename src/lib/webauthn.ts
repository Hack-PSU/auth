"use client";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/common/config/firebase";

/**
 * Detect when the user cancelled the WebAuthn dialog vs a real error.
 */
function isUserCancellation(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "NotAllowedError" ||
    error.name === "AbortError" ||
    error.message.includes("The operation either timed out or was not allowed")
  );
}

export type WebAuthnResult = {
  success: boolean;
  error?: string;
  message?: string;
  requireAuth?: boolean;
  cancelled?: boolean;
  flow?: string;
  isNewUser?: boolean;
};

export type StoredPasskey = {
  id: string;
  createdAt: string | null;
  lastUsed: string | null;
  transports: string[];
};

export async function authenticateWithEmail(
  email: string,
): Promise<WebAuthnResult> {
  try {
    const optionsResponse = await fetch("/api/webauthn/get-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await optionsResponse.json();

    if (!optionsResponse.ok) {
      if (data.requireAuth) {
        return {
          success: false,
          error:
            "Please sign in with your password first, then add a passkey from your dashboard",
          requireAuth: true,
        };
      }
      throw new Error(data.error || "Failed to get authentication options");
    }

    // Separate metadata from the WebAuthn options object
    const { options, flow, isNewUser } = data;

    let credential;
    try {
      if (flow === "registration") {
        credential = await startRegistration({ optionsJSON: options });
      } else {
        credential = await startAuthentication({ optionsJSON: options });
      }
    } catch (error) {
      if (isUserCancellation(error)) {
        return {
          success: false,
          error: "Passkey prompt was cancelled. You can try again when ready.",
          cancelled: true,
        };
      }
      throw error;
    }

    const verificationResponse = await fetch("/api/webauthn/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });

    const verificationResult = await verificationResponse.json();

    if (!verificationResponse.ok || !verificationResult.verified) {
      throw new Error(verificationResult.error || "Verification failed");
    }

    // Sign in with the custom token
    if (verificationResult.customToken) {
      await signInWithCustomToken(auth, verificationResult.customToken);
    }

    return {
      success: true,
      message: verificationResult.message || "Success!",
      flow,
      isNewUser,
    };
  } catch (error) {
    console.error("WebAuthn error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

/**
 * Sign in with a discoverable credential (passkey).
 * No email needed — the browser shows all saved passkeys for this site.
 */
export async function authenticateWithPasskey(): Promise<WebAuthnResult> {
  try {
    const optionsResponse = await fetch("/api/webauthn/get-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const data = await optionsResponse.json();

    if (!optionsResponse.ok) {
      throw new Error(data.error || "Failed to get authentication options");
    }

    const { options, flow } = data;

    let credential;
    try {
      credential = await startAuthentication({ optionsJSON: options });
    } catch (error) {
      if (isUserCancellation(error)) {
        return {
          success: false,
          error: "Passkey prompt was cancelled. You can try again when ready.",
          cancelled: true,
        };
      }
      throw error;
    }

    const verificationResponse = await fetch("/api/webauthn/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });

    const verificationResult = await verificationResponse.json();

    if (!verificationResponse.ok || !verificationResult.verified) {
      throw new Error(verificationResult.error || "Verification failed");
    }

    if (verificationResult.customToken) {
      await signInWithCustomToken(auth, verificationResult.customToken);
    }

    return {
      success: true,
      message: verificationResult.message || "Signed in!",
      flow,
      isNewUser: false,
    };
  } catch (error) {
    console.error("WebAuthn passkey error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

export async function addPasskeyToAccount(
  idToken: string,
): Promise<WebAuthnResult> {
  try {
    const optionsResponse = await fetch("/api/webauthn/add-passkey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await optionsResponse.json();

    if (!optionsResponse.ok) {
      throw new Error(data.error || "Failed to get registration options");
    }

    const { options } = data;

    let credential;
    try {
      credential = await startRegistration({ optionsJSON: options });
    } catch (error) {
      if (isUserCancellation(error)) {
        return {
          success: false,
          error: "Passkey prompt was cancelled. You can try again when ready.",
          cancelled: true,
        };
      }
      throw error;
    }

    const verificationResponse = await fetch("/api/webauthn/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });

    const verificationResult = await verificationResponse.json();

    if (!verificationResponse.ok || !verificationResult.verified) {
      throw new Error(verificationResult.error || "Verification failed");
    }

    return {
      success: true,
      message: "Passkey added successfully!",
    };
  } catch (error) {
    console.error("Add passkey error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add passkey",
    };
  }
}

export async function listPasskeys(
  idToken: string,
): Promise<StoredPasskey[]> {
  const res = await fetch("/api/webauthn/credentials", {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.credentials ?? [];
}

export async function deletePasskey(
  idToken: string,
  credentialId: string,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch("/api/webauthn/credentials", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ credentialId }),
  });
  if (!res.ok) {
    const data = await res.json();
    return { success: false, error: data.error || "Failed to delete passkey" };
  }
  return { success: true };
}

export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.create);
}
