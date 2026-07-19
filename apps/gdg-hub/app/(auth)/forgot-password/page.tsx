"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@hau/db/client";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
} from "@hau/axis-ui";

const GENERIC_SUCCESS_MESSAGE =
  "If an active account exists for that email, a password reset link has been sent.";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }

    // Initiate PKCE in the browser so its code-verifier cookie is available
    // when the user returns through /auth/callback.
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );

    if (resetError) {
      const isRateLimited = resetError.message
        .toLowerCase()
        .includes("rate limit");
      setError(
        isRateLimited
          ? "Too many reset emails were requested. Use the newest email already received, or wait before trying again."
          : "The reset email could not be sent right now. Please try again later.",
      );
      setLoading(false);
      return;
    }

    // Do not disclose whether an Auth account exists for the submitted email.
    setMessage(GENERIC_SUCCESS_MESSAGE);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-lg">
        <CardContent className="p-8">
          <CardHeader className="mb-6 text-center">
            <CardTitle className="text-3xl">Reset your password</CardTitle>
            <CardDescription>
              Enter the email address attached to your member account.
            </CardDescription>
          </CardHeader>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          {message && (
            <Alert variant="success" className="mb-4">
              {message}
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
            <Button
              type="submit"
              fullWidth
              disabled={loading || Boolean(message)}
              loading={loading}
              loadingLabel="Sending..."
            >
              Send reset link
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="text-blue-600 hover:underline">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
