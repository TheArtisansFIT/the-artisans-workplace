const LEGACY_STORAGE_KEY = 'splitnest.data.v1'
const PREFIX = 'splitnest.data.v2'

const COLLECTION_KEYS = {
  groups: `${PREFIX}.group.`,
  expenses: `${PREFIX}.expense.`,
  debts: `${PREFIX}.debt.`,
}

function readCollection(prefix) {
  const items = []
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key || !key.startsWith(prefix)) continue
      try {
        const value = JSON.parse(localStorage.getItem(key))
        if (value && typeof value === 'object') items.push(value)
      } catch {
        // Skip a corrupt record instead of dropping the whole collection.
      }
    }
  } catch {
    // Storage can be unavailable; the in-memory state still works.
  }
  return items
}

function writeCollection(prefix, items) {
  let ok = true
  for (const item of items) {
    if (item?.id === undefined || item?.id === null) continue
    try {
      localStorage.setItem(`${prefix}${item.id}`, JSON.stringify(item))
    } catch {
      // Storage can be unavailable; the in-memory state still works.
      ok = false
    }
  }
  return ok
}

function readLegacyData() {
  try {
    const value = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function migrateLegacyData() {
  const legacy = readLegacyData()
  if (!legacy) return null

  const written = [
    writeCollection(COLLECTION_KEYS.groups, Array.isArray(legacy.groups) ? legacy.groups : []),
    writeCollection(
      COLLECTION_KEYS.expenses,
      Array.isArray(legacy.expenses) ? legacy.expenses : [],
    ),
    writeCollection(COLLECTION_KEYS.debts, Array.isArray(legacy.debts) ? legacy.debts : []),
  ].every(Boolean)

  if (written) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {
      // The records above are already readable, so a failed cleanup is harmless.
    }
  }

  return {
    groups: Array.isArray(legacy.groups) ? legacy.groups : [],
    expenses: Array.isArray(legacy.expenses) ? legacy.expenses : [],
    debts: Array.isArray(legacy.debts) ? legacy.debts : [],
  }
}

export function readStoredData() {
  // A legacy blob is authoritative until it has been fully migrated.
  const migrated = migrateLegacyData()
  if (migrated) return migrated

  const groups = readCollection(COLLECTION_KEYS.groups)
  const expenses = readCollection(COLLECTION_KEYS.expenses)
  const debts = readCollection(COLLECTION_KEYS.debts)

  if (groups.length === 0 && expenses.length === 0 && debts.length === 0) return null
  return { groups, expenses, debts }
}

/**
 * Persist only records whose object reference changed, and delete records that
 * are no longer present. Adding one expense therefore writes one expense row
 * plus its new debt rows instead of the whole data model.
 */
export function writeStoredData({ groups, expenses, debts }, previous = {}) {
  syncCollection(COLLECTION_KEYS.groups, previous.groups ?? [], groups)
  syncCollection(COLLECTION_KEYS.expenses, previous.expenses ?? [], expenses)
  syncCollection(COLLECTION_KEYS.debts, previous.debts ?? [], debts)
}

function syncCollection(prefix, previousItems, currentItems) {
  const previousById = new Map(previousItems.map((item) => [item.id, item]))
  const currentIds = new Set()

  for (const item of currentItems) {
    if (item?.id === undefined || item?.id === null) continue
    currentIds.add(item.id)
    if (previousById.get(item.id) === item) continue
    try {
      localStorage.setItem(`${prefix}${item.id}`, JSON.stringify(item))
    } catch {
      // Storage can be unavailable; the in-memory state still works.
    }
  }

  for (const item of previousItems) {
    if (item?.id === undefined || item?.id === null || currentIds.has(item.id)) continue
    try {
      localStorage.removeItem(`${prefix}${item.id}`)
    } catch {
      // Nothing else to do.
    }
  }
}
