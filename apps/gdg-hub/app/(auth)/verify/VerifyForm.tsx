"use client";

import { useState } from "react";
import { completeProfile } from "./actions";

export function VerifyForm({ fullName }: { fullName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const result = await completeProfile(formData);

    if (result?.error) {
      setError(result.error);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-zinc-950">
      <div className="w-full max-w-lg rounded border bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-2 text-center text-3xl font-bold">Almost there!</h1>
        <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
          Please complete your profile to access the member portal.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <p className="mb-1 text-sm font-medium">Registered full name</p>
            <div
              aria-label="Registered full name"
              className="w-full rounded-md border bg-gray-100 px-3 py-2 text-gray-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {fullName}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This name comes from the official member registry and cannot be
              edited here. Contact an administrator if it needs correction.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="bio">
              Short Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              required
              rows={3}
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Tell us a bit about yourself and your tech interests..."
            />
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium"
              htmlFor="linkedin"
            >
              LinkedIn Profile URL (Optional)
            </label>
            <input
              id="linkedin"
              name="linkedin"
              type="url"
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="github">
              GitHub Profile URL (Optional)
            </label>
            <input
              id="github"
              name="github"
              type="url"
              className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="https://github.com/johndoe"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
