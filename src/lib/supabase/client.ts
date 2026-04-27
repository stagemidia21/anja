'use client';

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

/**
 * Cliente Supabase para Client Components.
 *
 * NUNCA usar em Server Components ou Route Handlers (use createClient de server.ts).
 * Usa cookies do browser / localStorage para manter a sessão.
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export const createClient = createBrowserClient;
