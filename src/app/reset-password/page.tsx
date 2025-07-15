"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useFirebase } from "@/common/context/FirebaseProvider";

function ResetPasswordForm() {
  const { auth } = useFirebase();
  const router = useRouter();
  const params = useSearchParams();

  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const continueUrl = params.get("continueUrl") || "/login";

  const [step, setStep] = useState<
    "verifying" | "ready" | "submitting" | "done"
  >("verifying");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "resetPassword" || !oobCode) {
      setError("Invalid or missing reset code.");
      setStep("done");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setStep("ready");
      })
      .catch((e) => {
        console.error(e);
        setError(
          "This link is invalid or has expired. Please request a new password reset.",
        );
        setStep("done");
      });
  }, [auth, mode, oobCode]);

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    setError("");
    setStep("submitting");

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStep("done");
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error(e);
      let errorMessage = "Failed to reset password. Please try again.";

      if (e.code === "auth/weak-password") {
        errorMessage = "Please choose a stronger password.";
      } else if (e.code === "auth/expired-action-code") {
        errorMessage = "This reset link has expired. Please request a new one.";
      } else if (e.code === "auth/invalid-action-code") {
        errorMessage = "This reset link is invalid. Please request a new one.";
      }

      setError(errorMessage);
      setStep("ready");
    }
  };

  // Verifying state
  if (step === "verifying") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && step === "done") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl">Reset Link Invalid</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/forgot-password")}
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/login")}
              className="w-full bg-transparent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (step === "done") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl">Password Reset Successful</CardTitle>
          <CardDescription>
            Your password has been successfully updated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push(continueUrl)} className="w-full">
            Continue to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Form state
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Reset Your Password</CardTitle>
        <CardDescription>
          Enter a new password for{" "}
          <span className="font-medium text-gray-900 break-all">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              disabled={step === "submitting"}
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={step === "submitting" || !newPassword}
              className="w-full"
            >
              {step === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/login")}
              disabled={step === "submitting"}
              className="w-full bg-transparent"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-600 mb-4" />
              <p className="text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
