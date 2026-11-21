import { initialExpenses } from '../data/seedData.js'
import { splitEqually } from '../utils/split.js'
import { createId } from '../utils/id.js'

export function listInitialExpenses() {
  return initialExpenses
}

function normalizeValues(values) {
  return {
    description: values.description.trim(),
    amount: Number(values.amount),
    date: values.date,
    paidBy: values.paidBy,
    participantIds: [...values.participantIds],
  }
}

export function createExpense({ groupId, values, createdBy }) {
  return {
    id: createId('exp'),
    groupId,
    ...normalizeValues(values),
    createdBy,
    createdAt: new Date().toISOString(),
    locked: false,
  }
}

export function applyUpdate(expense, values) {
  return { ...expense, ...normalizeValues(values) }
}

export function buildDebts(expense) {
  const shares = splitEqually(expense.amount, expense.participantIds)
  return expense.participantIds
    .filter((memberId) => memberId !== expense.paidBy)
    .map((memberId) => ({
      id: createId('debt'),
      groupId: expense.groupId,
      expenseId: expense.id,
      from: memberId,
      to: expense.paidBy,
      amount: shares[memberId] ?? 0,
      status: 'unpaid',
    }))
}
