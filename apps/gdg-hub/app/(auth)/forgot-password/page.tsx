'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@hau/db/client';

const GENERIC_SUCCESS_MESSAGE =
  'If an active account exists for that email, a password reset link has been sent.';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setMessage(null);

    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      setError('Enter a valid email address.');
      setLoading(false);
      return;
    }

    // Initiate PKCE in the browser so its code-verifier cookie is available
    // when the user returns through /auth/callback.
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (resetError) {
      const isRateLimited = resetError.message.toLowerCase().includes('rate limit');
      setError(
        isRateLimited
          ? 'Too many reset emails were requested. Use the newest email already received, or wait before trying again.'
          : 'The reset email could not be sent right now. Please try again later.'
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
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-center text-3xl font-bold">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Enter the email address attached to your member account.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-lg bg-green-100 p-4 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {message}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading || Boolean(message)}
            className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="text-blue-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
