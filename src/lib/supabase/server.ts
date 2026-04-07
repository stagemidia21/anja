import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Cliente Supabase para Server Components e Route Handlers.
 *
 * NUNCA usar no Client Components (use createBrowserClient em client.ts).
 * IMPORTANTE: sempre usar getUser() para verificação de auth no servidor.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem setar cookies — o middleware
            // garante que o refresh de sessão acontece corretamente.
          }
        },
      },
    }
  );
}
