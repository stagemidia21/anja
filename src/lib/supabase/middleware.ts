import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Atualiza a sessão do Supabase no middleware do Next.js.
 *
 * CRÍTICO: getUser() é chamado obrigatoriamente para renovar o access token
 * antes que expire. Sem isso, o usuário é deslogado silenciosamente após 1h.
 *
 * Retorna { supabaseResponse, user } para que o middleware principal possa
 * decidir redirects baseado no estado de autenticação do usuário.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Atualiza cookies no request (necessário para o supabaseResponse)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recria a response com o request atualizado
          supabaseResponse = NextResponse.next({ request });
          // Propaga os cookies com options completos na response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRÍTICO: getUser() renova o token se necessário.
  // Esta chamada é obrigatória — não remover nem mover para depois.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
