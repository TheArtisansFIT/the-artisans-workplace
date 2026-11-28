import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  addMember,
  createGroupInApi,
  findGroup,
  listInitialGroups,
  removeMember,
} from '../services/groupService.js'
import { buildProfile } from '../services/profileService.js'
import {
  debtsFromExpense,
  fetchGroupExpenses,
  listInitialExpenses,
  removeExpense as deleteExpenseFromApi,
  saveExpense,
  saveExpenseChanges,
  createExpense,
  applyUpdate,
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
  const [apiGroupIds, setApiGroupIds] = useState(new Set())

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

  useEffect(() => {
    if (!user?.id || groups.length === 0) return undefined

    let active = true
    const apiGroups = groups.filter((group) => apiGroupIds.has(group.id))
    Promise.all(
      apiGroups.map(async (group) => {
        try {
          return { groupId: group.id, expenses: await fetchGroupExpenses(group.id) }
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (!active) return
      const available = results.filter(Boolean)
      if (available.length === 0) return

      const loadedExpenses = available.flatMap(({ expenses: groupExpenses }) => groupExpenses)
      const loadedGroupIds = new Set(available.map(({ groupId }) => groupId))
      setExpenses((current) => [
        ...loadedExpenses,
        ...current.filter((expense) => !loadedGroupIds.has(expense.groupId)),
      ])
      setDebts((current) => [
        ...loadedExpenses.flatMap((expense) => debtsFromExpense(expense)),
        ...current.filter((debt) => !loadedGroupIds.has(debt.groupId)),
      ])
    })

    return () => {
      active = false
    }
  }, [groups, user?.id, apiGroupIds])

  const getGroup = useCallback(
    (groupId) => findGroup(groups, groupId),
    [groups],
  )

  const getGroupMembers = useCallback(
    (groupId) => findGroup(groups, groupId)?.memberIds ?? [],
    [groups],
  )

  const createGroup = useCallback(
    async ({ name, description }) => {
      const group = await createGroupInApi({ name, description })
      setGroups((current) => [...current, group])
      setApiGroupIds((current) => new Set(current).add(group.id))
      return group
    },
    [],
  )

  const addExpense = useCallback(
    async (groupId, values) => {
      const isApiGroup = apiGroupIds.has(groupId)
      if (isApiGroup) {
        const expense = await saveExpense(groupId, values)
        setExpenses((current) => [expense, ...current])
        setDebts((current) => [...debtsFromExpense(expense), ...current])
        return expense
      }
      // Nhóm cục bộ/seed: lưu trực tiếp vào state, không gọi API
      const expense = createExpense({ groupId, values, createdBy: currentUserId })
      setExpenses((current) => [expense, ...current])
      setDebts((current) => [...debtsFromExpense(expense), ...current])
      return expense
    },
    [expenses, apiGroupIds, currentUserId],
  )

  const updateExpense = useCallback(
    async (expenseId, values) => {
      const existing = expenses.find((expense) => expense.id === expenseId)
      if (!existing) return

      const isApiGroup = apiGroupIds.has(existing.groupId)
      if (isApiGroup) {
        const updated = await saveExpenseChanges(existing.groupId, expenseId, values)
        setExpenses((current) =>
          current.map((expense) => (expense.id === expenseId ? updated : expense)),
        )
        setDebts((current) => [
          ...debtsFromExpense(updated),
          ...current.filter((debt) => debt.expenseId !== expenseId),
        ])
      } else {
        const updated = applyUpdate(existing, values)
        setExpenses((current) =>
          current.map((expense) => (expense.id === expenseId ? updated : expense)),
        )
        setDebts((current) => [
          ...debtsFromExpense(updated),
          ...current.filter((debt) => debt.expenseId !== expenseId),
        ])
      }
    },
    [expenses, apiGroupIds],
  )

  const deleteExpense = useCallback(async (expenseId) => {
    const existing = expenses.find((expense) => expense.id === expenseId)
    if (!existing) return

    const isApiGroup = apiGroupIds.has(existing.groupId)
    if (isApiGroup) {
      await deleteExpenseFromApi(existing.groupId, expenseId)
    }
    setExpenses((current) => current.filter((expense) => expense.id !== expenseId))
    setDebts((current) => current.filter((debt) => debt.expenseId !== expenseId))
  }, [expenses, apiGroupIds])

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

  const removeMemberFromGroup = useCallback(
    (groupId, memberId) => {
      setGroups((current) =>
        current.map((group) =>
          group.id === groupId ? removeMember(group, memberId) : group,
        ),
      )
    },
    [],
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
      apiGroupIds,
      reportRepayment,
      confirmRepayment,
      rejectRepayment,
      joinGroup,
      removeMemberFromGroup,
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
      apiGroupIds,
      reportRepayment,
      confirmRepayment,
      rejectRepayment,
      joinGroup,
      removeMemberFromGroup,
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
