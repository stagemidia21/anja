// Auth pages are never static — they depend on session state and must run dynamically
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      {children}
    </div>
  );
}
