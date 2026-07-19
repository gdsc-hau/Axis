import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.039a2.25 2.25 0 012.134 0l7.5 4.039a2.25 2.25 0 011.183 1.98V19.5z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-3">
          Invite-Only Access
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
          GDG HAU Axis is available to verified members only. New accounts are
          activated via an invitation email sent by an administrator.
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          If you're expecting an invite, please check your inbox — including
          your spam folder.
        </p>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
        >
          Go to Login
        </Link>

        <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-600">
          Need access?{' '}
          <a
            href="mailto:gdg@hau.edu.ph"
            className="underline hover:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
          >
            Contact the GDG HAU team
          </a>
        </p>
      </div>
    </div>
  );
}
