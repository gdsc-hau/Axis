"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormField,
  Input,
} from "@hau/axis-ui";
import { login } from "./actions";
import { SUPPORT_EMAIL_HREF } from "@/lib/site";

function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const callbackError = searchParams.get("error");
  const resetSuccessful = searchParams.get("reset") === "success";

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-lg">
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Log In</h1>

          {resetSuccessful && (
            <Alert variant="success" className="mb-4">
              Your password was updated. Log in with your new password.
            </Alert>
          )}

          {(error || callbackError) && (
            <Alert variant="error" className="mb-4">
              {error || callbackError}
            </Alert>
          )}

          <form action={handleSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </FormField>
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              loadingLabel="Logging in..."
            >
              Log In
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Access is by invitation only.{" "}
            <a
              href={SUPPORT_EMAIL_HREF}
              className="text-blue-600 hover:underline"
            >
              Contact us
            </a>{" "}
            if you need help.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-gray-50 dark:bg-zinc-950" />}
    >
      <LoginForm />
    </Suspense>
  );
}
