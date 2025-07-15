/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  FC,
} from "react";
import {
  Auth,
  User,
  getIdToken,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  OAuthProvider,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { jwtDecode } from "jwt-decode";
import { auth } from "@/common/config/firebase"; // use shared auth

// Internal role definitions (used for permission checking only)
enum Role {
  NONE = 0,
  VOLUNTEER,
  TEAM,
  EXEC,
  TECH,
  FINANCE,
}

const MINIMUM_ROLE = Role.NONE; // adjust as needed

// Decode and extract role claim
function extractAuthToken(token: string) {
  return token.startsWith("Bearer ") ? token.slice(7) : token;
}
function getRole(token: string): number {
  try {
    const decoded: any = jwtDecode(extractAuthToken(token));
    return decoded.production ?? decoded.staging ?? Role.NONE;
  } catch {
    return Role.NONE;
  }
}

type FirebaseContextType = {
  auth: Auth;
  isLoading: boolean;
  isAuthenticated: boolean;
  user?: User;
  token?: string;
  error?: string;
  login(email: string, pass: string): Promise<void>;
  signup(email: string, pass: string): Promise<void>;
  loginGoogle(): Promise<void>;
  loginGithub(): Promise<void>;
  loginMicrosoft(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  logout(): Promise<void>;
};

const FirebaseContext = createContext<FirebaseContextType | null>(null);

type Props = { children: React.ReactNode };
export const FirebaseProvider: FC<Props> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  // Helper: call sessionLogin endpoint with ID token
  const createSession = useCallback(async (idToken: string) => {
    await fetch("/api/sessionLogin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  }, []);

  // Helper: call sessionLogout endpoint
  const clearSession = useCallback(async () => {
    await fetch("/api/sessionLogout", {
      method: "POST",
      credentials: "include",
    });
  }, []);

  // Listen for auth changes and sync session cookie
  useEffect(() => {
    const handle = async (u: User | null) => {
      setIsLoading(true);
      if (u) {
        const idToken = await getIdToken(u, true);
        if (getRole(idToken) < MINIMUM_ROLE) {
          await signOut(auth);
          setError("Insufficient permissions");
          setUser(null);
          setToken(undefined);
        } else {
          await createSession(idToken);
          setUser(u);
          setToken(idToken);
          setError(undefined);
        }
      } else {
        setUser(null);
        setToken(undefined);
        setError(undefined);
      }
      setIsLoading(false);
    };

    const unsubA = onAuthStateChanged(auth, handle);
    const unsubT = onIdTokenChanged(auth, handle);
    return () => {
      unsubA();
      unsubT();
    };
  }, [createSession]);

  // Unified login flow
  const login = useCallback(async (email: string, pass: string) => {
    setError(undefined);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      // session established by listener
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string) => {
    setError(undefined);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const loginGoogle = useCallback(async () => {
    setError(undefined);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const loginGithub = useCallback(async () => {
    setError(undefined);
    try {
      const cred = await signInWithPopup(auth, new GithubAuthProvider());
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const loginMicrosoft = useCallback(async () => {
    setError(undefined);
    try {
      const provider = new OAuthProvider("microsoft.com");
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(undefined);
    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin,
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    setError(undefined);
    setIsLoading(true);
    try {
      await signOut(auth);
      await clearSession();
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      auth,
      isLoading,
      isAuthenticated: !!user,
      user: user || undefined,
      token,
      error,
      login,
      signup,
      loginGoogle,
      loginGithub,
      loginMicrosoft,
      resetPassword,
      logout,
    }),
    [isLoading, user, token, error],
  );

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const ctx = useContext(FirebaseContext);
  if (!ctx) throw new Error("useFirebase must be used within FirebaseProvider");
  return ctx;
};
