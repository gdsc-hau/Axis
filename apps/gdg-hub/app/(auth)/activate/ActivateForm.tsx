"use client";

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
import { activateAccount } from "./actions";

export function ActivateForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await activateAccount(formData);
    if (result?.error) setError(result.error);

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-lg">
        <CardContent className="p-8">
          <CardHeader className="mb-6 text-center">
            <CardTitle className="text-3xl">Activate your account</CardTitle>
            <CardDescription>
              Create a password with uppercase, lowercase, and a number.
            </CardDescription>
          </CardHeader>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form action={handleSubmit} className="space-y-4">
            <FormField label="Password" htmlFor="password">
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

            <FormField label="Confirm password" htmlFor="confirmPassword">
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
              loadingLabel="Activating..."
            >
              Activate account
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Having trouble? Contact the GDG HAU team for a new invitation.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
