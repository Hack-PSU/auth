"use client";

import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/common/config/firebase";

export async function authenticateWithEmail(email: string) {
  try {
    // Get options from unified endpoint (auto-detects if auth or registration is needed)
    const optionsResponse = await fetch("/api/webauthn/get-options", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!optionsResponse.ok) {
      throw new Error("Failed to get authentication options");
    }

    const options = await optionsResponse.json();

    let credential;

    // Start the appropriate WebAuthn ceremony based on flow
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

export function isWebAuthnSupported(): boolean {
  return !!(navigator.credentials && navigator.credentials.create);
}
