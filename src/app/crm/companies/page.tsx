import Link from 'next/link'
import { listCompanies } from '@/lib/crm/companies'
import { CompanyTable } from '@/components/companies/CompanyTable'

type SearchParams = {
  page?: string
  sort?: string
  dir?: string
  industry?: string
  size?: string
  tag?: string
}

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const page = Number(searchParams.page ?? 1)
  const perPage = 25

  const { data, count } = await listCompanies({
    page,
    perPage,
    sortBy: (searchParams.sort as any) ?? 'created_at',
    sortDir: (searchParams.dir as any) ?? 'desc',
    industry: searchParams.industry,
    size: searchParams.size,
    tag: searchParams.tag,
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-cream">Empresas</h1>
          <p className="text-cream/50 text-sm">{count} no total</p>
        </div>
        <Link
          href="/crm/companies/new"
          className="bg-gold text-charcoal font-semibold px-4 py-2 rounded-lg hover:bg-gold/90 text-sm transition-colors"
        >
          + Nova empresa
        </Link>
      </div>

      <CompanyTable companies={data} count={count} page={page} perPage={perPage} />
    </div>
  )
}
