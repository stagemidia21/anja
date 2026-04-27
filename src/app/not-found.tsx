import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-charcoal grain flex flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-light text-gold/20 select-none mb-2">404</p>

      <h1 className="font-display text-3xl font-medium text-cream mb-3">
        Página não encontrada
      </h1>

      <p className="text-muted text-sm max-w-xs mb-8">
        Esse endereço não existe ou foi movido. Volte para o dashboard e continue de onde parou.
      </p>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
      >
        Ir para o Dashboard
      </Link>

      <p className="mt-12 text-muted/40 text-xs tracking-widest uppercase">Anja</p>
    </div>
  )
}
