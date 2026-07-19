import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'
import { requireServerEnv } from './env'

export function createAdminClient() {
  return createClient<Database>(
    requireServerEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
