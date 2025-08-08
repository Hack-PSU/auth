"use client";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/common/config/firebase";

export async function authenticateWithEmail(email: string) {
  try {
    // Get options from endpoint
    const optionsResponse = await fetch("/api/webauthn/get-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const options = await optionsResponse.json();

    if (!optionsResponse.ok) {
      if (options.requireAuth) {
        return {
          success: false,
          error:
            "Please sign in with your password first, then add a passkey from your dashboard",
          requireAuth: true,
        };
      }
      throw new Error(options.error || "Failed to get authentication options");
    }

    let credential;

    // Handle both registration and authentication flows
    if (options.flow === "registration") {
      credential = await startRegistration(options);
    } else {
      credential = await startAuthentication(options);
    }

    // Verify with unified endpoint
    const verificationResponse = await fetch("/api/webauthn/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential }),
    });

    if (!verificationResponse.ok) {
      throw new Error("Failed to verify credential");
    }

    const verificationResult = await verificationResponse.json();

    if (verificationResult.verified) {
      // Sign in with the custom token
      if (verificationResult.customToken) {
        await signInWithCustomToken(auth, verificationResult.customToken);
      }

      return {
        success: true,
        message: verificationResult.message || "Success!",
        flow: options.flow,
        isNewUser: options.isNewUser,
      };
    } else {
      throw new Error(verificationResult.error || "Verification failed");
    }
  } catch (error) {
    console.error("WebAuthn error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    };
  }
}

export async function addPasskeyToAccount(idToken: string) {
  try {
    // Get registration options for authenticated user
    const optionsResponse = await fetch("/api/webauthn/add-passkey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error("Failed to get registration options");
    }

    const options = await optionsResponse.json();

    // Start registration ceremony
    const credential = await startRegistration(options);

    // Verify registration
    const verificationResponse = await fetch("/api/webauthn/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ credential }),
    });

    if (!verificationResponse.ok) {
      throw new Error("Failed to verify credential");
    }

    const verificationResult = await verificationResponse.json();

    if (verificationResult.verified) {
      return {
        success: true,
        message: "Passkey added successfully!",
      };
    } else {
      throw new Error(verificationResult.error || "Verification failed");
    }
  } catch (error) {
    console.error("Add passkey error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add passkey",
    };
  }
}

export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.create);
}
