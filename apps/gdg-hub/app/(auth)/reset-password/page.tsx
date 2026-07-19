"use client";

import Link from "next/link";
import { useState } from "react";
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
import { resetPassword } from "./actions";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await resetPassword(formData);
    if (result?.error) setError(result.error);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-lg">
        <CardContent className="p-8">
          <CardHeader className="mb-6 text-center">
            <CardTitle className="text-3xl">Choose a new password</CardTitle>
            <CardDescription>
              Use at least 8 characters with uppercase, lowercase, and a number.
            </CardDescription>
          </CardHeader>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form action={handleSubmit} className="space-y-4">
            <FormField label="New password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm new password" htmlFor="confirmPassword">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </FormField>
            <Button
              type="submit"
              fullWidth
              loading={loading}
              loadingLabel="Updating..."
            >
              Update password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-blue-600 hover:underline"
            >
              Request another reset link
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
