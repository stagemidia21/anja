import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Admin client usa service role — cria usuário sem confirmação de e-mail
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
  }

  // Cria usuário com email_confirm: true (pula confirmação)
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Erro ao criar conta. Tente novamente.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: data.user?.id });
}
