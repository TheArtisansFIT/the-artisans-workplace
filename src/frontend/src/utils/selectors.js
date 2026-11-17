export function groupExpenses(expenses, groupId) {
  return expenses
    .filter((expense) => expense.groupId === groupId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function groupTotal(expenses, groupId) {
  return groupExpenses(expenses, groupId).reduce((total, expense) => total + expense.amount, 0)
}

export function personalBalance(debts, groupId, userId) {
  const relevant = debts.filter(
    (debt) => debt.groupId === groupId && (debt.from === userId || debt.to === userId),
  )
  const owed = relevant
    .filter((debt) => debt.to === userId && debt.status !== 'settled')
    .reduce((total, debt) => total + debt.amount, 0)
  const owe = relevant
    .filter((debt) => debt.from === userId && debt.status !== 'settled')
    .reduce((total, debt) => total + debt.amount, 0)
  return { owed, owe, net: owed - owe }
}

export function visibleDebts(debts, groupId, userId) {
  return debts.filter(
    (debt) => debt.groupId === groupId && (debt.from === userId || debt.to === userId),
  )
}

export function userShare(expense, userId) {
  if (!expense.participantIds.includes(userId)) return 0
  const base = Math.floor(expense.amount / expense.participantIds.length)
  const remainder = expense.amount % expense.participantIds.length
  const index = expense.participantIds.indexOf(userId)
  return base + (index < remainder ? 1 : 0)
}

export function debtStatusMeta(status) {
  if (status === 'settled') return { label: 'Settled', tone: 'settled' }
  if (status === 'pending') return { label: 'Pending confirmation', tone: 'pending' }
  return { label: 'Unpaid', tone: 'unpaid' }
}
