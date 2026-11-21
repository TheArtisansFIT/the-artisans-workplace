const STORAGE_KEY = 'splitnest.data.v1'

export function readStoredData() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredData({ groups, expenses, debts }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, expenses, debts }))
  } catch {
    // Storage can be unavailable; the in-memory state still works.
  }
}
