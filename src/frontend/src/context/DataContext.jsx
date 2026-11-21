import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  CURRENT_USER_ID,
  initialDebts,
  initialExpenses,
  initialGroups,
  initialProfile,
  invitedGroups,
} from '../data/mockData.js'
import { splitEqually } from '../utils/split.js'

const DataContext = createContext(null)
const STORAGE_KEY = 'splitnest.data.v1'

function readStoredData() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
}

function buildDebtsForExpense(expense) {
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

export function DataProvider({ children }) {
  const { user, saveBankDetails, removeBankDetails } = useAuth()
  // The mock layer keeps its working copy in localStorage so a page refresh
  // does not throw away groups or expenses created during a demo session.
  // Replace these initializers with API reads during backend integration.
  const stored = useMemo(readStoredData, [])
  const [groups, setGroups] = useState(
    stored?.groups ?? [...initialGroups, ...invitedGroups],
  )
  const [expenses, setExpenses] = useState(stored?.expenses ?? initialExpenses)
  const [debts, setDebts] = useState(stored?.debts ?? initialDebts)

  // Profile and bank details now come from the authenticated API session.
  // Groups, expenses and debts remain mock data until their own endpoints land.
  const profile = useMemo(
    () =>
      user
        ? {
            displayName: user.displayName ?? user.name,
            email: user.email,
            memberSince: user.memberSince,
            bankDetails: user.bankDetails ?? null,
          }
        : initialProfile,
    [user],
  )
  const currentUserId = user?.id ?? CURRENT_USER_ID

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ groups, expenses, debts }),
      )
    } catch {
      // Storage can be unavailable; the in-memory state still works.
    }
  }, [groups, expenses, debts])

  const getGroup = useCallback(
    (groupId) => groups.find((group) => group.id === groupId) ?? null,
    [groups],
  )

  const getGroupMembers = useCallback(
    (groupId) => {
      const group = groups.find((item) => item.id === groupId)
      return group?.memberIds ?? []
    },
    [groups],
  )

  const createGroup = useCallback(({ name, description }) => {
    const base = slugify(name) || 'group'
    const id = `${base}-${Math.random().toString(36).slice(2, 6)}`
    const group = {
      id,
      name: name.trim(),
      description: description.trim(),
      currency: 'VND',
      organizerId: currentUserId,
      memberIds: [currentUserId],
      createdAt: new Date().toISOString().slice(0, 10),
      inviteToken: Math.random().toString(36).slice(2, 10),
    }
    setGroups((current) => [...current, group])
    return group
  }, [currentUserId])

  const addExpense = useCallback((groupId, values) => {
    const expense = {
      id: createId('exp'),
      groupId,
      description: values.description.trim(),
      amount: Number(values.amount),
      date: values.date,
      paidBy: values.paidBy,
      participantIds: [...values.participantIds],
      createdBy: currentUserId,
      createdAt: new Date().toISOString(),
      locked: false,
    }
    setExpenses((current) => [expense, ...current])
    setDebts((current) => [...buildDebtsForExpense(expense), ...current])
    return expense
  }, [currentUserId])

  const updateExpense = useCallback((expenseId, values) => {
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              description: values.description.trim(),
              amount: Number(values.amount),
              date: values.date,
              paidBy: values.paidBy,
              participantIds: [...values.participantIds],
            }
          : expense,
      ),
    )

    // No repayment request exists while an expense is unlocked, so its old
    // unpaid debts can safely be rebuilt from the updated split.
    setDebts((current) => {
      const untouched = current.filter((debt) => debt.expenseId !== expenseId)
      const updated = expenses.find((expense) => expense.id === expenseId)
      if (!updated) return current
      const nextExpense = {
        ...updated,
        description: values.description.trim(),
        amount: Number(values.amount),
        date: values.date,
        paidBy: values.paidBy,
        participantIds: [...values.participantIds],
      }
      return [...buildDebtsForExpense(nextExpense), ...untouched]
    })
  }, [expenses])

  const deleteExpense = useCallback((expenseId) => {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId))
    setDebts((current) => current.filter((debt) => debt.expenseId !== expenseId))
  }, [])

  const reportRepayment = useCallback((debtId, values) => {
    let expenseId = null
    setDebts((current) =>
      current.map((debt) => {
        if (debt.id !== debtId) return debt
        expenseId = debt.expenseId
        return {
          ...debt,
          status: 'pending',
          method: values.method,
          paymentDate: values.date,
          reference: values.reference?.trim() ?? '',
          reportedAt: new Date().toISOString(),
        }
      }),
    )
    if (expenseId) {
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === expenseId ? { ...expense, locked: true } : expense,
        ),
      )
    }
  }, [])

  const confirmRepayment = useCallback((debtId) => {
    setDebts((current) =>
      current.map((debt) =>
        debt.id === debtId
          ? { ...debt, status: 'settled', confirmedAt: new Date().toISOString() }
          : debt,
      ),
    )
  }, [])

  const rejectRepayment = useCallback((debtId, reason) => {
    setDebts((current) =>
      current.map((debt) =>
        debt.id === debtId
          ? {
              ...debt,
              status: 'unpaid',
              lastRejection: {
                reason: reason?.trim() || 'No matching transfer was found.',
                rejectedAt: new Date().toISOString(),
              },
            }
          : debt,
      ),
    )
  }, [])

  const joinGroup = useCallback((groupId) => {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId && !group.memberIds.includes(currentUserId)
          ? { ...group, memberIds: [...group.memberIds, currentUserId] }
          : group,
      ),
    )
  }, [currentUserId])

  const value = useMemo(
    () => ({
      currentUserId,
      groups,
      expenses,
      debts,
      profile,
      getGroup,
      getGroupMembers,
      createGroup,
      addExpense,
      updateExpense,
      deleteExpense,
      reportRepayment,
      confirmRepayment,
      rejectRepayment,
      joinGroup,
      saveBankDetails,
      removeBankDetails,
    }),
    [
      currentUserId,
      groups,
      expenses,
      debts,
      profile,
      getGroup,
      getGroupMembers,
      createGroup,
      addExpense,
      updateExpense,
      deleteExpense,
      reportRepayment,
      confirmRepayment,
      rejectRepayment,
      joinGroup,
      saveBankDetails,
      removeBankDetails,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}
