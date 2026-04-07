import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar profile e plano
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { data: userPlan } = await supabase
    .from('user_plans')
    .select('plan')
    .eq('user_id', user.id)
    .single();

  const userData = {
    name: profile?.full_name || user.email?.split('@')[0] || 'Usuario',
    plan: userPlan?.plan || 'free',
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={userData} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={userData} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
