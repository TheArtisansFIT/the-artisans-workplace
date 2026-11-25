const vndFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
})

export function formatVND(amount) {
  return `${vndFormatter.format(Number(amount) || 0)} VND`
}

export function formatNumber(amount) {
  return vndFormatter.format(Number(amount) || 0)
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${formatDate(date)} · ${new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)}`
}

export function todayInputValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10)
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function displayNameFromEmail(email = '') {
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim()
  if (!local) return 'Friend'
  return local
    .split(' ')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}
