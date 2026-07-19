const publicEnvironmentVariables = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type PublicEnvironmentVariable = (typeof publicEnvironmentVariables)[number];

export function requirePublicEnv(name: PublicEnvironmentVariable): string {
  const value = process.env[name];
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
