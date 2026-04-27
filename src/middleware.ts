import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/chat', '/tarefas', '/agenda', '/rotinas', '/configuracoes'];
const authRoutes = ['/login', '/signup', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && protectedRoutes.some((r) => pathname.startsWith(r))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    return NextResponse.redirect(loginUrl);
  }

  if (user && authRoutes.some((r) => pathname.startsWith(r))) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  const isCrmRoute = pathname.startsWith('/crm');
  const isSetupRoute = pathname.startsWith('/setup');

  if (isCrmRoute || isSetupRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      return NextResponse.redirect(loginUrl);
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('active_organization_id')
      .eq('id', user.id)
      .single();

    const hasOrg = Boolean(profile?.active_organization_id);

    if (isCrmRoute && !hasOrg) {
      const url = request.nextUrl.clone();
      url.pathname = '/setup';
      return NextResponse.redirect(url);
    }

    if (isSetupRoute && hasOrg) {
      const url = request.nextUrl.clone();
      url.pathname = '/crm';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
