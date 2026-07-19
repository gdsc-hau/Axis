"use client";

import { useState } from "react";
import { completeProfile } from "./actions";

export default function VerifyPage() {
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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-lg p-8 bg-white dark:bg-zinc-900 rounded shadow-md border dark:border-zinc-800">
        <h1 className="text-3xl font-bold mb-2 text-center">Almost there!</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Please complete your profile to access the member portal.
        </p>

        {error && (
          <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="fullName"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="bio">
              Short Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              required
              rows={3}
              className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us a bit about yourself and your tech interests..."
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="linkedin"
            >
              LinkedIn Profile URL (Optional)
            </label>
            <input
              id="linkedin"
              name="linkedin"
              type="url"
              className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="github">
              GitHub Profile URL (Optional)
            </label>
            <input
              id="github"
              name="github"
              type="url"
              className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://github.com/johndoe"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 transition-colors mt-6"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
