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
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useFirebase } from "@/common/context/FirebaseProvider";
import Image from "next/image";

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
  const [showPassword, setShowPassword] = useState(false);
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

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setError("");
    setStep("submitting");

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStep("done");
    } catch (e: unknown) {
      console.error(e);
      let errorMessage = "Failed to reset password. Please try again.";

      if (e && typeof e === "object" && "code" in e) {
        const firebaseError = e as { code: string };
        if (firebaseError.code === "auth/weak-password") {
          errorMessage = "Please choose a stronger password.";
        } else if (firebaseError.code === "auth/expired-action-code") {
          errorMessage =
            "This reset link has expired. Please request a new one.";
        } else if (firebaseError.code === "auth/invalid-action-code") {
          errorMessage =
            "This reset link is invalid. Please request a new one.";
        }
      }

      setError(errorMessage);
      setStep("ready");
    }
  };

  // Verifying state
  if (step === "verifying") {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="HackPSU Logo"
              width={80}
              height={80}
              className="w-20 h-20"
            />
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Verifying reset link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error && step === "done") {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="HackPSU Logo"
              width={80}
              height={80}
              className="w-20 h-20"
            />
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Reset Link Invalid
              </CardTitle>
              <CardDescription className="text-gray-600">
                This password reset link is no longer valid
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="space-y-3">
              <Button
                onClick={() => router.push("/login")}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              >
                Request New Reset Link
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/login")}
                className="w-full h-12 border-gray-300 hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === "done") {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="HackPSU Logo"
              width={80}
              height={80}
              className="w-20 h-20"
            />
          </div>
        </div>
        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Password Reset Successful
              </CardTitle>
              <CardDescription className="text-gray-600">
                Your password has been successfully updated. You can now sign in
                with your new password.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(continueUrl)}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
            >
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form state
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="HackPSU Logo"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Reset Your Password
          </h1>
          <p className="text-gray-600">
            Enter a new password for{" "}
            <span className="font-medium text-gray-900 break-all">{email}</span>
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="text-sm font-medium text-gray-700"
              >
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="pl-10 pr-12 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={step === "submitting"}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                type="submit"
                disabled={step === "submitting" || !newPassword}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
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
                className="w-full h-12 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="w-full max-w-md">
            <Card className="border-0 shadow-xl">
              <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-gray-600">Loading...</p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
