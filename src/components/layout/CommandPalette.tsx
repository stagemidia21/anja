'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { globalSearch, type SearchHit } from '@/lib/crm/search'

export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length < 2) { setHits([]); return }
      startTransition(async () => {
        const rows = await globalSearch(query, 10)
        setHits(rows)
      })
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!open) { setQuery(''); setHits([]) }
  }, [open])

  function pick(hit: SearchHit) {
    setOpen(false)
    router.push(hit.entity_type === 'contact' ? `/crm/contacts/${hit.entity_id}` : `/crm/companies/${hit.entity_id}`)
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Busca global"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24"
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl rounded-xl border border-char-3 bg-charcoal shadow-2xl">
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar contatos, empresas…"
          className="w-full border-b border-char-3 bg-transparent px-4 py-3 text-cream placeholder-cream/40 focus:outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-cream/40">
            {query.trim().length < 2 ? 'Digite ao menos 2 caracteres' : isPending ? 'Buscando…' : 'Nenhum resultado'}
          </Command.Empty>
          {hits.map((hit) => (
            <Command.Item
              key={`${hit.entity_type}-${hit.entity_id}`}
              value={`${hit.entity_type}-${hit.entity_id}-${hit.title}`}
              onSelect={() => pick(hit)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-cream cursor-pointer aria-selected:bg-char-2"
            >
              <div>
                <div className="font-medium">{hit.title}</div>
                {hit.subtitle && <div className="text-xs text-cream/50">{hit.subtitle}</div>}
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${hit.entity_type === 'contact' ? 'bg-gold/20 text-gold' : 'bg-char-3 text-cream/70'}`}>
                {hit.entity_type === 'contact' ? 'contato' : 'empresa'}
              </span>
            </Command.Item>
          ))}
        </Command.List>
        <div className="border-t border-char-3 px-4 py-2 text-xs text-cream/30">
          <kbd className="rounded bg-char-2 px-1.5 py-0.5">Esc</kbd> fechar ·{' '}
          <kbd className="rounded bg-char-2 px-1.5 py-0.5">↵</kbd> abrir
        </div>
      </div>
    </Command.Dialog>
  )
}
