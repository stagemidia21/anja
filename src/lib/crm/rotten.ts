// Isomorphic helper — used by both server and client components.
// Intentionally NOT marked 'use server' so client-side rendering of the
// kanban board can re-compute rotten status without a server round-trip.

export function daysSinceActivity(
  lastActivityAt: string | Date | null,
  createdAt: string | Date
): number {
  const ref = lastActivityAt ? new Date(lastActivityAt) : new Date(createdAt)
  const diffMs = Date.now() - ref.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function isRotten(
  deal: { last_activity_at: string | null; created_at: string },
  rottenDays: number
): boolean {
  return daysSinceActivity(deal.last_activity_at, deal.created_at) > rottenDays
}
