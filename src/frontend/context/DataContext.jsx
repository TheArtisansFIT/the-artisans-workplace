import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  addMember,
  createGroup as buildGroup,
  findGroup,
  listInitialGroups,
} from '../services/groupService.js'
import { buildProfile } from '../services/profileService.js'
import {
  applyUpdate,
  buildDebts,
  createExpense as buildExpense,
  listInitialExpenses,
} from '../services/expenseService.js'
import {
  confirmRepayment as confirmDebtRepayment,
  listInitialDebts,
  rejectRepayment as rejectDebtRepayment,
  reportRepayment as reportDebtRepayment,
} from '../services/debtService.js'
import { CURRENT_USER_ID } from '../services/memberService.js'
import { readStoredData, writeStoredData } from '../services/storage.js'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user, saveBankDetails, removeBankDetails } = useAuth()
  const stored = useMemo(readStoredData, [])
  const [groups, setGroups] = useState(() => stored?.groups ?? listInitialGroups())
  const [expenses, setExpenses] = useState(() => stored?.expenses ?? listInitialExpenses())
  const [debts, setDebts] = useState(() => stored?.debts ?? listInitialDebts())
  const profile = useMemo(() => buildProfile(user), [user])
  const currentUserId = user?.id ?? CURRENT_USER_ID

  // Remember what is already in storage so mounting the provider does not
  // rewrite the same payload (for example on every page reload).
  const lastSaved = useRef(
    stored
      ? { groups: stored.groups, expenses: stored.expenses, debts: stored.debts }
      : { groups: [], expenses: [], debts: [] },
  )

  useEffect(() => {
    const previous = lastSaved.current
    if (
      previous.groups === groups &&
      previous.expenses === expenses &&
      previous.debts === debts
    ) {
      return
    }

    // Only changed/new records are written; removed records are deleted.
    writeStoredData({ groups, expenses, debts }, previous)
    lastSaved.current = { groups, expenses, debts }
  }, [groups, expenses, debts])

  const getGroup = useCallback(
    (groupId) => findGroup(groups, groupId),
    [groups],
  )

  const getGroupMembers = useCallback(
    (groupId) => findGroup(groups, groupId)?.memberIds ?? [],
    [groups],
  )

  const createGroup = useCallback(
    ({ name, description }) => {
      const group = buildGroup({ name, description, organizerId: currentUserId })
      setGroups((current) => [...current, group])
      return group
    },
    [currentUserId],
  )

  const addExpense = useCallback(
    (groupId, values) => {
      const expense = buildExpense({ groupId, values, createdBy: currentUserId })
      setExpenses((current) => [expense, ...current])
      setDebts((current) => [...buildDebts(expense), ...current])
      return expense
    },
    [currentUserId],
  )

  const updateExpense = useCallback(
    (expenseId, values) => {
      const existing = expenses.find((expense) => expense.id === expenseId)
      if (!existing) return

      const updated = applyUpdate(existing, values)
      setExpenses((current) =>
        current.map((expense) => (expense.id === expenseId ? updated : expense)),
      )
      setDebts((current) => [
        ...buildDebts(updated),
        ...current.filter((debt) => debt.expenseId !== expenseId),
      ])
    },
    [expenses],
  )

  const deleteExpense = useCallback((expenseId) => {
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId))
    setDebts((current) => current.filter((debt) => debt.expenseId !== expenseId))
  }, [])

  const reportRepayment = useCallback(
    (debtId, values) => {
      const debt = debts.find((item) => item.id === debtId)
      if (!debt) return
      setDebts((current) =>
        current.map((item) =>
          item.id === debtId ? reportDebtRepayment(item, values) : item,
        ),
      )
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === debt.expenseId ? { ...expense, locked: true } : expense,
        ),
      )
    },
    [debts],
  )

  const confirmRepayment = useCallback((debtId) => {
    setDebts((current) =>
      current.map((debt) =>
        debt.id === debtId ? confirmDebtRepayment(debt) : debt,
      ),
    )
  }, [])

  const rejectRepayment = useCallback((debtId, reason) => {
    setDebts((current) =>
      current.map((debt) =>
        debt.id === debtId ? rejectDebtRepayment(debt, reason) : debt,
      ),
    )
  }, [])

  const joinGroup = useCallback(
    (groupId) => {
      setGroups((current) =>
        current.map((group) =>
          group.id === groupId ? addMember(group, currentUserId) : group,
        ),
      )
    },
    [currentUserId],
  )

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
