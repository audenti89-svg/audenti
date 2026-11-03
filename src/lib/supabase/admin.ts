import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    throw new Error('[Seguridad ECC]: SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno del servidor.')
  }

  return createSupabaseJsClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
