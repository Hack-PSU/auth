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
} from "lucide-react";
import { addPasskeyToAccount, isWebAuthnSupported } from "@/lib/webauthn";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
  const { user, isLoading, logout } = useFirebase();
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
  }, []);

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
      } else {
        setError(result.error || "Failed to add passkey");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add passkey");
    }

    setIsAddingPasskey(false);
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
                  <h3 className="text-sm font-medium">Security Settings</h3>
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
