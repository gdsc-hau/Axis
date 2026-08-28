import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";
import { requirePublicEnv } from "./env";

export function createClient() {
  return createBrowserClient<Database>(
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
