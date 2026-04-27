import { listActivitiesForContact, listActivitiesForDeal, type TimelineActivity } from '@/lib/crm/activities'
import { TimelineItem } from './TimelineItem'
import { TimelineFilters } from './ActivityComposer'

type Props = {
  subjectType: 'contact' | 'deal'
  subjectId: string
  selectedTypes?: string[]
}

type Bucket = 'hoje' | 'ontem' | 'semana' | 'mes' | 'antigos'
const BUCKET_LABELS: Record<Bucket, string> = {
  hoje: 'Hoje', ontem: 'Ontem', semana: 'Esta semana', mes: 'Este mes', antigos: 'Anteriores',
}

function bucketFor(iso: string, now: Date): Bucket {
  const d = new Date(iso)
  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const ms = now.getTime() - d.getTime()
  if (d >= todayStart) return 'hoje'
  if (d >= yesterdayStart) return 'ontem'
  if (ms < 7 * 86400000) return 'semana'
  if (ms < 30 * 86400000) return 'mes'
  return 'antigos'
}

export async function Timeline({ subjectType, subjectId, selectedTypes }: Props) {
  const loader = subjectType === 'contact' ? listActivitiesForContact : listActivitiesForDeal
  const result = await loader(subjectId, { types: selectedTypes?.length ? selectedTypes : undefined, limit: 200 })
  const items: TimelineActivity[] = 'error' in result ? [] : result.data

  const now = new Date()
  const groups: Record<Bucket, TimelineActivity[]> = { hoje: [], ontem: [], semana: [], mes: [], antigos: [] }
  for (const it of items) groups[bucketFor(it.occurred_at, now)].push(it)

  return (
    <div className="space-y-4">
      <TimelineFilters selectedTypes={selectedTypes ?? []} />
      {items.length === 0 && (
        <p className="text-cream/40 text-sm italic">Nenhuma atividade registrada ainda.</p>
      )}
      {(['hoje','ontem','semana','mes','antigos'] as Bucket[]).map(b =>
        groups[b].length === 0 ? null : (
          <section key={b} className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-cream/50">{BUCKET_LABELS[b]}</h3>
            <div className="space-y-2">
              {groups[b].map(item => <TimelineItem key={item.id} item={item} />)}
            </div>
          </section>
        )
      )}
    </div>
  )
}
