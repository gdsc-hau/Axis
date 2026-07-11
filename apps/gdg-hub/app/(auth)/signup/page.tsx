'use client';

import { useState } from 'react';
import { signup } from './actions';
import Link from 'next/link';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await signup(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(result.success);
    }
    
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded shadow-md border dark:border-zinc-800">
        <h1 className="text-3xl font-bold mb-6 text-center">Join GDG HAU</h1>
        
        {error && (
          <div className="mb-4 p-4 text-sm text-red-800 bg-red-100 rounded-lg dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        
        {success ? (
          <div className="p-4 text-sm text-green-800 bg-green-100 rounded-lg dark:bg-green-900/30 dark:text-green-400">
            {success}
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 border rounded-md dark:border-zinc-700 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verifying...' : 'Sign Up'}
            </button>
          </form>
        )}
        
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already verified?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
