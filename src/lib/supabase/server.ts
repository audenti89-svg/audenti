import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ysxcjrxuakfqzzseiaiy.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Wdm8x6QfGCWQNKqwLRejXA__r5Cg13m'

  return createServerClient(
    url,
    key,
    {
      cookieOptions: {
        maxAge: 31536000, // 1 año permanente
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                maxAge: 31536000, // 1 año permanente hasta cerrar sesión manual
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
              })
            )
          } catch {
            // Ignore - Server Component calling set
          }
        },
      },
    }
  )
}
