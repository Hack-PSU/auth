"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { useFirebase } from "@/common/context/FirebaseProvider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface FormData {
  email: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo") || "https://admin.hackpsu.org";

  const {
    user,
    login,
    loginGoogle,
    loginGithub,
    loginMicrosoft,
    logout,
    isLoading,
    resetPassword,
  } = useFirebase();

  const [loginError, setLoginError] = useState<string>("");
  const [isProcessing, setProcessing] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const methods = useForm<FormData>({
    defaultValues: { email: "", password: "" },
  });

  const { handleSubmit, control } = methods;

  // Redirect on successful login
  useEffect(() => {
    if (!isLoading && user) {
      router.push(returnTo);
    }
  }, [isLoading, user, router, returnTo]);

  const onSubmit = async (data: FormData) => {
    setProcessing(true);
    setLoginError("");
    try {
      await login(data.email, data.password);
      // router.push handled by effect
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      setLoginError(msg);
    }
    setProcessing(false);
  };

  const handleForgotPassword = async () => {
    const email = methods.getValues("email");
    if (!email) {
      setLoginError("Please enter your email address.");
      return;
    }
    try {
      await resetPassword(email);
      setLoginError("Password reset email sent. Please check your inbox.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoginError(msg);
    }
  };

  const handleOAuth = async (provider: () => Promise<void>) => {
    setProcessing(true);
    setLoginError("");
    try {
      await provider();
      // router.push handled by effect
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      setLoginError(msg);
    }
    setProcessing(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {user ? (
          <CardTitle className="text-green-800">Success</CardTitle>
        ) : (
          <CardTitle className="text-foreground">Sign In</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <span className="text-lg text-muted-foreground">Loading…</span>
          </div>
        ) : user ? (
          <p className="text-center">You are now logged in.</p>
        ) : (
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      autoFocus
                    />
                  )}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Your password"
                        {...field}
                      />
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {loginError && (
                <p
                  className="text-sm text-destructive text-center"
                  role="alert"
                >
                  {loginError}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? "Signing In…" : "Sign In"}
              </Button>
              <div className="flex flex-col space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleOAuth(loginGoogle)}
                  disabled={isProcessing}
                >
                  Sign in with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleOAuth(loginGithub)}
                  disabled={isProcessing}
                >
                  Sign in with GitHub
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => handleOAuth(loginMicrosoft)}
                  disabled={isProcessing}
                >
                  Sign in with Microsoft
                </Button>
              </div>
              <Button
                type="button"
                variant="link"
                className="w-full text-sm text-muted-foreground"
                onClick={handleForgotPassword}
              >
                Forgot Password?
              </Button>
            </form>
          </FormProvider>
        )}
      </CardContent>
      {user && (
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={logout}
          >
            Log Out
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Suspense
        fallback={
          <Card className="w-full max-w-md">
            <CardContent className="flex justify-center py-10">
              <span className="text-lg text-muted-foreground">Loading…</span>
            </CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
