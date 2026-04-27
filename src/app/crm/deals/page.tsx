import { redirect } from 'next/navigation'

export default function DealsIndexPage() {
  redirect('/crm/pipeline?view=list')
}
