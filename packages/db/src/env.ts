const publicEnvironmentVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type PublicEnvironmentVariable = (typeof publicEnvironmentVariables)[number];

export function requirePublicEnv(name: PublicEnvironmentVariable): string {
  // Next.js replaces NEXT_PUBLIC_* references in browser bundles only when the
  // property access is static. Do not replace this with process.env[name].
  const value = name === 'NEXT_PUBLIC_SUPABASE_URL'
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function requireServerEnv(name: string): string {
  if (typeof window !== 'undefined') {
    throw new Error(`Server-only environment variable requested in the browser: ${name}`);
  }
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
