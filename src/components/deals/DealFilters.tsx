'use client'
import { useRouter, useSearchParams } from 'next/navigation'

export function DealFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    router.push(`?${p.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="block text-xs text-cream/50 mb-1">Buscar</label>
        <input
          defaultValue={params.get('search') ?? ''}
          onBlur={(e) => update('search', e.target.value)}
          placeholder="titulo..."
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream w-48 focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">Owner (ID)</label>
        <input
          defaultValue={params.get('ownerId') ?? ''}
          onBlur={(e) => update('ownerId', e.target.value)}
          placeholder="uuid"
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream w-36 focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">Tag</label>
        <input
          defaultValue={params.get('tag') ?? ''}
          onBlur={(e) => update('tag', e.target.value)}
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream w-32 focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">Valor min</label>
        <input
          type="number"
          defaultValue={params.get('minValue') ?? ''}
          onBlur={(e) => update('minValue', e.target.value)}
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream w-28 focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">Valor max</label>
        <input
          type="number"
          defaultValue={params.get('maxValue') ?? ''}
          onBlur={(e) => update('maxValue', e.target.value)}
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream w-28 focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">De</label>
        <input
          type="date"
          defaultValue={params.get('fromDate') ?? ''}
          onBlur={(e) => update('fromDate', e.target.value)}
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream focus:outline-none focus:border-gold"
        />
      </div>
      <div>
        <label className="block text-xs text-cream/50 mb-1">Ate</label>
        <input
          type="date"
          defaultValue={params.get('toDate') ?? ''}
          onBlur={(e) => update('toDate', e.target.value)}
          className="bg-char-2 border border-char-3 rounded px-2 py-1 text-sm text-cream focus:outline-none focus:border-gold"
        />
      </div>
    </div>
  )
}
