/**
 * Split a whole-VND amount equally. Leftover dong are distributed one by one
 * in the supplied participant order, matching the project business rules.
 */
export function splitEqually(amount, participantIds) {
  const total = Math.max(0, Math.floor(Number(amount) || 0))
  const ids = [...new Set(participantIds)]
  if (ids.length === 0) return {}

  const base = Math.floor(total / ids.length)
  const remainder = total % ids.length

  return Object.fromEntries(
    ids.map((id, index) => [id, base + (index < remainder ? 1 : 0)]),
  )
}

export function sumShares(shares) {
  return Object.values(shares ?? {}).reduce((total, value) => total + value, 0)
}
