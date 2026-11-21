import { initialDebts } from '../data/seedData.js'

export function listInitialDebts() {
  return initialDebts
}

export function reportRepayment(debt, values) {
  return {
    ...debt,
    status: 'pending',
    method: values.method,
    paymentDate: values.date,
    reference: values.reference?.trim() ?? '',
    reportedAt: new Date().toISOString(),
  }
}

export function confirmRepayment(debt) {
  return { ...debt, status: 'settled', confirmedAt: new Date().toISOString() }
}

export function rejectRepayment(debt, reason) {
  return {
    ...debt,
    status: 'unpaid',
    lastRejection: {
      reason: reason?.trim() || 'No matching transfer was found.',
      rejectedAt: new Date().toISOString(),
    },
  }
}
