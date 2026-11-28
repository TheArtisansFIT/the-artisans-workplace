import { initialExpenses } from '../data/seedData.js'
import { request } from './httpClient.js'
import { splitEqually } from '../utils/split.js'
import { createId } from '../utils/id.js'

export function listInitialExpenses() {
  return initialExpenses
}

function normalizeExpense(expense) {
  if (!expense) return expense
  const { _id, ...rest } = expense
  return { id: rest.id ?? _id, ...rest }
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

function toApiValues(values) {
  return normalizeValues(values)
}

function toDebt(obligation, expense) {
  return {
    id: obligation.id,
    groupId: expense.groupId,
    expenseId: expense.id,
    from: obligation.debtorId,
    to: obligation.creditorId,
    amount: obligation.amount,
    status: obligation.status,
  }
}

export async function fetchGroupExpenses(groupId) {
  const result = await request(`/groups/${encodeURIComponent(groupId)}/expenses`)
  return (result.expenses ?? []).map(normalizeExpense)
}

export async function saveExpense(groupId, values) {
  const result = await request(
    `/groups/${encodeURIComponent(groupId)}/expenses`,
    { method: 'POST', body: toApiValues(values) },
  )
  return normalizeExpense(result.expense)
}

export async function saveExpenseChanges(groupId, expenseId, values) {
  const result = await request(
    `/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(expenseId)}`,
    { method: 'PUT', body: toApiValues(values) },
  )
  return normalizeExpense(result.expense)
}

export async function removeExpense(groupId, expenseId) {
  await request(
    `/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(expenseId)}`,
    { method: 'DELETE' },
  )
}

export function debtsFromExpense(expense) {
  if (Array.isArray(expense.obligations)) {
    return expense.obligations.map((obligation) => toDebt(obligation, expense))
  }
  return buildDebts(expense)
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
