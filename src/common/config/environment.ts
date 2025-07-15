import { z } from "zod";
import type { FirebaseOptions } from "firebase/app";
import type { ServiceAccount } from "firebase-admin";

/**
 * All the bits you need to call initializeApp() on the client,
 * plus your own `baseURL` for `apiFetch`.
 */
export function getEnvironment(): FirebaseOptions {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    //baseURL:       process.env.NEXT_PUBLIC_BASE_URL_V3,
  };
}

export function getServiceAccount(): ServiceAccount {
  return JSON.parse(process.env.SERVICE_ACCOUNT || "{}") as ServiceAccount;
}
