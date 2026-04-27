'use client'
import { useFormState as useActionState } from 'react-dom'
import { useState } from 'react'
import { createCustomField, updateCustomField, archiveCustomField } from '@/lib/crm/custom-fields'
import type { CustomFieldDefinition } from '@/lib/validations/custom-field'

type Option = { value: string; label: string }

export function CustomFieldAdmin({ initialDefinitions }: { initialDefinitions: CustomFieldDefinition[] }) {
  const [scope, setScope] = useState<'contact' | 'company'>('contact')
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['field_type']>('text')
  const [options, setOptions] = useState<Option[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [state, formAction, pending] = useActionState(editingId ? updateCustomField : createCustomField, null)

  const filtered = initialDefinitions.filter((d) => d.scope === scope)
  const atLimit = filtered.length >= 15 && !editingId

  function loadForEdit(def: CustomFieldDefinition) {
    setEditingId(def.id!)
    setScope(def.scope)
    setFieldType(def.field_type)
    setOptions(def.options ?? [])
  }

  function cancelEdit() {
    setEditingId(null)
    setOptions([])
    setFieldType('text')
  }

  const fieldError = (name: string) =>
    state && 'fieldErrors' in state ? state.fieldErrors?.[name]?.[0] : undefined

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section>
        <div className="mb-4 flex items-center gap-3">
          {(['contact', 'company'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${scope === s ? 'bg-gold text-charcoal' : 'bg-char-2 text-cream/70 hover:text-cream'}`}>
              {s === 'contact' ? 'Contatos' : 'Empresas'}
            </button>
          ))}
          <span className="ml-auto text-xs text-cream/40">{filtered.length} / 15</span>
        </div>

        <ul className="divide-y divide-char-3 rounded-xl border border-char-3">
          {filtered.length === 0 && <li className="px-4 py-4 text-sm text-cream/40">Nenhum campo personalizado.</li>}
          {filtered.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-cream font-medium">{d.label}
                  {d.required && <span className="ml-1 text-xs text-red-400">obrigatório</span>}
                </div>
                <div className="text-xs text-cream/40 font-mono">{d.key} · {d.field_type}</div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => loadForEdit(d)} className="text-xs text-gold hover:underline">editar</button>
                <form action={async () => { await archiveCustomField(d.id!) }}>
                  <button type="submit" className="text-xs text-red-400 hover:underline">arquivar</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-cream">{editingId ? 'Editar campo' : 'Novo campo'}</h2>
        {atLimit && (
          <p className="mb-3 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-cream/80">
            Limite de 15 campos atingido. Arquive um para criar outro.
          </p>
        )}

        <form action={formAction} className="space-y-4">
          {editingId && <input type="hidden" name="id" value={editingId} />}
          <input type="hidden" name="scope" value={scope} />
          <input type="hidden" name="options" value={JSON.stringify(options)} />

          <div>
            <label className="block text-sm text-cream/70 mb-1">Label</label>
            <input name="label" required className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold" />
            {fieldError('label') && <p className="text-xs text-red-400 mt-1">{fieldError('label')}</p>}
          </div>

          <div>
            <label className="block text-sm text-cream/70 mb-1">Key (snake_case)</label>
            <input name="key" required className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream font-mono focus:outline-none focus:border-gold" />
            {fieldError('key') && <p className="text-xs text-red-400 mt-1">{fieldError('key')}</p>}
          </div>

          <div>
            <label className="block text-sm text-cream/70 mb-1">Tipo</label>
            <select name="field_type" value={fieldType} onChange={(e) => setFieldType(e.target.value as any)}
              className="w-full bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-gold">
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="date">Data</option>
              <option value="select">Seleção única</option>
              <option value="multiselect">Seleção múltipla</option>
              <option value="boolean">Sim/Não</option>
            </select>
          </div>

          {['select', 'multiselect'].includes(fieldType) && (
            <div className="space-y-2">
              <label className="block text-sm text-cream/70">Opções</label>
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="value" value={o.value} onChange={(e) => setOptions(options.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                    className="flex-1 bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream font-mono text-sm focus:outline-none focus:border-gold" />
                  <input placeholder="label" value={o.label} onChange={(e) => setOptions(options.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    className="flex-1 bg-char-2 border border-char-3 rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold" />
                  <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-red-400 px-2">×</button>
                </div>
              ))}
              <button type="button" onClick={() => setOptions([...options, { value: '', label: '' }])}
                className="text-sm text-gold hover:underline">+ adicionar opção</button>
              {fieldError('options') && <p className="text-xs text-red-400">{fieldError('options')}</p>}
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-cream/70 cursor-pointer">
            <input type="checkbox" name="required" />
            Obrigatório
          </label>

          {state && 'error' in state && state.error === 'limit_reached' && (
            <p className="text-sm text-red-400">Limite de 15 campos atingido.</p>
          )}
          {state && 'error' in state && state.error === 'key_already_exists' && (
            <p className="text-sm text-red-400">Já existe um campo com essa key nesse escopo.</p>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={pending || atLimit}
              className="bg-gold text-charcoal font-semibold px-5 py-2 rounded-lg hover:bg-gold/90 disabled:opacity-50 transition-colors">
              {pending ? 'Salvando…' : editingId ? 'Salvar' : 'Criar campo'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="border border-char-3 text-cream px-5 py-2 rounded-lg hover:border-gold transition-colors">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
