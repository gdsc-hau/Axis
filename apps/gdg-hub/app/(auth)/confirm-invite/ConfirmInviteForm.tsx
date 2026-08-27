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
import { confirmInvitation } from "./actions";

export function ConfirmInviteForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await confirmInvitation(formData);
    if (result?.error) setError(result.error);

    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8 dark:bg-zinc-950">
      <Card className="w-full max-w-md rounded-lg">
        <CardContent className="p-8">
          <CardHeader className="mb-6 text-center">
            <CardTitle className="text-3xl">Accept your invitation</CardTitle>
            <CardDescription>
              Enter the member email and 6-digit code from your invitation.
            </CardDescription>
          </CardHeader>

          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form action={handleSubmit} className="space-y-4">
            <FormField label="Member email" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </FormField>

            <FormField label="Invitation code" htmlFor="token">
              <Input
                id="token"
                name="token"
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                pattern="[0-9]{6}"
                placeholder="123456"
                className="font-mono tracking-[0.35em]"
              />
            </FormField>

            <Button
              type="submit"
              fullWidth
              loading={loading}
              loadingLabel="Checking..."
            >
              Continue
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Codes expire after the interval configured in Supabase Auth. If the
            newest code does not work, ask an administrator to resend it.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
