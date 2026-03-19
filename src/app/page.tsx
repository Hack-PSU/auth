"use client";

import { useFirebase } from "@/common/context/FirebaseProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Fingerprint,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Key,
} from "lucide-react";
import {
  addPasskeyToAccount,
  listPasskeys,
  deletePasskey,
  isWebAuthnSupported,
  type StoredPasskey,
} from "@/lib/webauthn";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function transportLabel(transports: string[]): string {
  if (transports.length === 0) return "Passkey";
  const labels: Record<string, string> = {
    internal: "This device",
    usb: "USB key",
    ble: "Bluetooth",
    nfc: "NFC",
    hybrid: "Phone/tablet",
  };
  return transports.map((t) => labels[t] || t).join(", ");
}

export default function Home() {
  const { user, isLoading, logout } = useFirebase();
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [passkeys, setPasskeys] = useState<StoredPasskey[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

  const refreshPasskeys = useCallback(async () => {
    if (!user) return;
    setLoadingPasskeys(true);
    try {
      const idToken = await user.getIdToken();
      const keys = await listPasskeys(idToken);
      setPasskeys(keys);
    } catch {
      // Silently fail — passkey list is non-critical
    }
    setLoadingPasskeys(false);
  }, [user]);

  // Load passkeys when user is available
  useEffect(() => {
    if (user && webAuthnSupported) {
      refreshPasskeys();
    }
  }, [user, webAuthnSupported, refreshPasskeys]);

  const handleAddPasskey = async () => {
    if (!user) return;

    setIsAddingPasskey(true);
    setMessage("");
    setError("");

    try {
      const idToken = await user.getIdToken();
      const result = await addPasskeyToAccount(idToken);

      if (result.success) {
        setMessage(result.message || "Passkey added successfully!");
        await refreshPasskeys();
      } else if (result.cancelled) {
        // User cancelled — no error
      } else {
        setError(result.error || "Failed to add passkey");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add passkey");
    }

    setIsAddingPasskey(false);
  };

  const handleDeletePasskey = async (credentialId: string) => {
    if (!user) return;

    setDeletingId(credentialId);
    setMessage("");
    setError("");

    try {
      const idToken = await user.getIdToken();
      const result = await deletePasskey(idToken, credentialId);

      if (result.success) {
        setMessage("Passkey removed.");
        setPasskeys((prev) => prev.filter((p) => p.id !== credentialId));
      } else {
        setError(result.error || "Failed to remove passkey");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove passkey");
    }

    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>HackPSU Auth Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welcome, {user.email}!
              </p>

              {message && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {webAuthnSupported && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Fingerprint className="h-4 w-4" />
                    Passkeys
                  </h3>

                  {/* Passkey list */}
                  {loadingPasskeys ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading passkeys...
                    </div>
                  ) : passkeys.length > 0 ? (
                    <div className="space-y-2">
                      {passkeys.map((pk) => (
                        <div
                          key={pk.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Key className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {transportLabel(pk.transports)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Added {formatDate(pk.createdAt)}
                                {pk.lastUsed &&
                                  ` · Last used ${formatDate(pk.lastUsed)}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePasskey(pk.id)}
                            disabled={deletingId === pk.id}
                          >
                            {deletingId === pk.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No passkeys registered yet.
                    </p>
                  )}

                  <Button
                    onClick={handleAddPasskey}
                    disabled={isAddingPasskey}
                    variant="outline"
                    className="w-full"
                  >
                    {isAddingPasskey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Passkey...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Passkey
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Add a passkey to enable biometric sign-in (Touch ID, Face
                    ID, etc.)
                  </p>
                </div>
              )}

              <Button
                onClick={logout}
                variant="outline"
                className="w-full bg-transparent"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are not signed in.
              </p>
              <Link href="/login">
                <Button className="w-full">Sign In</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
